-- カテゴリーに表示順(sort_order)を追加し、ボトムブラケットをブレーキキャリパーの直後へ移す
-- 理由:
--   これまでは表示順をカテゴリーのID順で決めていたため、IDを変えずに並びを変える手段がなかった。
--   コンポセットを選ぶと、レバー〜チェーンとブレーキキャリパーが占有される。
--   単体で選ぶボトムブラケットがその間に挟まっていたため、キャリパーの直後へ移して
--   占有される行と単体で選ぶ行(BB・パッド・ローター)を分ける。
PRAGMA foreign_keys = ON;

-- 既存の並びを保つため、ID×10を初期値にする(間に差し込めるよう10刻みにする)。
ALTER TABLE categories
    ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE categories
SET sort_order = id * 10;

-- ボトムブラケットを、ブレーキキャリパーとブレーキパッドの間へ移す。
UPDATE categories
SET sort_order = (SELECT sort_order FROM categories WHERE key = 'brake_caliper') + 5
WHERE key = 'bottom_bracket';
