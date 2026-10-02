-- SHIMANOのコンポセットが占有するカテゴリを、販売店のセット内容に合わせて絞る
-- 理由:
--   ワイズロードの「SHIMANO 105 R7170 Di2 コンポセット」では、ボトムブラケットは含まれず、
--   ディスクローターとブレーキパッドは別売になっている。
--   https://online.ysroad.co.jp/shop/g/g22376527/
--   また、BBはフレームのBB規格、ローターはフレーム・フォークに合わせて選ぶ部品のため、
--   コンポセットで占有すると単体パーツとして選べず、フレームとの適合も判定できない。
-- 対象:
--   ブランドがShimanoのコンポセット(groupset)すべて。
--   他ブランドのコンポセットは、SHIMANOで動作を確認した後に別のマイグレーションで適用する。
-- 補足:
--   重量・価格は今回変更しない(BB・ローター・パッドを含んだ値かどうかは別途確認する)。
PRAGMA foreign_keys = ON;

-- ボトムブラケット・ディスクローター・ブレーキパッドの占有を解除する。
DELETE FROM part_blocked_categories
WHERE part_id IN (
    -- SHIMANOのコンポセットだけを対象にする
    SELECT parts.id
    FROM parts
    JOIN brands ON brands.id = parts.brand_id
    JOIN categories ON categories.id = parts.category_id
    WHERE brands.name = 'Shimano'
      AND categories.key = 'groupset'
)
AND category_id IN (
    -- 解除するカテゴリ
    SELECT id
    FROM categories
    WHERE key IN ('bottom_bracket', 'disc_rotor', 'brake_pad')
);
