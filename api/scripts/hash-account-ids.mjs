#!/usr/bin/env node
// 保存済みのアカウントID(auth_accounts.provider_account_id)を、一括でハッシュ値に置き換える。
// 目的(issue #74):
//   ハッシュ化を導入する前の行は、GoogleのアカウントIDを平文で保存している。
//   アプリはログイン時にも置き換えるが、ログインしない利用者の行が残らないよう一括で置き換える。
// 計算方法:
//   アプリ(src/auth/d1-auth-adapter.ts の hashProviderAccountId)と同じく、
//   HMAC-SHA256(鍵: ACCOUNT_ID_HASH_SECRET、内容: "<provider>:<アカウントID>")の16進数。
// 使い方(api ディレクトリで):
//   ACCOUNT_ID_HASH_SECRET を環境変数に入れてから実行する(値は表示しない)。
//     read -rs ACCOUNT_ID_HASH_SECRET && export ACCOUNT_ID_HASH_SECRET
//   ローカルD1:  npm run account-ids:hash
//   本番D1:      npm run account-ids:hash -- --remote
//   件数だけ確認: npm run account-ids:hash -- --dry-run
//   作業用のローカルD1: npm run account-ids:hash -- --persist-to /tmp/barakann-test
// 注意:
//   本番では、アプリをデプロイしたあとに実行する。鍵はアプリに登録したものと同じ値を使う。
//   すでにハッシュ値になっている行は変更しないため、何度実行しても結果は変わらない。

import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ハッシュ値(SHA-256の16進数64文字)かどうか。平文のGoogleアカウントIDは数字のみ。
const HASHED_ACCOUNT_ID = /^[0-9a-f]{64}$/;

// コマンドライン引数を読む
function parseArgs(argv) {
    const options = { remote: false, dryRun: false, persistTo: null };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];

        if (arg === "--remote") {
            options.remote = true;
        } else if (arg === "--dry-run") {
            options.dryRun = true;
        } else if (arg === "--persist-to") {
            options.persistTo = argv[index + 1] ?? null;
            index += 1;
        } else {
            throw new Error(`不明な引数です: ${arg}`);
        }
    }

    if (options.remote && options.persistTo) {
        throw new Error("--remote と --persist-to は同時に指定できません。");
    }

    return options;
}

// wrangler d1 execute の対象(ローカル・作業用ローカル・本番)を指定する引数
function targetArgs(options) {
    if (options.remote) {
        return ["--remote"];
    }

    if (options.persistTo) {
        return ["--local", "--persist-to", options.persistTo];
    }

    return ["--local"];
}

// D1に SELECT を投げ、結果行を返す
function query(options, sql) {
    const out = execFileSync(
        "npx",
        ["wrangler", "d1", "execute", "DB", ...targetArgs(options), "--json", "--command", sql],
        { cwd: apiDir, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
    );

    return JSON.parse(out.slice(out.indexOf("[")))[0].results;
}

// SQLの文字列リテラルとして安全に埋め込む
function sqlString(value) {
    return `'${String(value).replaceAll("'", "''")}'`;
}

// アプリと同じ方法でアカウントIDをハッシュにする
export function hashProviderAccountId(secret, provider, providerAccountId) {
    return createHmac("sha256", secret)
        .update(`${provider}:${providerAccountId}`)
        .digest("hex");
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const secret = process.env.ACCOUNT_ID_HASH_SECRET ?? "";

    if (secret.length < 32) {
        throw new Error("環境変数 ACCOUNT_ID_HASH_SECRET を32文字以上で設定してください。");
    }

    const rows = query(options, "SELECT provider, provider_account_id FROM auth_accounts;");
    const plainRows = rows.filter((row) => !HASHED_ACCOUNT_ID.test(row.provider_account_id));
    const target = options.remote ? "本番D1" : "ローカルD1";

    // アカウントIDそのものは表示せず、件数だけを表示する
    process.stdout.write(`${target}: 全${rows.length}件のうち、置き換え対象は${plainRows.length}件です。\n`);

    if (options.dryRun || plainRows.length === 0) {
        return;
    }

    const now = new Date().toISOString();
    const statements = plainRows.map((row) => {
        const hashed = hashProviderAccountId(secret, row.provider, row.provider_account_id);

        return `UPDATE auth_accounts
SET provider_account_id = ${sqlString(hashed)}, updated_at = ${sqlString(now)}
WHERE provider = ${sqlString(row.provider)}
  AND provider_account_id = ${sqlString(row.provider_account_id)};`;
    });

    // 平文のIDを含むSQLは一時フォルダに書き、実行後すぐに削除する
    const workDir = mkdtempSync(join(tmpdir(), "hash-account-ids-"));
    const sqlFile = join(workDir, "update.sql");

    try {
        writeFileSync(sqlFile, `${statements.join("\n")}\n`, { mode: 0o600 });
        execFileSync(
            "npx",
            ["wrangler", "d1", "execute", "DB", ...targetArgs(options), "--file", sqlFile, "--yes"],
            { cwd: apiDir, stdio: ["ignore", "ignore", "inherit"] },
        );
    } finally {
        rmSync(workDir, { recursive: true, force: true });
    }

    const remaining = query(options, "SELECT provider_account_id FROM auth_accounts;")
        .filter((row) => !HASHED_ACCOUNT_ID.test(row.provider_account_id)).length;

    process.stdout.write(`置き換えが完了しました。平文のまま残っている行: ${remaining}件\n`);

    if (remaining > 0) {
        process.exitCode = 1;
    }
}

// テストから hashProviderAccountId だけを読み込めるよう、直接実行されたときだけ動かす
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        main();
    } catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    }
}
