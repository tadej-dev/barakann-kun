-- 重複登録された製品を統合する
-- Bontrager Aeolus RSL 51 TLR Disc Wheelset が id127 / id576 の2行で登録されていた。
-- 現行価格(前後セット ¥369,800 / 税込)と説明文を持つ id576 を正とし、id127 を削除する。
-- 出典: 販売店価格(アスリートカンパニー等) ¥369,800、単品は ¥169,900。
-- id127 は旧価格(¥399,000)かつ model_name の表記も不統一だったため統合する。
PRAGMA foreign_keys = ON;

-- 万一保存構成が旧IDを参照していても壊れないよう、正IDへ付け替える。
UPDATE saved_build_parts SET part_id = 576 WHERE part_id = 127;

-- id127 を削除する(付随する規格・付属情報は ON DELETE CASCADE で消える)。
DELETE FROM parts WHERE id = 127;
