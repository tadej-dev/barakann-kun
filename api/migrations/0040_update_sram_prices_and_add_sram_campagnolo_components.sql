-- SRAM 8セットのセット価格を部品定価の積上げへ更新し、SRAM/Campagnolo 14セットの構成品を追加する
-- 理由:
--   選択済みパーツ表の占有行が空だったSRAM/Campagnoloのコンポセットへ、部品名・参考価格・重量を表示するため。
--   SRAMは公式グループセットSKU価格の公表がForce AXS E1の1セットのみ、かつそのSKUはクランク・カセット別売で
--   他のセットと構成が揃わないため、登録済みの重量(クランク・カセット込みの公表値)と構成を合わせて
--   全都品定価の積上げで統一する(登録済みRival AXS E1 ¥238,350は同じ積上げ方式で現行定価と一致することを確認済み)。
-- 出典:
--   SRAM: 株式会社Many'S(メニーズ) SRAM ROAD 正規代理店 商品ページ(税込・2026-09-26取得)
--     一覧: https://manys.work/sram-road/
--     グループセット: https://manys.work/sram-road/force-axs-groupset-e1-2x-hrd/
--     参考(重量表PDF): https://manys.work/wp/wp-content/uploads/2024/08/SR_REDXPLR_AXS_FAQ_v05_jp.pdf
--                       https://manys.work/wp/wp-content/uploads/2023/06/SR_ApexAXS_ApexMechanical_FAQ_jp_v03.pdf
--     SRAMはレバー類を片側単位で販売するため、左右1組分は2個分の合計として計上する。
--   Campagnolo: 価格 = BRANDS OF NICHINAO(正規代理店) 価格表(税込)、重量 = campagnolo.com jp-ja 製品ページ
--     価格表一覧: https://nichinao.jp/archives/category/news/13885
--       SUPER RECORD WIRELESS 12s: https://nichinao.jp/wp/wp-content/uploads/2025/06/campagnolo_20251201_WRL12s.pdf
--       RECORD 13 13s: https://nichinao.jp/wp/wp-content/uploads/2026/04/campagnolo_20260429_RE-WRL-13s_v2.pdf
--       メカニカル disc: https://nichinao.jp/wp/wp-content/uploads/2025/06/campagnolo_20251201_m_DB.pdf
--     重量例: https://www.campagnolo.com/jp-ja/super-record-s-wireless-rear-derailleur/CRDSUPERRECORDSWRLDB12S.html
-- 登録方針:
--   - 構成品は is_set_component = 1。重量・価格はセット本体に含まれるため合計へは加算しない。
--   - ブレーキキャリパーは選択済みパーツ表で前後2行へ展開されるため1個分の重量を登録する。
--   - SRAMはキャリパーがシフト/ブレーキセットに含まれ単品価格が無いため price は NULL。
--     Campagnoloはエルゴパワーとキャリパーの結合セルのみで単品価格が無いセットがあるため NULL。
--   - Campagnoloのエルゴパワー欄は「1本(片側)単位」の価格のみ公表され、左右1組の価格が
--     セット標準価格と整合しないため price は NULL とし、重量のみ登録する。
--   - メーカーが公表していない値(SRAMの多くの重量、Super Record S Wirelessの部品価格)は
--     0(重量) / NULL(価格)のまま残し、推測で埋めない。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象セットのセット構成品を先に消す。
DELETE FROM part_included_items
WHERE part_id IN (34, 35, 39, 40, 41, 42, 370, 371, 36, 37, 38, 46, 47, 372)
  AND is_set_component = 1;

-- ===== SRAM セット価格(部品定価の積上げ) =====

