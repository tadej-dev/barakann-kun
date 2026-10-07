-- 集合一致・複数値表示の動作確認用に、既存規格キーの未登録値を持つ実在製品を追加する。
-- 価格は日本の正規販売店の税込価格、重量はメーカー公表値または正規販売店表記。
-- 実在・価格を裏付けられない製品は登録しない。
PRAGMA foreign_keys = ON;

-- Crankbrothers は未登録ブランドのため追加する
INSERT INTO brands (id, name, created_at, updated_at) VALUES (91, 'Crankbrothers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 未登録値の実在製品を追加する (id 547-557)
-- 547: freehub_body=shimano_micro_spline, 12速 (シマノ 正規販売店 21,170円 / 470g)
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (21170, 470, 14, 7, CURRENT_TIMESTAMP, 547, '2026-09-12 00:00:00', CURRENT_TIMESTAMP, 'Shimano Deore XT CS-M8100-12', 'Shimano Deore XT CS-M8100-12 Cassette 10-51T', NULL, '12速マイクロスプライン専用のMTBカセット。重量は公表値です');
-- 548: freehub_body=shimano_micro_spline, wheel_diameter=700C, center_lock (前後MSRP合算 82,127円 / 1,840g)
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (82127, 1840, 14, 13, CURRENT_TIMESTAMP, 548, '2026-09-12 00:00:00', CURRENT_TIMESTAMP, 'Shimano Deore XT WH-M8100-TL', 'Shimano Deore XT WH-M8100-TL Wheelset 29"', NULL, 'マイクロスプライン・センターロックの29インチ(622)MTBホイールセット。重量は前後合計の公表値です');
-- 549: freehub_body=sram_xd, 12速 (44,880円 / 452g)
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (44880, 452, 33, 7, CURRENT_TIMESTAMP, 549, '2026-09-12 00:00:00', CURRENT_TIMESTAMP, 'SRAM GX Eagle XG-1275', 'SRAM GX Eagle XG-1275 Cassette 10-52T', NULL, 'XDフリーボディ専用の12速MTBカセット。重量は販売店表記です');
-- 550: wheel_diameter=650B, center_lock (116,100円 / 1,594g)
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (116100, 1594, 51, 13, CURRENT_TIMESTAMP, 550, '2026-09-12 00:00:00', CURRENT_TIMESTAMP, 'MASON x HUNT 650B Adventure Sport Disc', 'MASON x HUNT 650B Adventure Sport Disc Wheelset', NULL, '650B・センターロックのグラベルホイールセット。重量は前後合計の公表値です');
-- 551: wheel_diameter=650B, tire_width_mm=48 (6,600円 / 610g)
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (6600, 610, 32, 14, CURRENT_TIMESTAMP, 551, '2026-09-12 00:00:00', CURRENT_TIMESTAMP, 'Panaracer GravelKing SK', 'Panaracer GravelKing SK 650Bx48', NULL, '650Bグラベル用タイヤ。重量はメーカー公表値です');
-- 552: cleat_system=shimano_spd (6,778円 / 380g)
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (6778, 380, 14, 21, CURRENT_TIMESTAMP, 552, '2026-09-12 00:00:00', CURRENT_TIMESTAMP, 'Shimano PD-M520', 'Shimano PD-M520 SPD Pedals', NULL, 'SPDクリート対応の両面MTBペダル。重量は公表値です');
-- 553: cleat_system=crankbrothers (11,200円 / 294g)
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (11200, 294, 91, 21, CURRENT_TIMESTAMP, 553, '2026-09-12 00:00:00', CURRENT_TIMESTAMP, 'Crankbrothers Candy 1', 'Crankbrothers Candy 1 V3 Pedals', NULL, 'Crankbrothersクリート対応のMTBペダル。重量は正規販売店表記です');
-- 554: shift_system=electronic_wired, 12速 (46,408円 / 262g)
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (46408, 262, 14, 5, CURRENT_TIMESTAMP, 554, '2026-09-12 00:00:00', CURRENT_TIMESTAMP, 'Shimano Ultegra Di2 RD-R8150', 'Shimano Ultegra Di2 RD-R8150 Rear Derailleur', NULL, '12速Di2のリアディレイラー。重量は公表値です');
-- 555: drivetrain_speed=9, shift_system=mechanical (5,936円 / 295g)
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (5936, 295, 14, 5, CURRENT_TIMESTAMP, 555, '2026-09-12 00:00:00', CURRENT_TIMESTAMP, 'Shimano Sora RD-R3000-GS', 'Shimano Sora RD-R3000-GS Rear Derailleur', NULL, '9速機械式のGSケージ リアディレイラー。重量は販売店表記です');
-- 556: saddle_rail=alloy_7mm (17,800円 / 230g)
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (17800, 230, 22, 20, CURRENT_TIMESTAMP, 556, '2026-09-12 00:00:00', CURRENT_TIMESTAMP, 'Fizik Tempo Aliante R5', 'Fizik Tempo Aliante R5 Saddle 145mm', NULL, 'S-Alloy(7x7mm)レールのサドル。重量は145mmの公表値です');
-- 557: crank_spindle=sram_gxp, bb_standard=bsa (7,480円 / 108g)
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES (7480, 108, 33, 9, CURRENT_TIMESTAMP, 557, '2026-09-12 00:00:00', CURRENT_TIMESTAMP, 'SRAM GXP Team', 'SRAM GXP Team Bottom Bracket BSA', NULL, 'GXPクランク用のBSA(ねじ切り)ボトムブラケット。重量は公表値です');

-- 新規パーツの規格
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (547, 'freehub_body', 'shimano_micro_spline', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (547, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (548, 'freehub_body', 'shimano_micro_spline', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (548, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (548, 'rotor_mount', 'center_lock', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (549, 'freehub_body', 'sram_xd', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (549, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (550, 'wheel_diameter', '650B', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (550, 'rotor_mount', 'center_lock', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (551, 'wheel_diameter', '650B', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (551, 'tire_width_mm', '48', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (552, 'cleat_system', 'shimano_spd', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (553, 'cleat_system', 'crankbrothers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (554, 'shift_system', 'electronic_wired', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (554, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (555, 'drivetrain_speed', '9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (555, 'shift_system', 'mechanical', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (556, 'saddle_rail', 'alloy_7mm', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (557, 'crank_spindle', 'sram_gxp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (557, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 既存パーツへ未登録規格を付与する
-- Cervélo S5 は BBright フレーム (Cervélo 公式)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (1, 'bb_standard', 'bbright', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
-- Praxis Works の M30 クランク・BB は M30 軸
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (179, 'crank_spindle', 'praxis_m30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (304, 'crank_spindle', 'praxis_m30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
