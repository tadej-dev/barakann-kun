-- 誤登録されていた規格値を修正する
-- Rival XPLR E1は13速のため、12速の登録を修正する(SRAM公式仕様)
PRAGMA foreign_keys = ON;

UPDATE part_specifications SET spec_value = '13'
WHERE part_id = 392 AND spec_key = 'drivetrain_speed';
