-- TTバイク(BMC Speedmachine 01 MOD Frameset)をマスターデータから削除する
-- 理由:
--   本アプリのマスタデータはロードバイクを対象とし、TTバイクは登録しない方針とする
--   (利用者の指定 2026-10-05)。
--   関連する規格・付属品・占有カテゴリは ON DELETE CASCADE で併せて消える。
--   Speedmachine は保存ビルドから参照されていないため削除できる。
PRAGMA foreign_keys = ON;

DELETE FROM parts
WHERE brand_id = 11
  AND name = 'BMC Speedmachine 01 MOD Frameset';
