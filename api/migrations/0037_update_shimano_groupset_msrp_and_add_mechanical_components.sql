-- SHIMANOコンポセットのセット価格をメーカー希望小売価格(税込)へ揃え、
-- 構成品が未登録だった105機械式(R7120)とGRXの4種へ単品の参考価格・平均重量を追加する
-- 理由:
--   1. セット価格が店頭販売価格のままだったため、合計金額の基準をメーカー希望小売価格へ統一する。
--   2. 105 R7120機械式とGRXは構成品の登録が無く、選択済みパーツ表の占有行が
--      名前・参考価格・重量なしで表示されていたため。
-- 出典:
--   セット価格: COZY BICYCLE 商品ページ「希望小売価格」(2026-09-26時点・税込)
--     Dura-Ace R9270 Di2 Disc  545,903円  https://www.cozybicycle.com/SHOP/shimano-r9270-duraace-di2-set.html
--     Ultegra R8170 Di2 Disc   331,079円  https://www.cozybicycle.com/SHOP/shimano-r8170-ultegra-di2-set.html
--     105 R7170 Di2 Disc       242,247円  https://www.cozybicycle.com/SHOP/shimano-r7170-105-di2-set.html
--     105 R7120 機械式         135,275円  https://www.cozybicycle.com/SHOP/shimano-r7120-105-12s-mechanical-set.html
--     GRX RX825 Di2 2x12       292,593円  https://www.cozybicycle.com/SHOP/shimano-grx825-212s-di2-set.html
--                                          (CS-HG710-12 11-36T構成。CS-R8101構成は294,603円/CS-R7101構成は289,900円)
--     GRX RX820 機械式 2x12    163,546円  https://www.cozybicycle.com/SHOP/shimano-grx-rx820-2x12s-1136-set.html
--     GRX RX820 機械式 1x12    160,866円  https://www.cozybicycle.com/SHOP/shimano-grx-rx820-1x12s-1051-set.html
--   構成品の価格・平均重量: SHIMANO バイシクル デジタルカタログ 価格表(更新日 2026-08-07・税込)
--     https://set.shimano.co.jp/bc_catalog/  ロード: road-pl.xlsx / グラベル: gravel-pl.xlsx
--   クロスチェック: ウエムラサイクルパーツ「標準価格」(税込)
--     https://uemura-cycle.com/products/list.php?search_category_id=47
--     Dura-Ace 545,980円 / Ultegra 331,117円 / 105 Di2 242,326円 でCOZYの希望小売価格と1%以内で一致。
-- 登録方針:
--   - セット価格はセット組成のメーカー希望小売価格(税込)。BB・ローター・ブレーキパッドは含めない(0032と同じ)。
--   - 構成品は is_set_component = 1。重量・価格はセット本体に含まれるため合計へは加算しない。
--   - 構成品の価格は価格表の「希望小売価格(税込)」。左右1組のレバーは左右2個分の合計。
--   - ブレーキキャリパーは選択済みパーツ表で前後2行へ展開されるため、1個分の重量を登録し、
--     前後で価格が異なるため price は NULL のままにする(価格表の前/後はコメントに残す)。
--   - 平均重量が公表されていない部品(CS-HG710-12、RD-RX820、RD-RX822-SGS)は0のまま残し、
--     未公表であることをコメントに記録する。公表された時点で別マイグレーションで更新する。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象セットのセット構成品を先に消す。
DELETE FROM part_included_items
WHERE part_id IN (43, 44, 45, 373)
  AND is_set_component = 1;

-- セット価格をメーカー希望小売価格(税込)へ更新する
UPDATE parts
SET price = 545903,
    price_updated_at = '2026-09-26 00:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 31; -- Shimano Dura-Ace R9270 Di2 Disc Groupset

UPDATE parts
SET price = 331079,
    price_updated_at = '2026-09-26 00:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 32; -- Shimano Ultegra R8170 Di2 Disc Groupset

UPDATE parts
SET price = 242247,
    price_updated_at = '2026-09-26 00:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 33; -- Shimano 105 R7170 Di2 Disc Groupset

UPDATE parts
SET price = 135275,
    price_updated_at = '2026-09-26 00:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 43; -- Shimano 105 R7120 Mechanical Disc Groupset

UPDATE parts
SET price = 292593,
    price_updated_at = '2026-09-26 00:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 44; -- Shimano GRX RX825 Di2 2X Disc Groupset

