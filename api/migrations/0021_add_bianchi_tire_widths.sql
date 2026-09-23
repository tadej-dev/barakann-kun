-- Bianchi フレームの対応タイヤ幅（最大）を追加する
-- 出典: Bianchi 公式フレームセット/ユーザーマニュアル
--   Oltre RC: compatible with 700x30 tire
--   Specialissima RC: Maximum tyre width 32mm
PRAGMA foreign_keys = ON;

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES
    (3, 'max_tire_width_mm', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (17, 'max_tire_width_mm', '32', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
