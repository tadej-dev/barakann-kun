-- 構成の「標準枠・追加枠」の区別をなくすための土台(issue #122)
-- 目的:
--   構成を1〜20件の一様なモデルへ移行する。構成1だけを削除不可の「既定の構成」とし、
--   それ以外は削除できるようにする。
-- このマイグレーションで行うこと:
--   saved_builds に is_default 列を追加し、既存の config_slot = '1' の行を既定にする。
--   既定が無いユーザーは、最も古い構成を既定にする。
--   表示順のキーを config:1〜4 / build:<id> から config:<構成ID> へ付け替える。
-- config_slot 列はこの時点では残す:
--   旧アプリ(標準枠API)がまだ参照しているため、APIと画面の移行が終わってから別途削除する。
PRAGMA defer_foreign_keys = on;

-- 1) saved_builds を作り直すため、子テーブルの行を退避する
CREATE TABLE backup_saved_build_parts AS SELECT * FROM saved_build_parts;

-- 2) 既定の構成を表す列を持つ saved_builds を作る
--    既存の config_slot は残し、APIの移行後に削除する
CREATE TABLE saved_builds_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL
        CHECK (length(trim(name)) BETWEEN 1 AND 100),
    version INTEGER NOT NULL DEFAULT 1
        CHECK (version > 0),
    is_default INTEGER NOT NULL DEFAULT 0
        CHECK (is_default IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    config_slot TEXT
        CHECK (config_slot IS NULL OR config_slot IN ('1', '2', '3', '4')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO saved_builds_new (
    id, user_id, name, version, is_default, created_at, updated_at, config_slot
)
SELECT id,
       user_id,
       name,
       version,
       CASE WHEN config_slot = '1' THEN 1 ELSE 0 END,
       created_at,
       updated_at,
       config_slot
FROM saved_builds;

-- 3) 既定の構成が無いユーザーは、最も古い構成を既定にする
UPDATE saved_builds_new
SET is_default = 1
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY user_id
                   ORDER BY created_at, id
               ) AS row_number
        FROM saved_builds_new
        WHERE user_id NOT IN (
            SELECT user_id FROM saved_builds_new WHERE is_default = 1
        )
    )
    WHERE row_number = 1
);

-- 4) 表示順のキーを構成IDへ付け替える(標準枠はその行のIDを使う)
UPDATE saved_build_orders
SET item_key = 'config:' || (
    SELECT saved_builds.id
    FROM saved_builds
    WHERE saved_builds.user_id = saved_build_orders.user_id
      AND 'config:' || saved_builds.config_slot = saved_build_orders.item_key
)
WHERE item_key LIKE 'config:%'
  AND EXISTS (
      SELECT 1
      FROM saved_builds
      WHERE saved_builds.user_id = saved_build_orders.user_id
        AND 'config:' || saved_builds.config_slot = saved_build_orders.item_key
  );

-- 追加枠のキーも同じ形式へ揃える
UPDATE saved_build_orders
SET item_key = 'config:' || substr(item_key, length('build:') + 1)
WHERE item_key LIKE 'build:%';

-- 5) テーブルを置き換える
DROP TABLE saved_builds;
ALTER TABLE saved_builds_new RENAME TO saved_builds;

-- 6) 索引を作り直す(構成の並び順と、既定は1ユーザー1件だけを保証する)
CREATE INDEX idx_saved_builds_user_id_updated_at
    ON saved_builds(user_id, updated_at DESC);
CREATE UNIQUE INDEX idx_saved_builds_default
    ON saved_builds(user_id)
    WHERE is_default = 1;
CREATE UNIQUE INDEX idx_saved_builds_user_config_slot
    ON saved_builds(user_id, config_slot)
    WHERE config_slot IS NOT NULL;

-- 7) 退避した子テーブルの行を戻す
INSERT OR IGNORE INTO saved_build_parts SELECT * FROM backup_saved_build_parts;
DROP TABLE backup_saved_build_parts;

PRAGMA defer_foreign_keys = off;
