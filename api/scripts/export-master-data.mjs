#!/usr/bin/env node
// 現在のローカルD1にあるマスターデータを master-data.sql(seed SQL)として出力するスクリプト。
//
// 使い方(api ディレクトリで):
//   npm run master:export
//
// 注意:
//   - 生成物は毎回同じ内容なら同じバイト列になるようにする(生成日時など可変値を入れない)。
//     マイグレーションでマスタデータを変えたときの差分を最小にするため。
//   - seed SQL はスキーマが作成済みのDBを対象にする。冒頭でマスタ6テーブルを
//     DELETE してから INSERT するため再実行できるが、saved_build_parts が
//     parts を ON DELETE RESTRICT で参照するDBでは、保存ビルドを先に消さないと失敗する。
//   - 生成元はローカルD1。本番から取りたい場合は --remote に切り替える。

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// scripts/ の親を api ディレクトリとみなす。
const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(apiDir, "master-data");

// マスターデータを構成する6テーブルと、出力する列・並び順。
// 個人情報やユーザー生成物(users/auth_accounts/sessions/saved_builds など)は対象外。
const tables = [
    // sort_order は表示順の根拠になるため seed にも含める。欠けると投入後に全カテゴリが0へ戻り、
    // ボトムブラケットの並び替え(0039)やフロントフォークの追加(0059)が失われる。
    { name: "categories", columns: ["id", "key", "display_name", "sort_order"], order: "id" },
    { name: "brands", columns: ["id", "name", "created_at", "updated_at"], order: "id" },
    {
        name: "parts",
        columns: [
            "id",
            "category_id",
            "brand_id",
            "name",
            "model_name",
            "variant_name",
            "price",
            "price_updated_at",
            "weight",
            "description",
            "model_year",
            "edition",
            "created_at",
            "updated_at",
        ],
        order: "id",
    },
    {
        name: "part_specifications",
        columns: ["id", "part_id", "spec_key", "spec_value", "created_at", "updated_at"],
        order: "id",
    },
    {
        name: "part_included_items",
        columns: ["id", "part_id", "item_name", "quantity", "included_category_id", "price", "is_set_component", "weight", "created_at", "updated_at"],
        order: "id",
    },
    {
        name: "part_blocked_categories",
        columns: ["part_id", "category_id"],
        order: "part_id, category_id",
    },
];

// ローカルD1に SELECT を投げ、結果行を返す。
function query(sql) {
    const out = execFileSync("npx", ["wrangler", "d1", "execute", "DB", "--local", "--json", "--command", sql], {
        cwd: apiDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        maxBuffer: 256 * 1024 * 1024,
    });
    // stdout は JSON 配列。[ 以降を切り出して解析する(念のため)。
    const parsed = JSON.parse(out.slice(out.indexOf("[")));
    return parsed[0].results;
}

// SQLリテラルへ変換する。文字列はシングルクォートを二重化してエスケープする。
function sqlValue(value) {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
}

// 作成・更新の時刻はDBへマイグレーションを適用した時刻で決まり、DBを作り直すと変わる。
// 値そのものを出力すると環境ごとに差分が出るため、投入時刻を表す CURRENT_TIMESTAMP を書く。
// これで同じデータなら何度生成しても同じバイト列になる(差分が実際の変更だけになる)。
const VOLATILE_COLUMNS = new Set(["created_at", "updated_at"]);

// ---- データ取得 ----
const data = {};
for (const table of tables) {
    process.stderr.write(`読み込み中: ${table.name}\n`);
    data[table.name] = query(`SELECT ${table.columns.join(", ")} FROM ${table.name} ORDER BY ${table.order};`);
}

// ---- 参照整合性の確認 ----
// 親が存在しない子行(参照切れ)は seed に含めない。FK制約で投入が失敗するため。
// 例: 0046 で削除した BB の part_specifications が残っている(カスケードが効いていない)。
const partIds = new Set(data.parts.map((row) => row.id));
const categoryIds = new Set(data.categories.map((row) => row.id));

const orphans = {
    part_specifications: data.part_specifications.filter((row) => !partIds.has(row.part_id)),
    part_included_items: data.part_included_items.filter(
        (row) => !partIds.has(row.part_id) || (row.included_category_id !== null && !categoryIds.has(row.included_category_id)),
    ),
    part_blocked_categories: data.part_blocked_categories.filter((row) => !partIds.has(row.part_id) || !categoryIds.has(row.category_id)),
};
for (const [name, rows] of Object.entries(orphans)) {
    if (rows.length === 0) continue;
    const keys = [...new Set(rows.map((row) => row.part_id))].sort((a, b) => a - b);
    process.stderr.write(`警告: ${name} に参照切れが ${rows.length}件あります(part_id: ${keys.join(", ")})。seed から除外します。\n`);
    data[name] = data[name].filter((row) => !rows.includes(row));
}

// ---- seed SQL 生成 ----
const sqlLines = [];
sqlLines.push("-- マスターデータのスナップショット(seed SQL)");
sqlLines.push("-- 生成: npm run master:export (api) / 生成元: ローカルD1");
sqlLines.push("-- 収録: categories / brands / parts / part_specifications / part_included_items / part_blocked_categories");
sqlLines.push("--");
sqlLines.push("-- 注意:");
sqlLines.push("--   * スキーマはマイグレーションで作成済みであること(本ファイルはデータのみ)。");
sqlLines.push("--   * saved_build_parts が parts を ON DELETE RESTRICT で参照するため、保存ビルドがあるDBでは");
sqlLines.push("--     下の DELETE が失敗する。その場合は保存ビルドを削除してから実行する。");
sqlLines.push("--   * 規格(part_specifications)はスキーマどおり縦持ちで出力する。");
const orphanTotal = Object.values(orphans).reduce((sum, rows) => sum + rows.length, 0);
if (orphanTotal > 0) {
    sqlLines.push("--   * 親パーツが存在しない参照切れの子行は、FK制約で投入できないため除外した:");
    for (const [name, rows] of Object.entries(orphans)) {
        if (rows.length > 0) sqlLines.push(`--       ${name}: ${rows.length}件`);
    }
}
sqlLines.push("PRAGMA foreign_keys = ON;");
sqlLines.push("");
sqlLines.push("-- 既存のマスターデータを消してから投入する(再実行できるようにするため)。");
sqlLines.push("-- 外部キーの都合により子テーブルから消す。");
for (const name of ["part_blocked_categories", "part_included_items", "part_specifications", "parts", "brands", "categories"]) {
    sqlLines.push(`DELETE FROM ${name};`);
}
sqlLines.push("");

for (const table of tables) {
    const rows = data[table.name];
    sqlLines.push(`-- ${table.name} (${rows.length}件)`);
    for (const row of rows) {
        const values = table.columns
            .map((column) => VOLATILE_COLUMNS.has(column) ? "CURRENT_TIMESTAMP" : sqlValue(row[column]))
            .join(", ");
        sqlLines.push(`INSERT INTO ${table.name} (${table.columns.join(", ")}) VALUES (${values});`);
    }
    sqlLines.push("");
}

// ---- 出力 ----
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "master-data.sql"), sqlLines.join("\n"), "utf8");

process.stderr.write(`\n出力しました:\n  ${resolve(outDir, "master-data.sql")}\n`);
process.stderr.write(`  parts ${data.parts.length}件 / specs ${data.part_specifications.length}件 / included ${data.part_included_items.length}件 / blocked ${data.part_blocked_categories.length}件 / brands ${data.brands.length}件 / categories ${data.categories.length}件\n`);
