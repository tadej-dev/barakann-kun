-- Cannondale SuperSix EVO LAB71 Frameset(第5世代)を登録する
-- 出典(2026-10-05 調査。Cannondale 公式商品ページ):
--   SuperSix EVO LAB71 Frameset (C1102GU)
--     https://www.cannondale.com/ja-jp/bikes/road/race/supersix-evo/supersix-evo-lab71-frameset
--     価格 890,000 円(ページ内の JSON-LD price/priceCurrency=JPY)
--     フレーム重量 755g(56cm・塗装済み、本文記載。フォーク 378g)
--     Frame: LAB71 SuperSix EVO, Gen 5, Ultralight Series 0 Carbon | 12x142 thru-axle |
--            BSA 68mm threaded BB | flat mount disc | integrated seat binder | UDH
--     Fork: 1-1/8" to 1-1/4" Delta steerer / Wheel Size: 700c / タイヤ: 最大32mm
--     同梱: Cannondale C1 Aero 40 Carbon V2(Ti)シートポスト、Gripper Aero Bottle & Cage
-- 方針・注意:
--   - 同梱シートポスト(C1 Aero 40 V2)の重量は、公式・部品販売店・小売・ホワイトペーパーを
--     確認したが出典が見つからなかった。0を登録しない方針のため、付属品としては登録しない。
--   - cockpit_connection / cockpit_system は同一プラットフォームの既存登録に合わせた。
--   - seatpost_diameter_mm / handlebar_clamp_mm は専用形状・一体型のため出典が無く未登録。
PRAGMA foreign_keys = ON;

DELETE FROM parts
WHERE brand_id = 2
  AND name = 'Cannondale SuperSix EVO LAB71 Frameset (Gen 5)';

INSERT INTO parts (category_id, brand_id, name, model_name, variant_name, edition, price, price_updated_at, weight, description, created_at, updated_at) VALUES
    (1, 2, 'Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'Cannondale SuperSix EVO LAB71 Frameset', NULL, 'Gen 5', 890000, '2026-10-05 00:00:00', 755,
     'Cannondale公式(C1102GU, Gen 5)。価格はページ内JSON-LD(JPY)。重量はフレーム単体(56cm・塗装済み、フォーク378g)。BSA 68mm、flat mount、UDH、Deltaステアラー、タイヤ最大32mm。C1 Aero 40 Carbon V2(Ti)シートポストとAeroボトル/ケージ付属。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, v.column2, v.column3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'wheel_diameter',     '700C'),
    ('Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'bb_standard',        'bsa'),
    ('Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'brake_mount',        'flat_mount'),
    ('Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'max_tire_width_mm',  '32'),
    ('Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'cockpit_interface',  'cannondale_delta'),
    ('Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'cockpit_connection', 'either'),
    ('Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'cockpit_system',     'deda_dcr')
) AS v
JOIN parts p
  ON p.brand_id = 2 AND p.name = v.column1;

-- 占有カテゴリ(専用シートポストのため選択不可)
INSERT INTO part_blocked_categories (part_id, category_id)
SELECT id, 19 FROM parts
WHERE brand_id = 2 AND name = 'Cannondale SuperSix EVO LAB71 Frameset (Gen 5)';
