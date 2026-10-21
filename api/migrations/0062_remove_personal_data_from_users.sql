-- ログインで保存していた個人情報(メールアドレス・Googleの名前・プロフィール画像)を削除する
-- 目的(issue #74、2026-10-21):
--   ログイン機能は残したまま、サーバーに保存する個人情報を最小限にする。
--   アプリ側はGoogleからアカウントID(sub)だけを受け取り、名前・メール・画像を保存しない。
-- 変更内容:
--   email・image_url: 列ごと削除する。
--   display_name: 保存済みの名前はすべてGoogle由来のため、仮の名前「ユーザー」に戻す。
--                 利用者は画面から自分で付けた名前に変更できる。
-- usersテーブルを作り直す理由:
--   emailはUNIQUE制約を持つため、SQLiteのALTER TABLE DROP COLUMNでは削除できない。
-- 作り直しで保存済みの構成が消えないようにする手順:
--   D1は外部キーが常に有効で、DROP TABLE users を実行すると、ON DELETE CASCADEにより
--   子テーブル(auth_accounts・sessions・saved_builds・saved_build_parts・saved_build_orders)の
--   行も削除される。PRAGMA defer_foreign_keys を有効にしても削除されることを、
--   データを入れた作業用のローカルD1で確認した(2026-10-21)。
--   そのため、子テーブルを一時テーブルへ退避してから作り直し、消えた行を戻す。
--   usersに依存するテーブルは上記の5つだけ(pragma_foreign_key_listで確認、2026-10-21)。
-- 本番への反映順:
--   この変更を含むアプリを先にデプロイしてから、このマイグレーションを適用する。
--   旧アプリはemail・image_urlを読むため、先に適用すると旧アプリのログインが失敗する。
--   新アプリはemail・image_urlを読まず、新規ユーザーのメール・名前も保存しない。
--   念のため、適用前に本番DBをバックアップする(wrangler d1 export)。

-- 作り直しの途中で、子テーブルの行がusersを一時的に参照できなくなるため、
-- 外部キーの確認をトランザクションの終わりまで遅らせる(最後には必ず整合させる)
PRAGMA defer_foreign_keys = on;

-- 1) usersに依存する子テーブルを退避する(CREATE TABLE ... AS は列の並びをそのまま保つ)
CREATE TABLE backup_auth_accounts AS SELECT * FROM auth_accounts;
CREATE TABLE backup_sessions AS SELECT * FROM sessions;
CREATE TABLE backup_saved_builds AS SELECT * FROM saved_builds;
CREATE TABLE backup_saved_build_parts AS SELECT * FROM saved_build_parts;
CREATE TABLE backup_saved_build_orders AS SELECT * FROM saved_build_orders;

-- 2) メール・画像の列を持たないusersを作り、ユーザーIDと作成日時を引き継ぐ
CREATE TABLE users_new (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL
        CHECK (length(trim(display_name)) BETWEEN 1 AND 100),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO users_new (id, display_name, created_at, updated_at)
SELECT id,
       'ユーザー',
       created_at,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM users;

-- 3) 古いusersを削除し、新しいテーブルをusersにする
--    子テーブルの外部キーは「users」という名前で参照しているため、新しいテーブルを指すようになる
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- 4) DROP TABLEで消えた子テーブルの行を戻す
--    親から順に戻す(saved_build_partsはsaved_buildsを参照するため、saved_buildsの後)。
--    消えていなかった行は OR IGNORE で重複させない。
INSERT OR IGNORE INTO auth_accounts SELECT * FROM backup_auth_accounts;
INSERT OR IGNORE INTO sessions SELECT * FROM backup_sessions;
INSERT OR IGNORE INTO saved_builds SELECT * FROM backup_saved_builds;
INSERT OR IGNORE INTO saved_build_parts SELECT * FROM backup_saved_build_parts;
INSERT OR IGNORE INTO saved_build_orders SELECT * FROM backup_saved_build_orders;

-- 5) 退避用の一時テーブルを削除する
DROP TABLE backup_auth_accounts;
DROP TABLE backup_sessions;
DROP TABLE backup_saved_builds;
DROP TABLE backup_saved_build_parts;
DROP TABLE backup_saved_build_orders;

PRAGMA defer_foreign_keys = off;
