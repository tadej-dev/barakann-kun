-- Argon 18 Nitrogen(非Pro)のフレーム登録を取り消す
-- 理由:
--   フレーム単体の販売が無く、価格・重量も非公表のため登録対象から外す。
-- 対象:
--   0027 で追加した本体(id 612)。Nitrogen Pro(364)と Sum Pro/Sum は残す。
PRAGMA foreign_keys = ON;

-- 保存構成が旧IDを参照していても削除が止まらないよう、参照行を先に消す。
-- (Nitrogenは直近で追加したばかりで、該当が無ければ何も起きない)
DELETE FROM saved_build_parts
WHERE part_id = 612;

-- 本体を削除する(規格・付属品・占有カテゴリは ON DELETE CASCADE で消える)。
DELETE FROM parts
WHERE id = 612;
