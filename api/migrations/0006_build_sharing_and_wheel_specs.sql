-- 保存構成の読み取り専用共有とホイール側の適合判定に必要な規格
PRAGMA foreign_keys = ON;

-- NULLの間は非公開とし、推測困難なトークンを発行した構成だけ公開する
ALTER TABLE saved_builds
    ADD COLUMN share_token TEXT
        CHECK (share_token IS NULL OR length(share_token) = 32);

CREATE UNIQUE INDEX idx_saved_builds_share_token
    ON saved_builds(share_token)
    WHERE share_token IS NOT NULL;

-- 現行カタログのロード用ディスクホイールはすべて700C・センターロック仕様
-- 既存環境と新規環境のどちらでも重複しないよう未登録規格だけ補完する
INSERT INTO part_specifications (
    part_id,
    spec_key,
    spec_value,
    created_at,
    updated_at
)
SELECT parts.id,
       'wheel_diameter',
       '700C',
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM parts
JOIN categories ON categories.id = parts.category_id
WHERE categories.key = 'wheel'
  AND NOT EXISTS (
      SELECT 1
      FROM part_specifications
      WHERE part_specifications.part_id = parts.id
        AND part_specifications.spec_key = 'wheel_diameter'
  );

INSERT INTO part_specifications (
    part_id,
    spec_key,
    spec_value,
    created_at,
    updated_at
)
SELECT parts.id,
       'rotor_mount',
       'center_lock',
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM parts
JOIN categories ON categories.id = parts.category_id
WHERE categories.key = 'wheel'
  AND NOT EXISTS (
      SELECT 1
      FROM part_specifications
      WHERE part_specifications.part_id = parts.id
        AND part_specifications.spec_key = 'rotor_mount'
  );
