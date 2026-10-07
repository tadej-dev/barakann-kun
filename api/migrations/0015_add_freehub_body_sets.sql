-- ホイールの対応フリーボディを集合で登録する
-- 対応規格が複数ある場合はカンマ区切りにし、集合交差で適合判定する
-- 価格・重量と同様、メーカー公表の対応フリーボディに基づく
PRAGMA foreign_keys = ON;

-- SHIMANO HG / SRAM XDR / Campagnolo N3W の3規格に対応するホイール
-- (Fulcrum, Mavic, Zipp, DT Swiss, ENVE SES)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (94, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (95, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (96, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (97, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (98, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (106, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (107, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (108, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (109, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (110, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (111, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (112, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (113, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (114, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (115, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (116, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (542, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (543, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (544, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (545, 'freehub_body', 'shimano_hg,sram_xdr,campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SHIMANO HG のみに対応するホイール(Shimano純正)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (93, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (100, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (101, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (102, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (103, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (104, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (105, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Campagnolo N3W のみに対応するホイール(Campagnolo純正)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES (99, 'freehub_body', 'campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
