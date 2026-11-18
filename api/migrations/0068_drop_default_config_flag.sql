-- 「既定の構成」の概念を廃止する(issue #122 の仕上げ)
-- 目的:
--   構成は最低1件あればよく、すべて削除した場合は画面側が「構成1」を作り直す。
--   そのため is_default 列と部分ユニーク索引は不要になったので削除する。
-- 作り直す理由:
--   列に CHECK 制約と部分ユニーク索引が付いており、
--   SQLiteの ALTER TABLE DROP COLUMN では削除できない。
PRAGMA defer_foreign_keys = on;

-- 1) 子テーブルの行を退避する
CREATE TABLE backup_saved_build_parts AS SELECT * FROM saved_build_parts;

-- 2) is_default を持たない saved_builds を作り、値を引き継ぐ
CREATE TABLE saved_builds_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL
        CHECK (length(trim(name)) BETWEEN 1 AND 100),
    version INTEGER NOT NULL DEFAULT 1
        CHECK (version > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO saved_builds_new (
    id, user_id, name, version, created_at, updated_at
)
SELECT id, user_id, name, version, created_at, updated_at
FROM saved_builds;

-- 3) テーブルを置き換える
DROP TABLE saved_builds;
ALTER TABLE saved_builds_new RENAME TO saved_builds;

-- 4) 索引を作り直す(既定構成の索引は作らない)
CREATE INDEX idx_saved_builds_user_id_updated_at
    ON saved_builds(user_id, updated_at DESC);

-- 5) 子テーブルの行を戻す
INSERT OR IGNORE INTO saved_build_parts SELECT * FROM backup_saved_build_parts;
DROP TABLE backup_saved_build_parts;

PRAGMA defer_foreign_keys = off;
