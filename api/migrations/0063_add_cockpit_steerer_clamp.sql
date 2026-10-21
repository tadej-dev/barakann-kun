-- コックピットのコラムクランプ径(steerer_clamp_mm)を登録する
-- 目的:
--   コックピットの適合判定を、コックピット規格(形状)だけでなくコラム径でも行う。
--   フレーム側の steerer_standard から上端のコラム径を引き、ステム/一体型ハンドルの
--   クランプ径と比較する。丸型1-1/8インチのコラム(28.6mm)に1-1/4インチ用(31.8mm)の
--   ステムを選ぶような取り違えを止めるため。
-- 方針:
--   - 値は「コラムをクランプする径(mm)」を入れる。ハンドルバーのクランプ径
--     (handlebar_clamp_mm)とは別の規格。
--   - ステムと、ステムを兼ねる一体型ハンドルだけを対象にする。通常のハンドルは
--     ステムにクランプされるため対象外。
--   - 既存の cockpit_interface が standard_1_1_8(1-1/8インチ規格)の製品は、
--     1-1/8インチ=28.6mm として登録する。専用形状の製品は径の比較対象外のため登録しない。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象の規格を先に消す。
DELETE FROM part_specifications
WHERE spec_key = 'steerer_clamp_mm'
  AND part_id IN (
    SELECT id FROM parts
    WHERE category_id IN (
        SELECT id FROM categories WHERE key IN ('stem', 'handlebar')
      )
  );

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, 'steerer_clamp_mm', '28.6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('Deda Zero100 Stem 100mm'),
    ('Deda Superleggero Stem 100mm'),
    ('PRO Vibe Stem 100mm'),
    ('Zipp Service Course SL Stem 100mm'),
    ('Ritchey WCS C260 Stem 100mm'),
    ('3T ARX II Pro Stem 100mm'),
    ('ENVE Aero Road Stem 100mm'),
    ('FSA SL-K Stem 100mm'),
    ('Black Inc Road Stem 100mm'),
    ('ENVE In-Route Aero Road Stem 100mm'),
    ('Zipp SL Sprint Stem 100mm'),
    ('Easton EA90 Stem 100mm'),
    ('Ritchey WCS Toyon Stem 100mm'),
    ('Deda Superbox Stem 100mm'),
    ('PRO PLT Stem 100mm'),
    ('FSA NS ACR Stem 100mm'),
    ('Deda Alanera RS Integrated Handlebar 42x100mm'),
    ('PRO Vibe Evo Integrated Handlebar 42x105mm'),
    ('Roval Rapide Cockpit 420x100mm'),
    ('Bontrager RSL Aero Road Integrated Handlebar Stem 42x100mm'),
    ('Black Inc HB04 Integrated Barstem 38x100mm'),
    ('Black Inc AB02 Integrated Aero Barstem 38x100mm'),
    ('PRO Vibe Evo Integrated Handlebar 38x100mm'),
    ('Roval Rapide Cockpit 400x100mm'),
    ('ENVE SES AR One-Piece Handlebar 42x120mm')
) AS v
JOIN parts p
  ON p.name = v.column1
 AND p.category_id IN (SELECT id FROM categories WHERE key IN ('stem', 'handlebar'));