UPDATE parts SET price = 610990, price_updated_at = '2026-09-26 00:00:00', updated_at = CURRENT_TIMESTAMP WHERE id = 39; -- RED AXS E1 2X HRD
UPDATE parts SET price = 343060, price_updated_at = '2026-09-26 00:00:00', updated_at = CURRENT_TIMESTAMP WHERE id = 34; -- Force AXS E1 2X HRD
UPDATE parts SET price = 238350, price_updated_at = '2026-09-26 00:00:00', updated_at = CURRENT_TIMESTAMP WHERE id = 35; -- Rival AXS E1 2X HRD
UPDATE parts SET price = 286330, price_updated_at = '2026-09-26 00:00:00', updated_at = CURRENT_TIMESTAMP WHERE id = 40; -- Force AXS D2 2X HRD
UPDATE parts SET price = 213840, price_updated_at = '2026-09-26 00:00:00', updated_at = CURRENT_TIMESTAMP WHERE id = 41; -- Rival eTap AXS D1 2X HRD
UPDATE parts SET price = 171570, price_updated_at = '2026-09-26 00:00:00', updated_at = CURRENT_TIMESTAMP WHERE id = 42; -- Apex AXS XPLR 1X HRD
UPDATE parts SET price = 569080, price_updated_at = '2026-09-26 00:00:00', updated_at = CURRENT_TIMESTAMP WHERE id = 370; -- RED XPLR AXS E1 1x13
UPDATE parts SET price = 283940, price_updated_at = '2026-09-26 00:00:00', updated_at = CURRENT_TIMESTAMP WHERE id = 371; -- Force XPLR AXS E1 1x13

-- ===== SRAM 構成品 =====

