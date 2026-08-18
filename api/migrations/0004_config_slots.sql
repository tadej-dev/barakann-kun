-- 構成1〜4をユーザーごとの固定スロットとして保存するための拡張。
-- NULLは従来の自由保存構成、1〜4は固定スロットを表す。
PRAGMA foreign_keys = ON;

ALTER TABLE saved_builds
    ADD COLUMN config_slot TEXT
        CHECK (config_slot IS NULL OR config_slot IN ('1', '2', '3', '4'));

-- 同じユーザーが同じ固定スロットを複数作れないようにする。
CREATE UNIQUE INDEX idx_saved_builds_user_config_slot
    ON saved_builds(user_id, config_slot)
    WHERE config_slot IS NOT NULL;
