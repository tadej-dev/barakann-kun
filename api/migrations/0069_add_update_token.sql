-- 競合した更新でパーツが消えないようにする(issue #135)
-- 目的:
--   更新バッチの「自分の更新が適用されたか」を一意なトークンで判定する。
--   従来は version と updated_at(ミリ秒) で判定していたため、
--   同一ミリ秒に別の更新があると自分の更新と誤認していた。
-- 方式:
--   パーツを置き換える更新のたびに saved_builds.update_token へ新しいUUIDを書き、
--   パーツの削除・登録はそのトークンが一致する場合だけ実行する。
ALTER TABLE saved_builds ADD COLUMN update_token TEXT;
