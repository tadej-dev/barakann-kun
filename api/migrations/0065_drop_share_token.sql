-- 共有機能を削除する(issue #110)
-- 目的:
--   構成の読み取り専用共有を使わないため、共有トークンの列とインデックスを削除する。
-- テーブルを作り直す理由:
--   share_token は UNIQUE インデックスを持つため、SQLiteの ALTER TABLE DROP COLUMN では
--   削除できない。
-- 作り直しで保存済みの構成が消えないようにする手順:
--   D1は外部キーが常に有効で、DROP TABLE saved_builds を実行すると、ON DELETE CASCADEにより
--   子テーブル(saved_build_parts)の行も削除される。0062 と同じく、子テーブルを退避してから
--   作り直し、消えた行を戻す。
--   saved_builds に依存するテーブルは saved_build_parts だけ(pragma_foreign_key_listで確認)。
-- 本番への反映順:
--   この変更を含むアプリを先にデプロイしてから、このマイグレーションを適用する。
--   旧アプリはshare_tokenを読み込むため、先に適用すると旧アプリの構成取得が失敗する
--   (データは失われない)。
--   念のため、適用前に本番DBをバックアップする(wrangler d1 export)。

PRAGMA defer_foreign_keys = on;

-- 1) 子テーブルを退避する(CREATE TABLE ... AS は列の並びをそのまま保つ)
CREATE TABLE backup_saved_build_parts AS SELECT * FROM saved_build_parts;

-- 2) 共有トークンを持たない saved_builds を作り、値を引き継ぐ
CREATE TABLE saved_builds_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL
        CHECK (length(trim(name)) BETWEEN 1 AND 100),
    version INTEGER NOT NULL DEFAULT 1
        CHECK (version > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    config_slot TEXT
        CHECK (config_slot IS NULL OR config_slot IN ('1', '2', '3', '4')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO saved_builds_new (
    id, user_id, name, version, created_at, updated_at, config_slot
)
SELECT id, user_id, name, version, created_at, updated_at, config_slot
FROM saved_builds;

-- 3) 古いテーブルを置き換える(外部キーは「saved_builds」という名前で参照しているため、
--    新しいテーブルを指すようになる)
DROP TABLE saved_builds;
ALTER TABLE saved_builds_new RENAME TO saved_builds;

-- 4) 索引を作り直す(共有トークンの索引は作らない)
CREATE INDEX idx_saved_builds_user_id_updated_at
    ON saved_builds(user_id, updated_at DESC);
CREATE UNIQUE INDEX idx_saved_builds_user_config_slot
    ON saved_builds(user_id, config_slot)
    WHERE config_slot IS NOT NULL;

-- 5) DROP TABLEで消えた子テーブルの行を戻し、退避用の一時テーブルを削除する
INSERT OR IGNORE INTO saved_build_parts SELECT * FROM backup_saved_build_parts;
DROP TABLE backup_saved_build_parts;

PRAGMA defer_foreign_keys = off;
