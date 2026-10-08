-- Argon 18 Sum Pro Frameset / Argon 18 Sum Frameset をマスターデータから削除する
-- 理由:
--   両機種はシートポストカテゴリ(category_id 19)を専用パーツとして占有しているが、
--   同梱される専用シートポストの重量を示す出典が見つからなかった(2026-10-08調査)。
--   公式サイト(argon18bike.com)のスペック表に重量の記載はなく、
--   road.cc・roadbikeaction.com・Weight Weeniesフォーラムなどのレビュー記事でも
--   フレーム本体やバイク全体の重量は記載があるが、シートポスト単体の重量はなかった。
--   AGENTS.mdの方針で、出典が無い値は推測で埋めず、見つからない場合は登録しないため、
--   利用者の指定でフレーム自体を削除する。
--   関連する規格・付属品・占有カテゴリは ON DELETE CASCADE で併せて消える。
--   両機種は保存ビルドから参照されていないため削除できる(2026-10-08確認)。
PRAGMA foreign_keys = ON;

DELETE FROM parts
WHERE brand_id = 59
  AND name IN ('Argon 18 Sum Pro Frameset', 'Argon 18 Sum Frameset');
