-- BMC のロード/トライアスロン フレームセットを登録する
-- 目的:
--   BMC のフレームセットをフレーム(category_id=1)として登録し、
--   ホイール径などの規格と付属品を揃える。
-- 出典(2026-10-03 調査):
--   [価格・BB規格・タイヤクリアランス・付属品]
--     BMC Switzerland 日本公式Webサイト 各商品ページ(e-ftb.co.jp/bmc/lineup/<id>/)
--       13102 Teammachine SLR01 FRS VAR4 / 12903 Teammachine R 01 FRS VAR1 /
--       12113 Teammachine R 01 FRS V1     / 9453  Teammachine SLR01 MOD V1 /
--       10504 Roadmachine FRS V2          / 10855 Speedmachine01 MOD フレームセット
--   [ホイール径]
--     商品ページに記載が無いため 99spokes の各フレームセットページ("Wheels 700c")を出典とする。
--   [重量]
--     - Teammachine SLR 01 Gen 5 : 700g  (フレーム単体・塗装済み54、BMC公式13102)
--     - Teammachine SLR01 MOD    : 1950g (フレームセット重量・付属品込み54平均、BMC公式9453)
--     - Teammachine R 01 (VAR/V) : 910g  (フレーム単体 54、BMC公称値。weightweenies で確認)
--     - Roadmachine FRS          : 1646g (フレームセット重量 47cm、CyclingUpgrades 実測。
--                                       frame+fork+headset+hanger+seatpost+thru-axle)
--     - Speedmachine 01 MOD      : 3900g (フレームセット/モジュール重量。e-bikewarehouseusa。
--                                       FuelTank/リアストレージ/ライト込み。99spokes は4.0kg)
--     付属品重量は公表分のみ登録(ICS Carbon 一体型コックピット=305g)。未公表は0。
-- 前提・注意:
--   カラー違い(VAR1〜VAR4 等)は同一モデルとして1件に集約する(利用者の指定)。
--   model_year は商品ページに明記が無いため未登録(NULL)。同名モデルの区別は edition で行う。
--   Teammachine SLR FRS は重量の出典が無いため登録しない(利用者の指定。2026-10-03)。
--   重量が「フレームセット重量(付属品込み)」のモデルは、同梱付属品を is_set_component=1 とし、
--   完成重量への二重加算を防ぐ。フレーム単体重量のモデル(#1・#3・#4)は付属品を加算する。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象フレームを先に削除する。
-- 関連する規格・付属品・占有カテゴリは ON DELETE CASCADE で併せて消える。
-- Teammachine SLR FRS は旧版で登録していたため、削除対象に残して後始末する。
DELETE FROM parts
WHERE brand_id = 11
  AND name IN (
    'BMC Teammachine SLR 01 Frameset (Gen 5)',
    'BMC Teammachine SLR01 MOD Frameset',
    'BMC Teammachine R 01 Frameset (VAR)',
    'BMC Teammachine R 01 Frameset (V)',
    'BMC Teammachine SLR FRS Frameset',
    'BMC Roadmachine FRS Frameset',
    'BMC Speedmachine 01 MOD Frameset'
  );

-- フレーム本体(6件)
-- weight は出典の値。フレームセット重量(付属品込み)のモデルは description にその旨を記す。
INSERT INTO parts (category_id, brand_id, name, model_name, variant_name, edition, price, price_updated_at, weight, description, created_at, updated_at) VALUES
    (1, 11, 'BMC Teammachine SLR 01 Frameset (Gen 5)', 'BMC Teammachine SLR 01', NULL, 'Gen 5', 924000, '2026-10-03 00:00:00', 700,
     'BMC日本公式(13102等)。重量はフレーム単体(塗装済み54サイズ、公式)。フレームセット重量(付属品込み)は1455〜1565g。コックピットは別売。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 11, 'BMC Teammachine SLR01 MOD Frameset', 'BMC Teammachine SLR 01 MOD', NULL, NULL, 946000, '2026-10-03 00:00:00', 1950,
     'BMC日本公式(9453等)。重量はフレームセット重量(フレーム+フォーク+ヘッドセット+コックピット+シートポスト、54サイズ平均)。付属品は is_set_component=1 のため完成重量へは加算しない。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 11, 'BMC Teammachine R 01 Frameset (VAR)', 'BMC Teammachine R 01', NULL, 'VAR', 924000, '2026-10-03 00:00:00', 910,
     'BMC日本公式(12903等)。重量はフレーム単体(BMC公称値、54サイズ。フォーク345gは別)。フレームセット重量(付属品込み)は1780g。コックピットは別売。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 11, 'BMC Teammachine R 01 Frameset (V)', 'BMC Teammachine R 01', NULL, 'V', 913000, '2026-10-03 00:00:00', 910,
     'BMC日本公式(12113等)。重量はフレーム単体(BMC公称値、54サイズ。フォーク345gは別)。フレームセット重量(付属品込み)は1805g。コックピットは別売。既存の Teammachine R 01(id 12, 913,000円)とは別行として登録。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 11, 'BMC Roadmachine FRS Frameset', 'BMC Roadmachine', NULL, NULL, 374000, '2026-10-03 00:00:00', 1646,
     'BMC日本公式(10504等)。重量はフレームセット重量(フレーム+フォーク+ヘッドセット+ハンガー+シートポスト+スルーアクスル、47cm、CyclingUpgrades実測)。メーカーのフレーム単体重量は非公表(NA)。付属品は is_set_component=1 のため完成重量へは加算しない。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, 11, 'BMC Speedmachine 01 MOD Frameset', 'BMC Speedmachine 01', NULL, NULL, 1226500, '2026-10-03 00:00:00', 3900,
     'BMC日本公式(10855等)。重量はフレームセット/モジュール重量(フレーム+フォーク+シートポスト+一体型コックピット+FuelTank+リアストレージ+ライト、e-bikewarehouseusa。99spokesは4.0kgを記載)。付属品は is_set_component=1 のため完成重量へは加算しない。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 規格(ホイール径・BB規格・最大タイヤ幅)
-- ホイール径: 99spokes の各フレームセットページ("Wheels 700c")。
-- BB規格: 'bb86'(PF86/BB86 プレスフィット)、't47_68'(T47 68mm ねじ切り)。
-- タイヤ幅: 各商品ページの "Tire Clearance" (measured width)。
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, v.column2, v.column3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('BMC Teammachine SLR 01 Frameset (Gen 5)', 'wheel_diameter',    '700C'),
    ('BMC Teammachine SLR 01 Frameset (Gen 5)', 'bb_standard',       'bb86'),
    ('BMC Teammachine SLR 01 Frameset (Gen 5)', 'max_tire_width_mm', '32'),
    ('BMC Teammachine SLR01 MOD Frameset',      'wheel_diameter',    '700C'),
    ('BMC Teammachine SLR01 MOD Frameset',      'bb_standard',       'bb86'),
    ('BMC Teammachine SLR01 MOD Frameset',      'max_tire_width_mm', '30'),
    ('BMC Teammachine R 01 Frameset (VAR)',     'wheel_diameter',    '700C'),
    ('BMC Teammachine R 01 Frameset (VAR)',     'bb_standard',       'bb86'),
    ('BMC Teammachine R 01 Frameset (VAR)',     'max_tire_width_mm', '30'),
    ('BMC Teammachine R 01 Frameset (V)',       'wheel_diameter',    '700C'),
    ('BMC Teammachine R 01 Frameset (V)',       'bb_standard',       'bb86'),
    ('BMC Teammachine R 01 Frameset (V)',       'max_tire_width_mm', '30'),
    ('BMC Roadmachine FRS Frameset',            'wheel_diameter',    '700C'),
    ('BMC Roadmachine FRS Frameset',            'bb_standard',       'bb86'),
    ('BMC Roadmachine FRS Frameset',            'max_tire_width_mm', '33'),
    ('BMC Speedmachine 01 MOD Frameset',        'wheel_diameter',    '700C'),
    ('BMC Speedmachine 01 MOD Frameset',        'bb_standard',       't47_68'),
    ('BMC Speedmachine 01 MOD Frameset',        'max_tire_width_mm', '30')
) AS v
JOIN parts p
  ON p.brand_id = 11 AND p.name = v.column1;

-- 占有カテゴリ(専用パーツのため選択不可)
--   19 シートポスト: 全モデルで専用シートポストを同梱。
--   16 ハンドル / 17 ステム: 一体型コックピットを同梱するモデルのみ。
INSERT INTO part_blocked_categories (part_id, category_id)
SELECT p.id, v.column2
FROM (VALUES
    ('BMC Teammachine SLR 01 Frameset (Gen 5)', 19),
    ('BMC Teammachine SLR01 MOD Frameset',      16),
    ('BMC Teammachine SLR01 MOD Frameset',      17),
    ('BMC Teammachine SLR01 MOD Frameset',      19),
    ('BMC Teammachine R 01 Frameset (VAR)',     19),
    ('BMC Teammachine R 01 Frameset (V)',       19),
    ('BMC Roadmachine FRS Frameset',            19),
    ('BMC Speedmachine 01 MOD Frameset',        16),
    ('BMC Speedmachine 01 MOD Frameset',        17),
    ('BMC Speedmachine 01 MOD Frameset',        19)
) AS v
JOIN parts p
  ON p.brand_id = 11 AND p.name = v.column1;

-- 付属品(同梱の専用パーツ)
-- 重量は公表分のみ登録する。未公表は 0。
--   一体型コックピットは既存慣例(0018)に合わせ、ハンドル(16)に重量・ステム(17)に0を入れる。
--   AS8 シートポスト(155g)は既存の BMC Teammachine R 01(id 12)と同一部品のため同値を用いる。
--   is_set_component=1 は、その付属品の重量がフレームの weight(フレームセット重量)に
--   含まれるため完成重量へ加算しないことを表す(0033の仕組み)。
INSERT INTO part_included_items (part_id, item_name, quantity, included_category_id, created_at, updated_at, weight, is_set_component)
SELECT p.id, v.column2, 1, v.column3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, v.column4, v.column5
FROM (VALUES
    ('BMC Teammachine SLR 01 Frameset (Gen 5)', 'BMC Teammachine SLR 01 Gen 5 Aero Shaped Seatpost',      19, 0,   0),
    ('BMC Teammachine SLR01 MOD Frameset',      'BMC ICS Carbon One-Piece Cockpit',                       16, 305, 1),
    ('BMC Teammachine SLR01 MOD Frameset',      'BMC ICS Carbon One-Piece Cockpit',                       17, 0,   1),
    ('BMC Teammachine SLR01 MOD Frameset',      'BMC Teammachine SLR 01 Premium Carbon D-Shape Seatpost', 19, 0,   1),
    ('BMC Teammachine R 01 Frameset (VAR)',     'BMC AeroShape AS8 Seatpost',                             19, 155, 0),
    ('BMC Teammachine R 01 Frameset (V)',       'BMC AeroShape AS8 Seatpost',                             19, 155, 0),
    ('BMC Roadmachine FRS Frameset',            'BMC Roadmachine Premium Carbon D-Shape Seatpost',        19, 0,   1),
    ('BMC Speedmachine 01 MOD Frameset',        'BMC Speedmachine Flat Cockpit',                          16, 0,   1),
    ('BMC Speedmachine 01 MOD Frameset',        'BMC Speedmachine Flat Cockpit',                          17, 0,   1),
    ('BMC Speedmachine 01 MOD Frameset',        'BMC Speedmachine Aero Seatpost',                         19, 0,   1)
) AS v
JOIN parts p
  ON p.brand_id = 11 AND p.name = v.column1;
