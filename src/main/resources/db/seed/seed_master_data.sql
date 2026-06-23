BEGIN;

TRUNCATE TABLE parts RESTART IDENTITY CASCADE;
TRUNCATE TABLE brands RESTART IDENTITY CASCADE;
TRUNCATE TABLE categories RESTART IDENTITY CASCADE;

INSERT INTO categories (key, display_name)
VALUES ('frame', 'フレーム'),
       ('groupset', 'コンポセット'),
       ('handlebar', 'ハンドル'),
       ('wheel', 'ホイール'),
       ('tire', 'タイヤ'),
       ('crankset', 'クランクセット'),
       ('pedal', 'ペダル'),
       ('brake_caliper', 'ブレーキキャリパー'),
       ('brake_pad', 'ブレーキパッド'),
       ('disc_rotor', 'ディスクローター'),
       ('saddle', 'サドル');

INSERT INTO brands (name, created_at, updated_at)
SELECT name,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM (VALUES ('Cervelo'),
             ('Cannondale'),
             ('Bianchi'),
             ('Trek'),
             ('Specialized'),
             ('Canyon'),
             ('Giant'),
             ('Scott'),
             ('Wilier'),
             ('Pinarello'),
             ('BMC'),
             ('Merida'),
             ('Colnago'),
             ('Shimano'),
             ('Fulcrum'),
             ('Mavic'),
             ('Continental'),
             ('Vittoria'),
             ('Deda'),
             ('PRO'),
             ('Selle Italia'),
             ('Fizik'),
             ('Zipp'),
             ('Ritchey'),
             ('3T'),
             ('ENVE'),
             ('DT Swiss'),
             ('Campagnolo'),
             ('Pirelli'),
             ('Schwalbe'),
             ('Michelin'),
             ('Panaracer'),
             ('SRAM'),
             ('FSA'),
             ('LOOK'),
             ('Favero'),
             ('Wahoo'),
             ('Prologo'),
             ('SwissStop'),
             ('Jagwire'),
             ('Easton'),
             ('Vision'),
             ('TIME')) AS brand_data(name);

