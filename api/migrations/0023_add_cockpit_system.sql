-- フレームのコックピット「システムタグ」と「交換可否」を追加する
-- 目的: 車種ごとに異なる cockpit_interface 名とは別に、共通のルーティングシステム単位で
--       サードパーティ製コックピット(例: EXS AEROVER)との適合を判定できるようにする。
-- 出典:
--   FSA ACR         : FSA ACR(オープン規格)。Merida などライセンス採用車種が存在する。
--   Deda DCR        : Deda Elementi DCR 互換スペーサー適合表(車種別スペーサー DTSP850x)
--   FOCUS C.I.S.    : Focus 公式(C.I.S. 採用車はベアリングキャップ交換で他社ステム可)
--   LOOK Aero Combo : LOOK 795 Blade RS は標準丸型コルムで他社バー/ステム可
--   Orbea ICR       : Orbea HS01 アダプタで標準ステム可
-- 交換可否(cockpit_replaceable):
--   コックピット付属フレームのうち、システムタグを持ちサードパーティ品が存在する車種のみ true。
--   付属コックピットを外して規格適合品へ交換する選択を許可する。
PRAGMA foreign_keys = ON;

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES
    -- 標準 1-1/8 コラム車
    (5,   'cockpit_system', 'standard_1_1_8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (6,   'cockpit_system', 'standard_1_1_8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (18,  'cockpit_system', 'standard_1_1_8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (19,  'cockpit_system', 'standard_1_1_8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (20,  'cockpit_system', 'standard_1_1_8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (30,  'cockpit_system', 'standard_1_1_8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (368, 'cockpit_system', 'standard_1_1_8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (533, 'cockpit_system', 'standard_1_1_8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (541, 'cockpit_system', 'standard_1_1_8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- FSA ACR システム
    (13,  'cockpit_system', 'fsa_acr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (538, 'cockpit_system', 'fsa_acr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- 単独システム
    (536, 'cockpit_system', 'focus_cis', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (363, 'cockpit_system', 'look_aero_combo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (28,  'cockpit_system', 'orbea_icr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Deda DCR システム(車種別 cockpit_interface をまとめる)
    (2,   'cockpit_system', 'deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (4,   'cockpit_system', 'deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (10,  'cockpit_system', 'deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (11,  'cockpit_system', 'deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (12,  'cockpit_system', 'deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (14,  'cockpit_system', 'deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (15,  'cockpit_system', 'deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (16,  'cockpit_system', 'deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (17,  'cockpit_system', 'deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (25,  'cockpit_system', 'deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (26,  'cockpit_system', 'deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (29,  'cockpit_system', 'deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- コックピット付属かつ DCR 対応の車種は、付属コックピットの交換を許可する。
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES
    (4,  'cockpit_replaceable', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (10, 'cockpit_replaceable', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (11, 'cockpit_replaceable', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (14, 'cockpit_replaceable', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (17, 'cockpit_replaceable', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (25, 'cockpit_replaceable', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (29, 'cockpit_replaceable', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
