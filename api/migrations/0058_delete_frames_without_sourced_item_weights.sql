-- 専用パーツの重量の出典が見つからないフレームをマスターデータから削除する
-- 対象: Bianchi Oltre RC / Van Rysel RCR-F Pro Frameset / De Rosa Merak Frameset /
--       CUBE Litening C:68X Frameset / Focus IZALCO MAX 9 Frameset /
--       Corratec CCT TEAM Frameset / X-LAB AD9 Frameset / Pardus Robin EVO Frameset
-- 理由:
--   いずれも専用パーツ(シートポスト・ステム・BB等)でカテゴリを占有しているが、
--   その重量の出典が見つからなかった(2026-10-08調査、公式サイト・販売店・レビュー記事を確認)。
--   詳細:
--     Bianchi Oltre RC: 一体型コックピットの重量は bike24 に409gの記載があったが、
--       原文を直接確認できず(403エラー)、他の販売店(racycles.com)には重量記載が無く、
--       ドロップ寸法もbike24と他サイトで食い違っていたため採用を見送った。
--     Van Rysel RCR-F Pro / De Rosa Merak / Focus IZALCO MAX 9 / X-LAB AD9 / Pardus Robin EVO:
--       各社の仕様書・販売店ページを確認したが、専用パーツの重量記載が無かった。
--     CUBE Litening C:68X: ハンドル(ICR Aero Cockpit Handlebar、450g)は出典付きで
--       登録済みだが、専用シートポストの重量記載が見つからなかった。
--     Corratec CCT TEAM: シートポスト(Aero Seatpost、200g)は出典付きで登録済みだが、
--       専用ステム・BBの型式・重量が公式サイトでも確認できなかった。
--   AGENTS.mdの方針で、出典が無い値は推測で埋めず、見つからない場合は登録しないため、
--   利用者の指定でフレーム自体を削除する(CUBE・Corratecの既存付属品データも含めて削除する)。
--   関連する規格・付属品・占有カテゴリは ON DELETE CASCADE で併せて消える。
--   8機種とも保存ビルドから参照されていないため削除できる(2026-10-08確認)。
PRAGMA foreign_keys = ON;

DELETE FROM parts
WHERE (brand_id = 3 AND name = 'Bianchi Oltre RC')
   OR (brand_id = 62 AND name = 'Van Rysel RCR-F Pro Frameset')
   OR (brand_id = 83 AND name = 'De Rosa Merak Frameset')
   OR (brand_id = 85 AND name = 'CUBE Litening C:68X Frameset')
   OR (brand_id = 86 AND name = 'Focus IZALCO MAX 9 Frameset')
   OR (brand_id = 87 AND name = 'Corratec CCT TEAM Frameset')
   OR (brand_id = 88 AND name = 'X-LAB AD9 Frameset')
   OR (brand_id = 90 AND name = 'Pardus Robin EVO Frameset');
