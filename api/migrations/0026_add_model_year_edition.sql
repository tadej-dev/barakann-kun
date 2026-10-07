-- 製品の年式・エディション属性を追加し、同一製品の重複登録を防ぐ
-- 目的: 「製品名は同じだが年代(モデルイヤー)や仕様年で差分が出るパーツ」を
--       区別して登録・表示できるようにする。
--   model_year: モデルイヤー(西暦)。未確認は NULL。
--   edition   : 世代・仕様名(例: Gen 7, SL8, 2.0)。未確認は NULL。
PRAGMA foreign_keys = ON;

ALTER TABLE parts ADD COLUMN model_year INTEGER;
ALTER TABLE parts ADD COLUMN edition TEXT;

-- 同一ブランド・同一製品・同一バリエーション・同一世代の重複登録を禁止する。
-- variant_name/model_year/edition が NULL の行も比較できるよう COALESCE で正規化する。
-- (SQLite は UNIQUE 制約で NULL を重複可として扱うため、式インデックスを使う)
CREATE UNIQUE INDEX idx_parts_identity
    ON parts (
        brand_id,
        COALESCE(model_name, name),
        COALESCE(variant_name, ''),
        COALESCE(model_year, 0),
        COALESCE(edition, '')
    );