INSERT INTO parts (name, weight, price, brand_id, category_id, created_at, updated_at)
VALUES
    -- フレーム
    ('Cervelo S5', 1006, 999900, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Cannondale SuperSix EVO Hi-Mod', 810, 670000, 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Bianchi Oltre RC', 915, 836000, 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Trek Madone SLR Gen7', 1050, 756690, 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Specialized Tarmac SL8', 685, 792000, 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Specialized Tarmac SL7', 800, 418000, 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Canyon Aeroad CFR', 915, 349000, 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Giant Propel Advanced SL', 780, 583000, 7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Scott Foil RC', 915, 517000, 8, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Wilier Filante SLR', 870, 770000, 9, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Pinarello Dogma F', 865, 1155000, 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('BMC Teammachine R 01', 910, 913000, 11, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Merida Scultura', 822, 473000, 12, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Colnago V4Rs', 790, 880000, 13, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- コンポ
    ('Shimano Dura-Ace R9270 Di2 Disc Groupset', 2438, 422736, 14, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Shimano Ultegra R8170 Di2 Disc Groupset', 2716, 256903, 14, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Shimano 105 R7170 Di2 Disc Groupset', 2992, 187868, 14, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SRAM Force AXS E1 2X HRD Groupset', 2670, 257576, 33, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SRAM Rival AXS E1 2X HRD Groupset', 2993, 238350, 33, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Campagnolo Super Record S Wireless Disc Groupset', 2670, 744260, 28, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Campagnolo Record 13 2x13 Road Groupset', 2783, 579810, 28, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Campagnolo Chorus Disc 12-Speed Groupset', 2631, 387992, 28, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- ハンドル
    ('Deda Zero1 RHM Handlebar 42cm', 304, 6660, 19, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PRO PLT Compact Handlebar 42cm', 267, 12650, 20, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PRO Vibe Alloy Handlebar 42cm', 255, 16236, 20, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Zipp Service Course SL-70 Ergo Handlebar 42cm', 285, 20300, 23, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Ritchey WCS Streem Internal Routing Handlebar 42cm', 287, 21000, 24, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('3T Superergo Pro Handlebar 42cm', 273, 15850, 25, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ENVE SES AR Road Handlebar 42cm', 248, 79860, 26, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Deda SuperZero DCR Alloy Handlebar 42cm', 305, 18590, 19, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Deda SuperZero Gravel Alloy Handlebar 42cm', 320, 19700, 19, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PRO Vibe Aero Alloy Handlebar 42cm', 330, 27109, 20, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PRO LT Compact Handlebar 42cm', 280, 8000, 20, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Zipp Service Course SL-70 XPLR Handlebar 42cm', 260, 20301, 23, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Ritchey WCS VentureMax Handlebar 42cm', 270, 20020, 24, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('3T Aeroghiaia LTD Carbon Handlebar 42cm', 232, 44000, 25, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('3T Aeroflux LTD Carbon Handlebar 42cm', 229, 44000, 25, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ENVE G Series Gravel Handlebar 42cm', 246, 60000, 26, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Easton EC90 SLX Road Handlebar 42cm', 195, 49500, 41, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Easton EA70 AX Gravel Handlebar 42cm', 290, 19500, 41, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Easton EC90 AX Gravel Handlebar 42cm', 208, 50000, 41, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Vision Trimax Aero Handlebar 42cm', 310, 11000, 42, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('FSA Energy Compact Alloy Handlebar 42cm', 269, 19580, 34, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('FSA K-Wing AGX Carbon Handlebar 42cm', 205, 48993, 34, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- ホイール
    ('Shimano WH-RS710-C46-TL Wheelset', 1612, 129000, 14, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Fulcrum Racing 4 DB Wheelset', 1690, 80960, 15, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Mavic Ksyrium SL Disc Wheelset', 1575, 110000, 16, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Zipp 303 S Tubeless Disc Wheelset', 1540, 223800, 23, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('DT Swiss ERC 1400 DICUT 45 Wheelset', 1528, 315354, 27, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('DT Swiss ER 1600 SPLINE 23 Wheelset', 1657, 92277, 27, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Campagnolo Zonda GT DB C23 Wheelset', 1690, 124300, 28, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- タイヤ
    ('Continental Grand Prix 5000 700x25C', 220, 9680, 17, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Continental Grand Prix 5000 700x28C', 235, 9680, 17, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Vittoria Corsa N.EXT TLR 700x28C', 300, 10450, 18, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Pirelli P ZERO Race TLR 700x28C', 295, 11400, 29, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Schwalbe Pro One TLE 700x28C', 270, 15180, 30, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Michelin Power Cup TLR 700x28C Black', 285, 12320, 31, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Michelin Power Cup TLR 700x28C Classic', 285, 12870, 31, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Panaracer AGILEST TLR 700x28C', 250, 8580, 32, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- クランク
    ('Shimano 105 FC-R7100 50-34T 170mm', 754, 19968, 14, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Shimano Ultegra FC-R8100 50-34T 170mm', 700, 39745, 14, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Shimano Dura-Ace FC-R9200 50-34T 170mm', 685, 79194, 14, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SRAM Force AXS DUB Crankset 48/35T 172.5mm', 622, 28290, 33, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SRAM Rival AXS DUB Crankset 48/35T 170mm', 844, 17600, 33, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('FSA Gossamer Pro AGX 46/30T Crankset 170mm', 780, 44414, 34, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Campagnolo Chorus 12s Ultra-Torque Crankset 48/32T 172.5mm', 728, 87450, 28, 6, CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP),

    -- ペダル
    ('Shimano 105 PD-R7000 SPD-SL Pedal', 265, 23928, 14, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Shimano PD-RS500 SPD-SL Pedal', 320, 9835, 14, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Shimano Ultegra PD-R8000 SPD-SL Pedal', 248, 24828, 14, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('LOOK Keo Blade Carbon Pedal', 230, 23650, 35, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Wahoo SPEEDPLAY COMP Pedal', 232, 22000, 37, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Favero Assioma UNO Power Meter Pedal', 303, 66550, 36, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('TIME XPRO 10 Pedal', 228, 26000, 43, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- ブレーキキャリパー
    ('Shimano 105 BR-R7170 Disc Brake Caliper', 123, 8064, 14, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Shimano Ultegra BR-R8170 Disc Brake Caliper', 136, 16960, 14, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Shimano Dura-Ace BR-R9270 Disc Brake Caliper', 120, 18707, 14, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SRAM Force AXS Flat Mount Brake Caliper', 170, 18000, 33, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SRAM Rival AXS Flat Mount Brake Caliper', 170, 9000, 33, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Campagnolo Flat Mount Disc Brake Caliper', 120, 17000, 28, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- ブレーキパッド
    ('Shimano L05A-RF Resin Disc Brake Pads', 17, 3324, 14, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Shimano K05S-RX Resin Disc Brake Pads', 17, 1415, 14, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Shimano L04C-MF Metal Disc Brake Pads', 26, 2947, 14, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SRAM AXS Road Organic Disc Brake Pads', 20, 3500, 33, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Campagnolo DB-310 Organic Disc Brake Pads', 27, 6200, 28, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SwissStop Disc RS Brake Pads', 20, 4500, 39, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Jagwire Sport Semi-Metallic Disc Brake Pads', 22, 2500, 40, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- ディスクローター
    ('Shimano SM-RT70 Center Lock Disc Rotor 160mm', 133, 4078, 14, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Shimano RT-MT800 Center Lock Disc Rotor 160mm', 108, 8777, 14, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Shimano SM-RT64 Center Lock Disc Rotor 160mm', 140, 4078, 14, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SRAM Paceline Center Lock Disc Rotor 160mm', 157, 6000, 33, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SRAM CenterLine XR Center Lock Disc Rotor 160mm', 130, 12000, 33, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Campagnolo AFS Center Lock Disc Rotor 160mm', 157, 10340, 28, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SwissStop Catalyst Pro Center Lock Disc Rotor 160mm', 138, 13750, 39, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- サドル
    ('Selle Italia SLR Boost TM Superflow S3', 208, 21000, 21, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('PRO Stealth Sport Saddle', 285, 12112, 20, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Fizik Vento Argo R5 Saddle', 232, 16185, 22, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Specialized Power Comp Saddle 143mm', 247, 16000, 5, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Fizik Tempo Argo R5 Saddle 150mm', 241, 15000, 22, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Selle Italia Novus Boost Evo TM Superflow Saddle', 265, 18480, 21, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Prologo Dimension NDR T4.0 Saddle 143mm', 232, 16000, 38, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('brands_id_seq', (SELECT MAX(id) FROM brands));
SELECT setval('parts_id_seq', (SELECT MAX(id) FROM parts));

COMMIT;