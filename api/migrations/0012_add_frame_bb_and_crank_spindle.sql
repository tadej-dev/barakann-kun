-- 未登録だったフレームのBBシェル規格とクランクの対応アクスルを登録する
-- シェル・アクスルともメーカー公式仕様から確定できるもののみ対象とする
-- BB30A/PF30A・BBRight・イタリアンねじ切りは対応コードがないため対象外とする
-- Praxis M30系の段付きアクスルは誤判定を避けて対象外とする
PRAGMA foreign_keys = ON;

-- Bianchi Oltre RC / Specialissima RC: BB-PressFit 86.5x41(公式)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (3, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (17, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Trek Madone SLR Gen7 / Gen8 / Emonda SLR: T47 85.5mm(Trek独自幅)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (4, 'bb_standard', 't47_85_5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (18, 'bb_standard', 't47_85_5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (19, 'bb_standard', 't47_85_5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Specialized Tarmac SL8 / SL7 / Aethos / SL9: BSAねじ切り68mm(公式)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (5, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (6, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (20, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (541, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Canyon Aeroad CFR / Ultimate CFR: BB86プレスフィット
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (7, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (21, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Giant Propel Advanced SL / TCR Advanced SL: BB86プレスフィット(公式)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (8, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (22, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Scott Foil RC / Addict RC: PF BB86(86.5x41、公式)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (9, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (23, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Wilier Filante SLR / Verticale SLR: 86.5x41プレスフィット
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (10, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (24, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- BMC Teammachine R 01 / SLR 01: BB86プレスフィット(公式マニュアル)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (12, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (26, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Merida Scultura: BB86/BB92プレスフィット(公式)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (13, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Orbea Orca OMX: BB386EVOプレスフィット(公式スペック)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (28, 'bb_standard', 'bb386', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Ridley Falcn RS: BB86プレスフィット(公式)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (30, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Pardus Robin EVO: PF30(BB30RL PF30、公式スペック)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (540, 'bb_standard', 'pf30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Shimano系クランク(105/Ultegra/Dura-Ace/GRX): 24mm HOLLOWTECH II
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (160, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (161, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (162, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (167, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (168, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (169, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (170, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAM DUB系クランク(Force/Rival/RED/Apex)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (163, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (164, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (171, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (172, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (173, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (174, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- FSA Gossamer Pro AGX: BB386EVO 30mmスピンドル(公式)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (165, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Campagnoloクランク(Chorus/Record/Super Record Wireless): Ultra-Torque(公式)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (166, 'crank_spindle', 'campagnolo_ultra_torque', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (175, 'crank_spindle', 'campagnolo_ultra_torque', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (176, 'crank_spindle', 'campagnolo_ultra_torque', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Rotor ALDHU Carbon / VEGAST: ストレート30mmスピンドル
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (177, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (178, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
