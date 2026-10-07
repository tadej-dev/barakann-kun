-- フリーボディ違いで分割していた同一ホイールを1製品へ統合する
-- 小さいIDを残し、大きいIDを参照する保存構成を先に付け替えてから削除する
-- (saved_build_parts.part_id は ON DELETE RESTRICT のため順序が重要)
PRAGMA foreign_keys = ON;

-- Elitewheels Drive 50D II Wheelset
UPDATE saved_build_parts SET part_id = 441 WHERE part_id = 442;
UPDATE parts SET name = model_name, variant_name = NULL WHERE id = 441;
UPDATE part_specifications SET spec_value = 'shimano_hg,sram_xdr' WHERE part_id = 441 AND spec_key = 'freehub_body';
DELETE FROM parts WHERE id = 442;

-- Elitewheels Drive SL 48D CS Wheelset
UPDATE saved_build_parts SET part_id = 443 WHERE part_id = 444;
UPDATE parts SET name = model_name, variant_name = NULL WHERE id = 443;
UPDATE part_specifications SET spec_value = 'shimano_hg,sram_xdr' WHERE part_id = 443 AND spec_key = 'freehub_body';
DELETE FROM parts WHERE id = 444;

-- Parcours Strade 49/54 Wheelset
UPDATE saved_build_parts SET part_id = 445 WHERE part_id = 446;
UPDATE parts SET name = model_name, variant_name = NULL WHERE id = 445;
UPDATE part_specifications SET spec_value = 'shimano_hg,sram_xdr' WHERE part_id = 445 AND spec_key = 'freehub_body';
DELETE FROM parts WHERE id = 446;

-- Parcours Ronde 35/39 Wheelset
UPDATE saved_build_parts SET part_id = 447 WHERE part_id = 448;
UPDATE parts SET name = model_name, variant_name = NULL WHERE id = 447;
UPDATE part_specifications SET spec_value = 'shimano_hg,sram_xdr' WHERE part_id = 447 AND spec_key = 'freehub_body';
DELETE FROM parts WHERE id = 448;

-- Black Inc 48|58 Carbon Aero Wheelset
UPDATE saved_build_parts SET part_id = 449 WHERE part_id = 450;
UPDATE parts SET name = model_name, variant_name = NULL WHERE id = 449;
UPDATE part_specifications SET spec_value = 'shimano_hg,sram_xdr' WHERE part_id = 449 AND spec_key = 'freehub_body';
DELETE FROM parts WHERE id = 450;

-- HUNT 54 Aerodynamicist Carbon Disc Wheelset
UPDATE saved_build_parts SET part_id = 451 WHERE part_id = 452;
UPDATE parts SET name = model_name, variant_name = NULL WHERE id = 451;
UPDATE part_specifications SET spec_value = 'shimano_hg,sram_xdr' WHERE part_id = 451 AND spec_key = 'freehub_body';
DELETE FROM parts WHERE id = 452;
