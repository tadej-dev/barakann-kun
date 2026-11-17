-- 固定枠(構成1〜4)の概念を廃止する(issue #122 段階4)
-- 目的:
--   構成を1〜20件の一様なモデルへ統合したため、固定枠を表す config_slot 列と
--   それに依存する索引を削除する。is_default は初期構成の目印として残す。
-- 作り直す理由:
--   config_slot には UNIQUE 索引があり、SQLiteの ALTER TABLE DROP COLUMN では削除できない。
PRAGMA defer_foreign_keys = on;

-- 1) 子テーブルの行を退避する
CREATE TABLE backup_saved_build_parts AS SELECT * FROM saved_build_parts;

-- 2) config_slot を持たない saved_builds を作り、値を引き継ぐ
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO saved_builds_new (
    id, user_id, name, version, is_default, created_at, updated_at
)
SELECT id, user_id, name, version, is_default, created_at, updated_at
FROM saved_builds;

-- 3) テーブルを置き換える
DROP TABLE saved_builds;
ALTER TABLE saved_builds_new RENAME TO saved_builds;

-- 4) 索引を作り直す(固定枠の索引は作らない)
CREATE INDEX idx_saved_builds_user_id_updated_at
    ON saved_builds(user_id, updated_at DESC);
CREATE UNIQUE INDEX idx_saved_builds_default
    ON saved_builds(user_id)
    WHERE is_default = 1;

-- 5) 子テーブルの行を戻す
INSERT OR IGNORE INTO saved_build_parts SELECT * FROM backup_saved_build_parts;
DROP TABLE backup_saved_build_parts;

PRAGMA defer_foreign_keys = off;