UPDATE parts
SET price = 163546,
    price_updated_at = '2026-09-26 00:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 45; -- Shimano GRX RX820 Mechanical 2X Disc Groupset

UPDATE parts
SET price = 160866,
    price_updated_at = '2026-09-26 00:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 373; -- Shimano GRX RX820 Mechanical Disc Groupset 1x12

-- 105 R7120 機械式 2x12 Disc Groupset(id 43)
-- 価格は希望小売価格(税込)。ST-R7120は左右2個分(26,217円×2)。
-- BR-R7170は前後とも123g・前10,075円/後9,408円。CS-R7101は11-34T(361g)。
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (43, 'ST-R7120（左右）',  1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 612, 52434, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (43, 'BR-R7170',          1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     123, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (43, 'FC-R7100 170mm',    1, (SELECT id FROM categories WHERE key = 'crankset'),          754, 24668, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (43, 'FD-R7100 直付',     1, (SELECT id FROM categories WHERE key = 'front_derailleur'),   96, 5718,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (43, 'RD-R7100',          1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   249, 8814,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (43, 'CS-R7101 11-34T',   1, (SELECT id FROM categories WHERE key = 'cassette'),          361, 9224,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (43, 'CN-M7100',          1, (SELECT id FROM categories WHERE key = 'chain'),             252, 4205,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- GRX RX825 Di2 2x12 Disc Groupset(id 44)
-- 価格は希望小売価格(税込)。ST-RX825は左右2個分(49,299円×2)。
-- BR-RX820は前146g/後136g・前10,479円/後9,843円で、1個分は前後セット282gの半分141g。
-- CS-HG710-12は平均重量が未公表のため0(未登録)。
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (44, 'ST-RX825（左右）',      1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 415, 98598, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (44, 'BR-RX820',              1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     141, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (44, 'FC-RX820-2 170mm',      1, (SELECT id FROM categories WHERE key = 'crankset'),          710, 31111, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (44, 'FD-RX825',              1, (SELECT id FROM categories WHERE key = 'front_derailleur'),  142, 26046, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (44, 'RD-RX825',              1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   310, 51818, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (44, 'CS-HG710-12 11-36T',    1, (SELECT id FROM categories WHERE key = 'cassette'),            0, 12070, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (44, 'CN-M8100 126L',         1, (SELECT id FROM categories WHERE key = 'chain'),             252, 6311,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- GRX RX820 機械式 2x12 Disc Groupset(id 45)
-- 価格は希望小売価格(税込)。ST-RX820は右289g+左283g、右左とも35,853円。
-- RD-RX820とCS-HG710-12は平均重量が未公表のため0(未登録)。
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (45, 'ST-RX820（左右）',      1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 572, 71706, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (45, 'BR-RX820',              1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     141, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (45, 'FC-RX820-2 170mm',      1, (SELECT id FROM categories WHERE key = 'crankset'),          710, 31111, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (45, 'FD-RX820 直付',         1, (SELECT id FROM categories WHERE key = 'front_derailleur'),   96, 7751,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (45, 'RD-RX820',              1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),     0, 16360, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (45, 'CS-HG710-12 11-36T',    1, (SELECT id FROM categories WHERE key = 'cassette'),            0, 12070, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (45, 'CN-M8100 126L',         1, (SELECT id FROM categories WHERE key = 'chain'),             252, 6311,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- GRX RX820 機械式 1x12 Disc Groupset(id 373)
-- 価格は希望小売価格(税込)。左はブレーキレバーBL-RX820-L(222g・29,501円)、
-- 右はST-RX820-R(289g・35,853円)。フロントディレイラーは使用しない。
-- RD-RX822-SGSは平均重量が未公表のため0(未登録)。
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (373, 'BL-RX820-L / ST-RX820-R', 1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 511, 65354, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (373, 'BR-RX820',                1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     141, NULL,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (373, 'FC-RX820-1 170mm 40T',    1, (SELECT id FROM categories WHERE key = 'crankset'),          644, 31111, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (373, 'RD-RX822-SGS',            1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),     0, 16308, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (373, 'CS-M8100-12 10-51T',      1, (SELECT id FROM categories WHERE key = 'cassette'),          470, 21170, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (373, 'CN-M8100 138L',           1, (SELECT id FROM categories WHERE key = 'chain'),             252, 6889,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
