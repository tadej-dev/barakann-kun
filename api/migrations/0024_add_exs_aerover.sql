-- EXS AEROVER Compact 一体型ハンドルバー(23サイズ)を追加する
-- 出典:
--   スペック/価格: EXS Cycling 公式・スターバイクス商品紹介
--     https://exs-cycling.com/products/aerover-integrated-handlebar
--     https://www.star-bikes.jp/?p=39263
--   重量: Ti-Parts Titanium の手測り表(参考値)。公式公表値は 290g(360-90)/310g(400-110) のみ。
--     400-140 / 420-140 は未計測のため 0(未登録)とする。
--   対応システム: 標準1-1/8 / FSA ACR / Deda DCR。専用ヘッドスペーサーで各車種へ適合する。
-- 備考: リーチ70mm・ドロップ125mm・コラムクランプ径1-1/8(シム有)または1-1/4(シム無)。
PRAGMA foreign_keys = ON;

-- EXS は未登録ブランドのため追加する
INSERT INTO brands (id, name, created_at, updated_at) VALUES (95, 'EXS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 一体型ハンドルバー 23サイズ (id 589-611)。420/90 はラインナップ外。
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES
    (79800, 303, 95, 16, CURRENT_TIMESTAMP, 589, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 360x90mm', '360x90mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 299, 95, 16, CURRENT_TIMESTAMP, 590, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 360x100mm', '360x100mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 309, 95, 16, CURRENT_TIMESTAMP, 591, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 360x110mm', '360x110mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 311, 95, 16, CURRENT_TIMESTAMP, 592, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 360x120mm', '360x120mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 320, 95, 16, CURRENT_TIMESTAMP, 593, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 360x130mm', '360x130mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 312, 95, 16, CURRENT_TIMESTAMP, 594, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 360x140mm', '360x140mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 307, 95, 16, CURRENT_TIMESTAMP, 595, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 380x90mm', '380x90mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 313, 95, 16, CURRENT_TIMESTAMP, 596, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 380x100mm', '380x100mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 315, 95, 16, CURRENT_TIMESTAMP, 597, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 380x110mm', '380x110mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 318, 95, 16, CURRENT_TIMESTAMP, 598, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 380x120mm', '380x120mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 311, 95, 16, CURRENT_TIMESTAMP, 599, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 380x130mm', '380x130mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 321, 95, 16, CURRENT_TIMESTAMP, 600, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 380x140mm', '380x140mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 312, 95, 16, CURRENT_TIMESTAMP, 601, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 400x90mm', '400x90mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 316, 95, 16, CURRENT_TIMESTAMP, 602, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 400x100mm', '400x100mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 321, 95, 16, CURRENT_TIMESTAMP, 603, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 400x110mm', '400x110mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 315, 95, 16, CURRENT_TIMESTAMP, 604, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 400x120mm', '400x120mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 326, 95, 16, CURRENT_TIMESTAMP, 605, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 400x130mm', '400x130mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 0,   95, 16, CURRENT_TIMESTAMP, 606, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 400x140mm', '400x140mm', 'ステム一体型ハンドル。重量は未計測。'),
    (79800, 321, 95, 16, CURRENT_TIMESTAMP, 607, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 420x100mm', '420x100mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 319, 95, 16, CURRENT_TIMESTAMP, 608, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 420x110mm', '420x110mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 329, 95, 16, CURRENT_TIMESTAMP, 609, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 420x120mm', '420x120mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 332, 95, 16, CURRENT_TIMESTAMP, 610, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 420x130mm', '420x130mm', 'ステム一体型ハンドル。重量は第三者実測値(参考)。'),
    (79800, 0,   95, 16, CURRENT_TIMESTAMP, 611, '2026-09-16 00:00:00', CURRENT_TIMESTAMP, 'EXS AEROVER Compact', 'EXS AEROVER Compact 420x140mm', '420x140mm', 'ステム一体型ハンドル。重量は未計測。');

-- ステムを占有する一体型ハンドルとして登録する
INSERT INTO part_blocked_categories (part_id, category_id) VALUES
    (589, 17),
    (590, 17),
    (591, 17),
    (592, 17),
    (593, 17),
    (594, 17),
    (595, 17),
    (596, 17),
    (597, 17),
    (598, 17),
    (599, 17),
    (600, 17),
    (601, 17),
    (602, 17),
    (603, 17),
    (604, 17),
    (605, 17),
    (606, 17),
    (607, 17),
    (608, 17),
    (609, 17),
    (610, 17),
    (611, 17);

-- 付属ステムを明示する(一体型のため既存の一体型ハンドルと同じ扱い)
INSERT INTO part_included_items (part_id, item_name, quantity, included_category_id, created_at, updated_at) VALUES
    (589, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (590, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (591, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (592, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (593, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (594, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (595, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (596, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (597, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (598, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (599, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (600, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (601, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (602, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (603, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (604, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (605, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (606, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (607, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (608, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (609, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (610, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (611, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 対応システムを付与する。適合判定は cockpit_system の交差で行う。
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES
    (589, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (590, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (591, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (592, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (593, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (594, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (595, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (596, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (597, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (598, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (599, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (600, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (601, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (602, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (603, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (604, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (605, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (606, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (607, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (608, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (609, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (610, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (611, 'cockpit_system', 'standard_1_1_8,fsa_acr,deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
