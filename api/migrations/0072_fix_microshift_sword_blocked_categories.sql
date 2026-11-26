-- microSHIFT Sword 2x10 コンポセットのキャリパー占有を解除する(issue #164 の補完)
-- 目的:
--   Swordのセットにはブレーキキャリパーとローターが含まれないため、
--   キャリパー枠を占有したままにすると実体の無いキャリパーが「同梱済み」扱いになる。
-- 出典:
--   BikeRadar「microSHIFT Sword review」(2026-11-25 確認)
--   https://www.bikeradar.com/news/microshift-sword
--   キャリパーとローターはセットに含まれず別売りと記載されている(非公式・計測記事)。
--   その他の構成品の範囲は記事の記載が曖昧なため、同梱品の明細登録時に再確認する。
-- 影響:
--   キャリパーが未選択の必須枠になり、利用者が別途選ぶ正しい構成になる。
--   同梱品の明細(構成品の名称・重量・価格)は別issueで登録する。
DELETE FROM part_blocked_categories
WHERE part_id = 369
  AND category_id = (SELECT id FROM categories WHERE key = 'brake_caliper');
