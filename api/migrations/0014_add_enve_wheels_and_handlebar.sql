-- ENVEのSESロードホイールとステム一体型ハンドルを追加する
-- 価格はENVE日本公式(ダイアテック)の税込参考価格、重量はメーカー公表値
PRAGMA foreign_keys = ON;

-- SESロードホイール: 700C・センターロック・チューブレス
-- フリーボディはSHIMANO/XDR/N3Wの選択式のため、単一値にせず未登録とする
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (499950, 1222, 26, 13, CURRENT_TIMESTAMP, 542, '2026-09-11 00:00:00', CURRENT_TIMESTAMP, 'ENVE SES 2.3', 'ENVE SES 2.3', NULL, '山岳向けの軽量ロードホイールセット。重量は前後合計の公称値です');
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (499950, 1380, 26, 13, CURRENT_TIMESTAMP, 543, '2026-09-11 00:00:00', CURRENT_TIMESTAMP, 'ENVE SES 3.4', 'ENVE SES 3.4', NULL, 'ロードからグラベルまで対応するオールラウンドホイールセット。重量は前後合計の公称値です');
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (499950, 1432, 26, 13, CURRENT_TIMESTAMP, 544, '2026-09-11 00:00:00', CURRENT_TIMESTAMP, 'ENVE SES 4.5', 'ENVE SES 4.5', NULL, '50/56mmハイトのエアロロードホイールセット。重量は前後合計の公称値です');
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (499950, 1457, 26, 13, CURRENT_TIMESTAMP, 545, '2026-09-11 00:00:00', CURRENT_TIMESTAMP, 'ENVE SES 6.7', 'ENVE SES 6.7', NULL, '60/67mmハイトのディープエアロホイールセット。重量は前後合計の公称値です');

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (542, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (542, 'rotor_mount', 'center_lock', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (543, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (543, 'rotor_mount', 'center_lock', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (544, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (544, 'rotor_mount', 'center_lock', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (545, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (545, 'rotor_mount', 'center_lock', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ステム一体型ハンドル: ステム枠を占有し、標準1-1/8インチのステアラーに対応
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (239800, 350, 26, 16, CURRENT_TIMESTAMP, 546, '2026-09-11 00:00:00', CURRENT_TIMESTAMP, 'ENVE SES AR One-Piece Handlebar 42x120mm', 'ENVE SES AR One-Piece Handlebar 42x120mm', NULL, 'ステム一体型ハンドル。IN-Route対応フレーム向け。重量は42cm×120mmの公称値です');
INSERT INTO part_blocked_categories (part_id, category_id) VALUES (546, 17);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (546, 'cockpit_interface', 'standard_1_1_8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
