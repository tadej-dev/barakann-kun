-- Cannondale SuperSix EVO 第5世代のフレームセットを登録する
-- 目的:
--   Cannondale のロードページ(race/supersix-evo)にある Gen 5 フレームセットを、
--   既存の SuperSix EVO(id 2 / 15)とは別行として追加する(利用者の指定)。
-- 出典(2026-10-05 調査。いずれも Cannondale 公式の商品ページ):
--   SuperSix EVO Carbon Frameset (C11284U)
--     https://www.cannondale.com/ja-jp/bikes/road/race/supersix-evo/supersix-evo-carbon-frameset
--     価格 290,000 円(ページ内の JSON-LD price/priceCurrency=JPY)
--     フレーム重量 915g(56cm・塗装済み、本文記載)
--     Frame: BSA 68mm threaded BB / flat mount disc / integrated cable routing
--     Wheel Size: 700c / タイヤ: 最大30mm
--     Fork: 1-1/8" to 1-1/4" Delta steerer / Seatpost: Cannondale C1 Aero 40 Carbon
--   SuperSix EVO Hi-MOD Frameset (C1133GU, Gen 5)
--     https://www.cannondale.com/ja-jp/bikes/road/race/supersix-evo/supersix-evo-hi-mod-frameset-smu
--     価格 670,000 円(ページ内の JSON-LD price/priceCurrency=JPY)
--     フレーム重量 789g(56cm・塗装済み、本文記載。フォーク 399g)
--     Frame: SuperSix EVO Hi-MOD Carbon, Gen 5 / BSA 68mm threaded BB / flat mount disc / UDH
--     Wheel Size: 700c / タイヤ: 最大32mm
--     Fork: 1-1/8" to 1-1/4" Delta steerer / Seatpost: Cannondale C1 Aero 40 Carbon V2 (Ti)
-- 方針・注意:
--   - 価格は公式ページの JSON-LD の値(JPY)。
--   - 重量はフレーム単体(56cm・塗装済み)の値。同梱シートポストの重量は非公表のため 0。
--   - 専用シートポストを同梱するためシートポスト(19)を占有させ、付属品として登録する。
--   - cockpit_connection / cockpit_system は同一プラットフォームの既存登録(id 2 / 15)に合わせた。
--   - seatpost_diameter_mm と handlebar_clamp_mm は専用形状のため出典が無く、未登録とする。
--   - TT(SuperSlice)は方針どおり対象外。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象フレームを先に削除する(関連行は CASCADE で消える)。
DELETE FROM parts
WHERE brand_id = 2
  AND name IN (
    'Cannondale SuperSix EVO Carbon Frameset (Gen 5)',
    'Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)'
  );

INSERT INTO parts (category_id, brand_id, name, model_name, variant_name, edition, price, price_updated_at, weight, description, created_at, updated_at) VALUES
    (1, 2, 'Cannondale SuperSix EVO Carbon Frameset (Gen 5)', 'Cannondale SuperSix EVO Carbon Frameset', NULL, 'Gen 5', 290000, '2026-10-05 00:00:00', 915,
     'Cannondale公式(C11284U)。価格はページ内JSON-LD(JPY)。重量はフレーム単体(56cm・塗装済み)。BSA 68mm、flat mount、Deltaステアラー、タイヤ最大30mm。C1 Aero 40 CarbonシートポストとAeroボトル/ケージ付属。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 2, 'Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)', 'Cannondale SuperSix EVO Hi-MOD Frameset', NULL, 'Gen 5', 670000, '2026-10-05 00:00:00', 789,
     'Cannondale公式(C1133GU, Gen 5)。価格はページ内JSON-LD(JPY)。重量はフレーム単体(56cm・塗装済み、フォーク399g)。BSA 68mm、flat mount、UDH、Deltaステアラー、タイヤ最大32mm。C1 Aero 40 Carbon V2(Ti)シートポストとAeroボトル/ケージ付属。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 規格
-- cockpit_connection='either' と cockpit_system='deda_dcr' は同一プラットフォームの既存登録(id 2/15)に合わせた。
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, v.column2, v.column3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('Cannondale SuperSix EVO Carbon Frameset (Gen 5)',  'wheel_diameter',    '700C'),
    ('Cannondale SuperSix EVO Carbon Frameset (Gen 5)',  'bb_standard',       'bsa'),
    ('Cannondale SuperSix EVO Carbon Frameset (Gen 5)',  'brake_mount',       'flat_mount'),
    ('Cannondale SuperSix EVO Carbon Frameset (Gen 5)',  'max_tire_width_mm', '30'),
    ('Cannondale SuperSix EVO Carbon Frameset (Gen 5)',  'cockpit_interface', 'cannondale_delta'),
    ('Cannondale SuperSix EVO Carbon Frameset (Gen 5)',  'cockpit_connection', 'either'),
    ('Cannondale SuperSix EVO Carbon Frameset (Gen 5)',  'cockpit_system',    'deda_dcr'),
    ('Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)',  'wheel_diameter',    '700C'),
    ('Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)',  'bb_standard',       'bsa'),
    ('Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)',  'brake_mount',       'flat_mount'),
    ('Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)',  'max_tire_width_mm', '32'),
    ('Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)',  'cockpit_interface', 'cannondale_delta'),
    ('Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)',  'cockpit_connection', 'either'),
    ('Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)',  'cockpit_system',    'deda_dcr')
) AS v
JOIN parts p
  ON p.brand_id = 2 AND p.name = v.column1;

-- 占有カテゴリ(専用シートポストのため選択不可)
INSERT INTO part_blocked_categories (part_id, category_id)
SELECT p.id, 19
FROM parts p
WHERE p.brand_id = 2
  AND p.name IN (
    'Cannondale SuperSix EVO Carbon Frameset (Gen 5)',
    'Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)'
  );

-- 同梱付属品(専用シートポスト)。重量は非公表のため 0。
-- フレームの weight はフレーム単体値のため、加算対象(is_set_component=0)とする。
INSERT INTO part_included_items (part_id, item_name, quantity, included_category_id, created_at, updated_at, weight, is_set_component)
SELECT p.id, v.column2, 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0
FROM (VALUES
    ('Cannondale SuperSix EVO Carbon Frameset (Gen 5)', 'Cannondale C1 Aero 40 Carbon Seatpost'),
    ('Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)', 'Cannondale C1 Aero 40 Carbon V2 Seatpost')
) AS v
JOIN parts p
  ON p.brand_id = 2 AND p.name = v.column1;
