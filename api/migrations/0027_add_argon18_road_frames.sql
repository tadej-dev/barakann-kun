-- Argon 18 ロードフレームを現行ラインナップ(2026)へ更新・追加する
-- 出典:
--   Nitrogen Pro / Nitrogen(2026, 383A/384A):
--     https://www.argon18.com/en/bikes/road/nitrogen-pro
--     https://www.argon18.com/en/bikes/road/nitrogen-pro/nitrogen-pro-sram-red
--     https://www.argon18.com/en/bikes/road/nitrogen
--     White Paper: https://storage.googleapis.com/argon18craft/files/White-Paper/White-Paper-Nitrogen-Pro.pdf
--     組立ガイド: Nitrogen/Nitrogen Pro共用。BB=T47 85.5mm、タイヤ最大32c(実測34mm)、コックピット=ATTEN CHB-01。
--     重量: Proはフレーム950g(サブ950g・Mサイズ塗装)。Nitrogenはメーカー未公表のため
--           報道値「Pro比+200g」(Velo)を採用する。
--     価格: フレーム単体の販売が無く(完成車のみ)、フレーム価格の公表も無いため0(未登録)。
--   Sum Pro / Sum(2025, 378A/377A):
--     https://www.argon18bike.jp/products/sum-pro (フレーム価格￥768,900・SUM PRO 850g/Mサイズ塗装)
--     https://www.argon18bike.jp/products/new-sum (フレーム価格￥484,000・SUM 890g/Mサイズ塗装)
--     ヘッドパーツは別売でFSA ACR/SMR・Deda DCR等のサードパーティ製コックピットに対応(非専用)。
--     タイヤは最大30c(実測32mm)。専用Dシェイプシートポスト付属。
PRAGMA foreign_keys = ON;

-- 既存の Nitrogen Pro を2026年式の公称値へ更新する
UPDATE parts
SET model_year = 2026,
    description = 'ATTEN CHB-01一体型コックピット対応。専用エアロシートポスト付属。重量はフレーム単体(Mサイズ・塗装)のメーカー公称値。',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 364;

-- 誤っていた想定タイヤ幅をメーカー公称のクリアランス(32c/実測34mm)へ修正する
UPDATE part_specifications
SET spec_value = '32',
    updated_at = CURRENT_TIMESTAMP
WHERE part_id = 364 AND spec_key = 'max_tire_width_mm';

-- Nitrogen(2026)・Sum Pro(2025)・Sum(2025)を追加する
-- id 612-614 は既存の最大id(611)に続く番号。
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description, model_year) VALUES
    (0,      1150, 59, 1, CURRENT_TIMESTAMP, 612, '2026-09-17 00:00:00', CURRENT_TIMESTAMP, 'Argon 18 Nitrogen Frameset', 'Argon 18 Nitrogen Frameset', NULL, 'ATTEN CHB-01一体型コックピット対応。専用エアロシートポスト付属。重量はPro比+200gの報道値(メーカー未公表)。価格はフレーム単体の販売が無いため未登録。', 2026),
    (768900,  850, 59, 1, CURRENT_TIMESTAMP, 613, '2026-09-17 00:00:00', CURRENT_TIMESTAMP, 'Argon 18 Sum Pro Frameset', 'Argon 18 Sum Pro Frameset', NULL, '専用Dシェイプシートポスト付属。FSA ACRなどサードパーティ製コックピット対応(非専用)。重量・価格は国内正規代理店公称(Mサイズ・塗装)。', 2025),
    (484000,  890, 59, 1, CURRENT_TIMESTAMP, 614, '2026-09-17 00:00:00', CURRENT_TIMESTAMP, 'Argon 18 Sum Frameset', 'Argon 18 Sum Frameset', NULL, '専用Dシェイプシートポスト付属。FSA ACRなどサードパーティ製コックピット対応(非専用)。重量・価格は国内正規代理店公称(Mサイズ・塗装)。', 2025);

-- 専用シートポストは選択不可となるため、占有カテゴリ(シートポスト=19)として登録する
INSERT INTO part_blocked_categories (part_id, category_id) VALUES
    (612, 19),
    (613, 19),
    (614, 19);

-- フレームに付属する専用シートポスト
INSERT INTO part_included_items (part_id, item_name, quantity, included_category_id, created_at, updated_at) VALUES
    (612, 'Argon 18 Nitrogen Aero Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (613, 'Argon 18 SUM Pro D-Shape Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (614, 'Argon 18 SUM D-Shape Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 規格。NitrogenはNitrogen Proと同一プラットフォーム(ATTEN CHB-01専用コックピット)。
-- Sum Pro/Sumは非専用コックピットのためFSA ACR(オープン規格)として登録する。
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES
    (612, 'bb_standard', 't47_85_5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (612, 'cockpit_interface', 'argon_atten_chb_01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (612, 'cockpit_connection', 'integrated_only', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (612, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (612, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (613, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (613, 'cockpit_interface', 'fsa_acr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (613, 'cockpit_connection', 'either', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (613, 'cockpit_system', 'fsa_acr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (613, 'max_tire_width_mm', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (613, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (614, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (614, 'cockpit_interface', 'fsa_acr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (614, 'cockpit_connection', 'either', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (614, 'cockpit_system', 'fsa_acr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (614, 'max_tire_width_mm', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (614, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
