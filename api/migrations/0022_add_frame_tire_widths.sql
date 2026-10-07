-- フレームの対応タイヤ幅（最大）を追加する
-- 出典: 各メーカー公式（フレームセット仕様・オーナーズマニュアル）／一部はBike Insights
-- Corratec CCT TEAM は情報が矛盾(28/30mm)のため見送り
PRAGMA foreign_keys = ON;

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES
    (1, 'max_tire_width_mm', '34', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),   -- Cervelo S5
    (2, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),   -- Cannondale SuperSix EVO Hi-Mod
    (4, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),   -- Trek Madone SLR Gen7
    (5, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),   -- Specialized Tarmac SL8
    (6, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),   -- Specialized Tarmac SL7
    (7, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),   -- Canyon Aeroad CFR
    (8, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),   -- Giant Propel Advanced SL
    (9, 'max_tire_width_mm', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),   -- Scott Foil RC
    (10, 'max_tire_width_mm', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Wilier Filante SLR
    (11, 'max_tire_width_mm', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Pinarello Dogma F
    (12, 'max_tire_width_mm', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- BMC Teammachine R 01
    (13, 'max_tire_width_mm', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Merida Scultura
    (14, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Colnago V4Rs
    (15, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Cannondale SuperSix EVO Carbon Frameset
    (16, 'max_tire_width_mm', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Cannondale SystemSix Hi-MOD
    (18, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Trek Madone SLR Gen 8
    (19, 'max_tire_width_mm', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Trek Emonda SLR
    (20, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Specialized S-Works Aethos
    (21, 'max_tire_width_mm', '33', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Canyon Ultimate CFR
    (22, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Giant TCR Advanced SL
    (23, 'max_tire_width_mm', '34', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Scott Addict RC Ultimate
    (24, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Wilier Verticale SLR
    (25, 'max_tire_width_mm', '35', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Pinarello Dogma X
    (26, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- BMC Teammachine SLR 01
    (28, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Orbea Orca OMX
    (29, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Factor OSTRO VAM 2.0
    (30, 'max_tire_width_mm', '34', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),  -- Ridley Falcn RS
    (533, 'max_tire_width_mm', '34', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), -- De Rosa Merak
    (540, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), -- Pardus Robin EVO (Bike Insights)
    (541, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP); -- Specialized Tarmac SL9
