-- フレームのコンポーネント規格の欠落を補う
-- 根拠: 各メーカー公式のフレームセット仕様・オーナーズマニュアル
PRAGMA foreign_keys = ON;

-- A. 専用(プロプライエタリ)シートポストのフレームは、シートポスト(19)を付属扱いとしてブロックする (21件)
INSERT INTO part_blocked_categories (part_id, category_id) VALUES
    (2, 19),   -- Cannondale SuperSix EVO Hi-Mod (Gen4専用Dシェイプ)
    (3, 19),   -- Bianchi Oltre RC (専用RCシートポスト)
    (4, 19),   -- Trek Madone SLR Gen7 (シートマスト)
    (8, 19),   -- Giant Propel Advanced SL (ISP)
    (9, 19),   -- Scott Foil RC (Syncros Duncan SL Aero CFT)
    (10, 19),  -- Wilier Filante SLR (CUSTOM MADE)
    (11, 19),  -- Pinarello Dogma F (専用ポスト同梱)
    (12, 19),  -- BMC Teammachine R 01 (AS8)
    (14, 19),  -- Colnago V4Rs (Racing Seatpost 29.0x31.8)
    (15, 19),  -- Cannondale SuperSix EVO Carbon Frameset (Gen4)
    (16, 19),  -- Cannondale SystemSix Hi-MOD (KNOT)
    (17, 19),  -- Bianchi Specialissima RC (D Shape専用)
    (18, 19),  -- Trek Madone SLR Gen8 (シートマスト)
    (19, 19),  -- Trek Emonda SLR (シートマストキャップ)
    (22, 19),  -- Giant TCR Advanced SL (ISP)
    (23, 19),  -- Scott Addict RC (SP-R101-CF)
    (24, 19),  -- Wilier Verticale SLR (専用エアロ)
    (25, 19),  -- Pinarello Dogma X (専用ポスト同梱)
    (26, 19),  -- BMC Teammachine SLR 01 (AeroShape)
    (28, 19),  -- Orbea Orca OMX (OMX SPECIFIC)
    (30, 19);  -- Ridley Falcn RS (Forza Aero)

-- B. 標準27.2mmシートポストのフレームへ径を登録する (3件)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES
    (6, 'seatpost_diameter_mm', '27.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),   -- Specialized Tarmac SL7
    (13, 'seatpost_diameter_mm', '27.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Merida Scultura
    (20, 'seatpost_diameter_mm', '27.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);  -- Specialized S-Works Aethos

-- C. 一体型コックピット専用かつ対応ハンドル部品が無いフレームは handlebar(16)/stem(17) をブロックする (10件)
INSERT INTO part_blocked_categories (part_id, category_id) VALUES
    (3, 16), (3, 17),    -- Bianchi Oltre RC
    (4, 16), (4, 17),    -- Trek Madone SLR Gen7
    (9, 16), (9, 17),    -- Scott Foil RC
    (10, 16), (10, 17),  -- Wilier Filante SLR
    (11, 16), (11, 17),  -- Pinarello Dogma F
    (14, 16), (14, 17),  -- Colnago V4Rs
    (17, 16), (17, 17),  -- Bianchi Specialissima RC
    (23, 16), (23, 17),  -- Scott Addict RC
    (24, 16), (24, 17),  -- Wilier Verticale SLR
    (25, 16), (25, 17);  -- Pinarello Dogma X

-- D. 未登録だったBB規格を補完する (7件)
-- italian / pf30a は本マイグレーションで追加する新規トークン
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES
    (2, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),        -- SuperSix EVO Hi-Mod (Gen4)
    (15, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),       -- SuperSix EVO Carbon (Gen4)
    (14, 'bb_standard', 't47_85_5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Colnago V4Rs
    (29, 'bb_standard', 't47a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),      -- Factor OSTRO VAM
    (11, 'bb_standard', 'italian', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),   -- Dogma F (Italian thread 70mm)
    (25, 'bb_standard', 'italian', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),   -- Dogma X (Italian thread 70mm)
    (16, 'bb_standard', 'pf30a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);     -- SystemSix (PF30A / 73mm)

-- E. ブロックしたカテゴリーの付属品名・重量を登録する (seatpost 21 / handlebar 10 / stem 10)
-- 重量はメーカー公表値または正規販売店・レビュー実測値。公表が無いものは既存慣例どおり0。
-- シートポスト (19)
INSERT INTO part_included_items (part_id, item_name, quantity, included_category_id, created_at, updated_at, weight) VALUES
    (2, 'Cannondale SuperSix EVO Carbon Seatpost v4', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 165),
    (3, 'Oltre Full Carbon Aero Special Dimension Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 112),
    (4, 'Trek Madone SLR Gen 7 V2 Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 144),
    (8, 'Giant Integrated Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 111),
    (9, 'Syncros Duncan SL Aero CFT Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 275),
    (10, 'Wilier Filante Carbon Custom Made Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 165),
    (11, 'Pinarello Dogma F Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 180),
    (12, 'BMC AeroShape AS8 Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 155),
    (14, 'Colnago Racing Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 200),
    (15, 'Cannondale SuperSix EVO Carbon Seatpost v4', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 165),
    (16, 'Cannondale HG 60 KNOT Carbon Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 221),
    (17, 'Specialissima Full Carbon Aero Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 112),
    (18, 'Trek Madone Gen 8 Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 110),
    (19, 'Trek Emonda SLR Carbon Seatmast Cap', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 92),
    (22, 'Giant Integrated Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 107),
    (23, 'Syncros SP-R101-CF Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 220),
    (24, 'Wilier Verticale Carbon Custom Made Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 152),
    (25, 'Pinarello Aero Seatpost 3D Titanium Clamp', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 180),
    (26, 'BMC AeroShape AS10 Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 134),
    (28, 'Orbea Orca OMX Seatpost CB SB12.5', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 216),
    (30, 'Forza Aero Seatpost 6mm Offset', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 160);

-- ハンドル (16)
INSERT INTO part_included_items (part_id, item_name, quantity, included_category_id, created_at, updated_at, weight) VALUES
    (3, 'Bianchi Reparto Corse Integrated Handlebar', 1, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (4, 'Trek Madone SLR Gen 7 Barstem', 1, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 293),
    (9, 'Syncros Creston iC SL Aero Combo', 1, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 335),
    (10, 'Wilier Filante Bar Integrated Handlebar', 1, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 350),
    (11, 'MOST Talon Ultra Fast', 1, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 291),
    (14, 'Colnago CC.01 Integrated Cockpit', 1, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 310),
    (17, 'Bianchi Reparto Corse Integrated Handlebar', 1, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 330),
    (23, 'Syncros IC-R100-SL Cockpit', 1, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 285),
    (24, 'Wilier V-Bar Integrated Handlebar', 1, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 310),
    (25, 'MOST Talon Ultra Light', 1, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 359);

-- ステム (17)
INSERT INTO part_included_items (part_id, item_name, quantity, included_category_id, created_at, updated_at, weight) VALUES
    (3, 'Bianchi Reparto Corse Integrated Stem', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (4, 'Trek Madone SLR Gen 7 Barstem', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (9, 'Syncros Creston iC SL Aero Stem', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (10, 'Wilier Filante Bar Integrated Stem', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (11, 'MOST Talon Ultra Fast Integrated Stem', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (14, 'Colnago CC.01 Integrated Stem', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (17, 'Bianchi Reparto Corse Integrated Stem', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (23, 'Syncros IC-R100-SL Stem', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (24, 'Wilier V-Bar Integrated Stem', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    (25, 'MOST Talon Ultra Light Integrated Stem', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
