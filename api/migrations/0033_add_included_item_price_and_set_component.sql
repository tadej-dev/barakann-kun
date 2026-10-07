-- 付属品へ参考価格と「セット構成品」の区別を追加する
-- 理由:
--   コンポセットの構成パーツ(レバー・ディレイラーなど)を付属品として登録し、
--   選択済みパーツ表の占有行へ名前・重量・参考価格を表示するため。
--   既存の付属品(フレーム付属のシートポストなど)は重量を完成重量へ加算するが、
--   セット構成品の重量はセット本体の重量に含まれるため、加算すると二重計算になる。
PRAGMA foreign_keys = ON;

-- 単品のメーカー希望小売価格(税込・円)。表示専用で合計金額には加算しない。未調査はNULL
ALTER TABLE part_included_items
    ADD COLUMN price INTEGER
        CHECK (price IS NULL OR price >= 0);

-- 1: セット構成品(重量・価格はセット本体に含まれるため加算しない)
-- 0: 従来の付属品(重量を完成重量へ加算する)
ALTER TABLE part_included_items
    ADD COLUMN is_set_component INTEGER NOT NULL DEFAULT 0
        CHECK (is_set_component IN (0, 1));
