-- 付属品の重量を完成重量へ加算できるよう保持する
PRAGMA foreign_keys = ON;

-- 重量未調査の付属品は0のまま加算対象外とし、判明分だけUPDATEで登録する
ALTER TABLE part_included_items
    ADD COLUMN weight INTEGER NOT NULL DEFAULT 0
        CHECK (weight >= 0);
