-- microSHIFTのコンポセットが占有するカテゴリを、SHIMANO(0032)・SRAM/Campagnolo(0035)と同じ内容に絞る
-- 理由:
--   全コンポセットで「BB・ディスクローター・ブレーキパッドは占有しない」方針にそろえる。
--   BBはフレームのBB規格、ローターはフレーム・フォークに合わせて選ぶ部品で、
--   ブレーキパッドも販売店のセット内容では別売のため、コンポセットでは占有しない。
--   参考: https://online.ysroad.co.jp/shop/g/g22376527/
-- 対象:
--   ブランドがmicroSHIFTのコンポセット(groupset)すべて。
-- 補足:
--   重量・価格は今回変更しない。
PRAGMA foreign_keys = ON;

-- ボトムブラケット・ディスクローター・ブレーキパッドの占有を解除する。
DELETE FROM part_blocked_categories
WHERE part_id IN (
    -- microSHIFTのコンポセットだけを対象にする
    SELECT parts.id
    FROM parts
    JOIN brands ON brands.id = parts.brand_id
    JOIN categories ON categories.id = parts.category_id
    WHERE brands.name = 'microSHIFT'
      AND categories.key = 'groupset'
)
AND category_id IN (
    -- 解除するカテゴリ
    SELECT id
    FROM categories
    WHERE key IN ('bottom_bracket', 'disc_rotor', 'brake_pad')
);
