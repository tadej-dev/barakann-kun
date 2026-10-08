-- BMCフレームのシートポスト付属品を解消する
-- 対象: Teammachine SLR 01 Frameset (Gen 5) / Teammachine SLR01 MOD Frameset / Roadmachine FRS Frameset
-- 出典・判断(2026-10-08調査):
--   [Teammachine SLR 01 Gen 5]
--     BMC公式サイト(co.bmc-switzerland.com/pages/platform/platform-teammachine-slr-01)で
--     シートポスト重量134gを確認できた(塗装済み54サイズ、ハードウェア含まず)。
--     名称は公式ページに記載が無いため、既存の命名慣例(0048と同じ記述)を引き続き用いる。
--   [Teammachine SLR01 MOD / Roadmachine FRS]
--     BMC公式サイトにシートポストの重量記載が無く、販売店の数値も世代によって食い違う
--     (Roadmachineは217g/224gで対象年式が不明、MODは2021年型の185gのみで現行MODと確認できない)。
--     前回(0052、2026-10-05)と同じ結論のため、利用者の指定でフレーム自体を削除する。
--     シートポストの重量は、どちらも is_set_component=1 としてフレームセット全体重量に
--     含まれており完成重量の計算には影響しないが、それでも出典が確認できない機種を
--     残さない方針(利用者の指定)に従う。
--   両機種は保存ビルドから参照されていないため削除できる(2026-10-08確認)。
PRAGMA foreign_keys = ON;

-- 1) Teammachine SLR 01 Gen 5: シートポストの付属品を登録する
-- (0052で重量0として一度削除された行のため、UPDATEではなくINSERTで追加する)
INSERT INTO part_included_items (part_id, item_name, quantity, included_category_id, created_at, updated_at, weight, is_set_component)
SELECT id, 'BMC Teammachine SLR 01 Gen 5 Aero Shaped Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 134, 0
FROM parts
WHERE brand_id = 11 AND name = 'BMC Teammachine SLR 01 Frameset (Gen 5)';

-- 2) Teammachine SLR01 MOD / Roadmachine FRS: 出典不明のため削除する
DELETE FROM parts
WHERE brand_id = 11
  AND name IN ('BMC Teammachine SLR01 MOD Frameset', 'BMC Roadmachine FRS Frameset');
