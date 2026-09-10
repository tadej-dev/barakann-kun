-- 規格未登録だったボトムブラケットのシェル規格と対応アクスルを登録する
-- シェル・アクスルとも製品名・メーカー公式仕様から確定できるもののみ対象とする
-- Praxis M30は30/28mm段付きアクスルのため、ストレート30mmとの誤判定を避けてシェルのみ登録する
PRAGMA foreign_keys = ON;

-- Shimano Dura-Ace SM-BB9200-41B: BB86圧入・24mmアクスル
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (297, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (297, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Shimano Ultegra SM-BBR60: BSAねじ切り・24mmアクスル
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (298, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (298, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Shimano BB-RS501: BSAねじ切り・24mmアクスル
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (299, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (299, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAM DUB BSA: BSAねじ切り・DUBアクスル
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (300, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (300, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAM DUB PressFit 86.5: BB86圧入(41mm/86.5mm)・DUBアクスル
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (301, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (301, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Campagnolo Pro-Tech BSA: BSAねじ切り・Pro-Tech対応
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (302, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (302, 'crank_spindle', 'campagnolo_protech', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Rotor BSA 30: BSAねじ切り・ストレート30mmアクスル
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (303, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (303, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Praxis Works M30 BSA: BSAねじ切り(アクスルは30/28mm段付きのため登録しない)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (304, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
