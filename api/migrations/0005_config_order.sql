-- 固定構成と追加構成の表示順をユーザー単位で保存する。
PRAGMA foreign_keys = ON;

CREATE TABLE saved_build_orders (
    user_id TEXT NOT NULL,
    item_key TEXT NOT NULL
        CHECK (length(trim(item_key)) BETWEEN 1 AND 200),
    sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, item_key)
);

CREATE UNIQUE INDEX idx_saved_build_orders_user_sort_order
    ON saved_build_orders(user_id, sort_order);
