#!/usr/bin/env node
// マスターデータの欠落・不整合を検出する監査スクリプト。
// 目的:
//   フレーム登録で「付属品の登録漏れ」や「重量0」が混ざるのを防ぐ。
//   マイグレーション適用後に `npm run master:audit` で実行する。
// 検出するもの:
//   1. フレームの付属品で weight が 0 以下(0は登録しない方針)
//   2. フレームが占有しているカテゴリ(シートポスト/ハンドル/ステム/BB)に対応する
//      付属品が登録されていない(付属品の登録漏れ)
//   3. 同じプラットフォーム(モデル名の先頭一致)で、付属品の有無が揃っていない
// 使い方(api ディレクトリで): npm run master:audit

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ローカルD1に SELECT を投げ、結果行を返す。
function query(sql) {
    const out = execFileSync("npx", ["wrangler", "d1", "execute", "DB", "--local", "--json", "--command", sql], {
        cwd: apiDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        maxBuffer: 256 * 1024 * 1024,
    });
    return JSON.parse(out.slice(out.indexOf("[")))[0].results;
}

const frames = query(
    "SELECT id, brand_id, name, model_name FROM parts WHERE category_id = 1 ORDER BY id;",
);
const blocked = query("SELECT part_id, category_id FROM part_blocked_categories;");
const items = query(
    "SELECT part_id, item_name, included_category_id, weight FROM part_included_items;",
);

const blockedByPart = new Map();
for (const row of blocked) {
    if (!blockedByPart.has(row.part_id)) blockedByPart.set(row.part_id, new Set());
    blockedByPart.get(row.part_id).add(row.category_id);
}
const itemsByPart = new Map();
for (const row of items) {
    if (!itemsByPart.has(row.part_id)) itemsByPart.set(row.part_id, []);
    itemsByPart.get(row.part_id).push(row);
}

// 占有カテゴリのうち、対応する付属品があるべきもの(category_id)。
// 16(ハンドル)と17(ステム)は一体型コックピットとして1組なので、どちらかがあればよい。
const COMPONENT_BLOCK_CATEGORIES = new Set([9, 16, 17, 19]);
const COCKPIT_CATEGORIES = new Set([16, 17]);
const frameIds = new Set(frames.map((frame) => frame.id));

const findings = [];

// チェック1: フレーム付属品の重量0(0は登録しない方針)
for (const row of items) {
    if (frameIds.has(row.part_id) && row.weight <= 0) {
        findings.push(`[重量0] part ${row.part_id} の付属品「${row.item_name}」の weight が ${row.weight}`);
    }
}

// チェック2: 占有カテゴリに対応する付属品の登録漏れ
for (const frame of frames) {
    const blockedCats = blockedByPart.get(frame.id) ?? new Set();
    const itemCats = new Set((itemsByPart.get(frame.id) ?? []).map((row) => row.included_category_id));
    const hasCockpitItem = [...itemCats].some((categoryId) => COCKPIT_CATEGORIES.has(categoryId));
    for (const categoryId of blockedCats) {
        if (!COMPONENT_BLOCK_CATEGORIES.has(categoryId)) continue;
        const satisfied = COCKPIT_CATEGORIES.has(categoryId) ? hasCockpitItem : itemCats.has(categoryId);
        if (!satisfied) {
            findings.push(`[付属品なし] ${frame.name}(id ${frame.id}) はカテゴリ ${categoryId} を占有するが、対応する付属品がない`);
        }
    }
}

// チェック3: 同一プラットフォーム内で付属品の有無が揃っていない
// モデル名の先頭2語(例: "Cannondale SuperSix")でグルーピングする。
const platformOf = (frame) => (frame.model_name ?? frame.name).split(" ").slice(0, 2).join(" ");
const platforms = new Map();
for (const frame of frames) {
    const key = `${frame.brand_id}:${platformOf(frame)}`;
    if (!platforms.has(key)) platforms.set(key, []);
    platforms.get(key).push(frame);
}
for (const [key, group] of platforms) {
    if (group.length < 2) continue;
    const withItems = group.filter((frame) => (itemsByPart.get(frame.id) ?? []).length > 0);
    const withoutItems = group.filter((frame) => (itemsByPart.get(frame.id) ?? []).length === 0);
    if (withItems.length > 0 && withoutItems.length > 0) {
        const names = withoutItems.map((frame) => `${frame.name}(id ${frame.id})`).join(", ");
        findings.push(`[プラットフォーム不揃い] ${key.split(":")[1]} で付属品がある機種と無い機種が混在: ${names}`);
    }
}

if (findings.length === 0) {
    process.stdout.write("監査OK: 欠落・不整合は見つかりませんでした。\n");
    process.exit(0);
}

process.stdout.write(`監査で ${findings.length} 件の指摘があります。\n\n`);
for (const finding of findings) process.stdout.write(`- ${finding}\n`);
process.stdout.write("\n解消するか、解消できない場合は理由（出典が見つからない等）を記録してください。\n");
process.exit(1);