-- SRAM RED AXS E1 2X HRD(id 39)
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (39, 'Red AXS HRD Shift/Brake Set（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 0,   227600, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (39, 'Red AXS HRD Caliper',                1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     0,   NULL,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (39, 'Red AXS Crank Set 2X 172.5mm 48/35T',1, (SELECT id FROM categories WHERE key = 'crankset'),          545, 111800, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (39, 'Red AXS Front Derailleur',           1, (SELECT id FROM categories WHERE key = 'front_derailleur'),  145, 76000,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (39, 'Red AXS Rear Derailleur',            1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   262, 118000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (39, 'XG-1290 10-28T',                     1, (SELECT id FROM categories WHERE key = 'cassette'),          180, 61710,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (39, 'Red AXS Flattop Chain',              1, (SELECT id FROM categories WHERE key = 'chain'),             236, 15880,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAM Force AXS E1 2X HRD(id 34)
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (34, 'Force AXS HRD Shift/Brakeset E1（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 720, 125560, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (34, 'Force AXS HRD Caliper',                   1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     0,   NULL,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (34, 'Force AXS Crank Arm Assembly DUB E1 + 2x Chainring Kit', 1, (SELECT id FROM categories WHERE key = 'crankset'), 0, 70970, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (34, 'Force AXS Front Derailleur E1',           1, (SELECT id FROM categories WHERE key = 'front_derailleur'),  0,   44320,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (34, 'Force AXS Rear Derailleur E1',            1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   0,   61490,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (34, 'XG-1270 E1 10-33T',                       1, (SELECT id FROM categories WHERE key = 'cassette'),          0,   31010,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (34, 'Force AXS Flattop Chain E1',              1, (SELECT id FROM categories WHERE key = 'chain'),             244, 9710,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAM Rival AXS E1 2X HRD(id 35)
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (35, 'Rival AXS HRD Shift/Brakeset E1（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 0, 91780, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (35, 'Rival AXS HRD Caliper',                   1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     0, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (35, 'Rival AXS Crank Arm Assembly DUB E1 + Direct Mount Chain Ring 2X E1', 1, (SELECT id FROM categories WHERE key = 'crankset'), 0, 32740, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (35, 'Rival AXS Front Derailleur E1',           1, (SELECT id FROM categories WHERE key = 'front_derailleur'),  0, 31250, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (35, 'Rival AXS Rear Derailleur E1',            1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   0, 52950, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (35, 'XG-1250 10-36T',                          1, (SELECT id FROM categories WHERE key = 'cassette'),          0, 22170, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (35, 'Rival AXS Flattop Chain E1',              1, (SELECT id FROM categories WHERE key = 'chain'),             0, 7460,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAM Force AXS D2 2X HRD(id 40) クランクとチェーンは代理店が単品ページを出しておらず値は未公表
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (40, 'Force eTap AXS HRD Shift/Brakeset（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 0, 134120, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (40, 'Force eTap AXS HRD Caliper',                1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     0, NULL,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (40, 'Force AXS D2 Crank Set',                    1, (SELECT id FROM categories WHERE key = 'crankset'),          0, NULL,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (40, 'Force eTap AXS Front Derailleur',           1, (SELECT id FROM categories WHERE key = 'front_derailleur'),  0, 46550,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (40, 'Force eTap AXS Rear Derailleur',            1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   0, 72610,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (40, 'XG-1270 10-33T',                            1, (SELECT id FROM categories WHERE key = 'cassette'),          0, 33050,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (40, 'Force Flattop Chain',                       1, (SELECT id FROM categories WHERE key = 'chain'),             0, NULL,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAM Rival eTap AXS D1 2X HRD(id 41)
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (41, 'Rival eTap AXS HRD Shift/Brakeset（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 0, 78200, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (41, 'Rival eTap AXS HRD Caliper',                1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     0, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (41, 'Rival AXS Crank Set 2x',                    1, (SELECT id FROM categories WHERE key = 'crankset'),          0, 23040, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (41, 'Rival eTap AXS Front Derailleur',           1, (SELECT id FROM categories WHERE key = 'front_derailleur'),  0, 34260, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (41, 'Rival eTap AXS Rear Derailleur',            1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   0, 50030, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (41, 'XG-1250 10-36T',                            1, (SELECT id FROM categories WHERE key = 'cassette'),          0, 22170, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (41, 'Rival Flattop Chain',                       1, (SELECT id FROM categories WHERE key = 'chain'),             0, 6140,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAM Apex AXS XPLR 1X HRD(id 42) 1xのためフロントディレイラーは対象外
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (42, 'Apex AXS HRD Shift/Brakeset（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 0, 76960, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (42, 'Apex AXS HRD Caliper',                1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     0, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (42, 'Apex Crank Set DUB Wide 1x',          1, (SELECT id FROM categories WHERE key = 'crankset'),          0, 19940, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (42, 'Apex AXS XPLR Rear Derailleur',       1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   0, 48610, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (42, 'PG-1231 XPLR',                        1, (SELECT id FROM categories WHERE key = 'cassette'),          0, 20930, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (42, 'Apex Flattop Chain',                  1, (SELECT id FROM categories WHERE key = 'chain'),             0, 5130,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAM RED XPLR AXS E1 1x13(id 370)
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (370, 'Red AXS HRD Shift/Brake Set（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 0,   227600, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (370, 'Red AXS HRD Caliper',                 1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     0,   NULL,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (370, 'Red AXS Crank Set DUB Wide 1x',       1, (SELECT id FROM categories WHERE key = 'crankset'),          0,   103900, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (370, 'Red XPLR AXS Rear Derailleur 1x13s',  1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   0,   118000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (370, 'XG-1391 XPLR 10-46T',                 1, (SELECT id FROM categories WHERE key = 'cassette'),          288, 103700, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (370, 'Red AXS Flattop Chain',               1, (SELECT id FROM categories WHERE key = 'chain'),             236, 15880,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAM Force XPLR AXS E1 1x13(id 371)
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (371, 'Force AXS HRD Shift/Brakeset E1（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 720, 125560, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (371, 'Force AXS HRD Caliper',                   1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     0,   NULL,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (371, 'Force AXS Crank Arm Assembly DUB Wide E1',1, (SELECT id FROM categories WHERE key = 'crankset'),          530, 28290,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (371, 'Force XPLR AXS Rear Derailleur E1',       1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   418, 77340,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (371, 'XG-1371 XPLR E1 10-46T',                  1, (SELECT id FROM categories WHERE key = 'cassette'),          346, 43040,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (371, 'Force AXS Flattop Chain E1',              1, (SELECT id FROM categories WHERE key = 'chain'),             244, 9710,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ===== Campagnolo 構成品 =====
-- 重量は campagnolo.com jp-ja の公表値。価格はニチナオ価格表。エルゴパワー欄は片側単位の価格のみで
-- 左右1組の価格がセット標準価格と整合しないため price は NULL とし、重量のみ登録する。

-- Campagnolo Super Record S Wireless Disc 12s(id 36) 部品価格は価格表に列が無く未公表
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (36, 'Super Record S Wireless エルゴパワー（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 506, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (36, 'Super Record S Wireless キャリパー',           1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     118, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (36, 'Super Record S Wireless クランクセット 172.5mm', 1, (SELECT id FROM categories WHERE key = 'crankset'),        673, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (36, 'Super Record S Wireless フロントディレイラー', 1, (SELECT id FROM categories WHERE key = 'front_derailleur'),  130, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (36, 'Super Record S Wireless リアディレイラー',     1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   269, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (36, 'Super Record Wireless スプロケット',           1, (SELECT id FROM categories WHERE key = 'cassette'),          210, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (36, 'Super Record 12s チェーン',                    1, (SELECT id FROM categories WHERE key = 'chain'),             228, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Campagnolo Super Record Wireless 2x12 Disc(id 47)
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (47, 'Super Record Wireless エルゴパワー（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 745, NULL,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (47, 'Super Record Wireless キャリパー',           1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     118, NULL,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (47, 'Super Record Wireless クランクセット 172.5mm', 1, (SELECT id FROM categories WHERE key = 'crankset'),        585, 192500, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (47, 'Super Record Wireless フロントディレイラー', 1, (SELECT id FROM categories WHERE key = 'front_derailleur'),  160, 138600, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (47, 'Super Record Wireless リアディレイラー',     1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   295, 163900, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (47, 'Super Record Wireless スプロケット',         1, (SELECT id FROM categories WHERE key = 'cassette'),          210, 64900,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (47, 'Super Record 12s チェーン',                  1, (SELECT id FROM categories WHERE key = 'chain'),             228, 13200,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Campagnolo Record 13 2x13 Road(id 37)
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (37, 'Record 13 エルゴパワー（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 418, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (37, 'Record 13 キャリパー',           1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     0,   21450, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (37, 'Record 13 クランクセット 172.5mm', 1, (SELECT id FROM categories WHERE key = 'crankset'),        686, 62700, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (37, 'Record 13 フロントディレイラー', 1, (SELECT id FROM categories WHERE key = 'front_derailleur'),  142, 67100, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (37, 'Record 13 リアディレイラー',     1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   297, 92400, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (37, 'Record 13 スプロケット 10-33T',  1, (SELECT id FROM categories WHERE key = 'cassette'),          275, 44000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (37, 'Campagnolo 13s チェーン',        1, (SELECT id FROM categories WHERE key = 'chain'),             254, 13200, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Campagnolo Chorus Disc 12s(id 38)
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (38, 'Chorus エルゴパワー（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 488, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (38, 'Chorus キャリパー',           1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     118, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (38, 'Chorus クランクセット 172.5mm', 1, (SELECT id FROM categories WHERE key = 'crankset'),        728, 87450, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (38, 'Chorus フロントディレイラー', 1, (SELECT id FROM categories WHERE key = 'front_derailleur'),  87,  22000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (38, 'Chorus リアディレイラー',     1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   220, 38500, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (38, 'Chorus スプロケット 11-32T',  1, (SELECT id FROM categories WHERE key = 'cassette'),          310, 45100, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (38, 'Chorus 12s チェーン',         1, (SELECT id FROM categories WHERE key = 'chain'),             243, 10120, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Campagnolo Ekar 1x13 Disc(id 46) 1xのためフロントディレイラーは対象外
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (46, 'Ekar エルゴパワー（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 420, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (46, 'Ekar キャリパー',           1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     110, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (46, 'Ekar クランクセット 172.5mm 38T', 1, (SELECT id FROM categories WHERE key = 'crankset'),     615, 73700, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (46, 'Ekar リアディレイラー',     1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   275, 60500, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (46, 'Ekar スプロケット 9-42T',   1, (SELECT id FROM categories WHERE key = 'cassette'),          390, 49500, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (46, 'Ekar C13 チェーン',         1, (SELECT id FROM categories WHERE key = 'chain'),             242, 11000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Campagnolo Ekar GT 1x13(id 372) 1xのためフロントディレイラーは対象外
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (372, 'Ekar GT エルゴパワー（左右）', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 760, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (372, 'Ekar GT キャリパー',           1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     110, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (372, 'Ekar GT クランクセット 172.5mm 38T', 1, (SELECT id FROM categories WHERE key = 'crankset'),     850, 51150, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (372, 'Ekar GT リアディレイラー',     1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   310, 43450, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (372, 'Ekar スプロケット 9-42T',      1, (SELECT id FROM categories WHERE key = 'cassette'),          390, 49500, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (372, 'Ekar GT C13 チェーン',         1, (SELECT id FROM categories WHERE key = 'chain'),             242, 11000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
