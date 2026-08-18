# Hono API / React SPA

Cloudflare WorkersとD1で動作するロードバイクパーツ取得APIと、
React SPAを同一Worker・同一オリジンで配信します。

- `GET /api/health`
- `GET /api/categories`
- `GET /api/parts?category=frame`
- `GET /api/parts/by-ids?ids=1&ids=2`
- `GET /api/auth/session`
- `GET /api/auth/google`
- `POST /api/auth/logout`
- `DELETE /api/account`
- `GET /api/builds`
- `POST /api/builds`
- `GET /api/builds/:id`
- `PUT /api/builds/:id`
- `DELETE /api/builds/:id`
- `GET /api/config-slots`
- `PATCH /api/config-slots/:id`
- `PUT /api/config-slots/:id`
- `DELETE /api/config-slots/:id`
- `GET /api/config-order`
- `PUT /api/config-order`

## ローカル起動

プロジェクト全体を初めて起動する場合は、ルートディレクトリで
依存関係とローカルD1を準備します。

```bash
cd /Users/wcyt/Develop/barakann-kun
npm ci
npm run setup
```

ReactとHonoを同時に起動します。

```bash
npm run dev
```

Honoだけを起動する場合はAPIディレクトリで実行します。

```bash
cd /Users/wcyt/Develop/barakann-kun/api
npm run dev
```

APIは`http://localhost:8787`で起動します。

Reactの開発画面は`http://localhost:5173`で表示します。

### ローカル認証設定

認証APIをローカルで利用する場合は、`api/.dev.vars.example`を参考に
`api/.dev.vars`を作成します。`.dev.vars`はGitへコミットしないローカル専用ファイルです。

`AUTH_SECRET`は次のコマンドで生成できます。

```bash
openssl rand -hex 32
```

Googleログインを利用するには、Google Cloud ConsoleでOAuthクライアントを作成し、
次の値を`api/.dev.vars`へ設定します。

```env
AUTH_URL=http://localhost:5173
GOOGLE_CLIENT_ID=GoogleのクライアントID
GOOGLE_CLIENT_SECRET=Googleのクライアントシークレット
```

Google側の承認済みリダイレクトURIは次のとおりです。

```text
http://localhost:5173/api/auth/callback/google
```

設定変更後は、`npm run dev`を再起動してください。

設定値を確認する場合は、次のコマンドを実行します。値そのものは表示しません。

```bash
npm run check:local-auth
```

フロントエンドはGoogle OAuthのコールバック先と一致するよう、`http://localhost:5173`
以外のポートでは起動しません。5173番ポートを別のプロセスが使用している場合は、先に終了してください。

### 実GoogleアカウントとローカルD1の確認

Google Cloud Consoleでローカル用のOAuthクライアントを作成し、OAuth同意画面のテストユーザーへ
確認に使うGoogleアカウントを追加します。設定値を`api/.dev.vars`へ保存した後、次の順番で起動します。

```bash
npm run check:local-auth
npm run db:migrate:local
npm run dev
```

ブラウザで`http://localhost:5173/simulator`を開き、次の項目を確認します。

- 未ログイン時は保存構成パネルが表示されない
- ヘッダーのGoogleログインからGoogleへ遷移し、`/api/auth/callback/google`を経由して戻る
- ログイン後に`/api/auth/session`がユーザー情報を返す
- 構成1〜4の選択パーツを選択変更後に自動保存し、名前変更・クリアができる
- 追加した名前付き構成を一覧表示し、並び替え・名前変更・削除ができる
- ログアウト後に保存構成パネルが非表示になる
- ブラウザを再読み込みしてもD1へ保存した構成を取得できる

Google Cloud Consoleの認証情報や`api/.dev.vars`の内容は、リポジトリへ追加したりチャットへ貼り付けたりしないでください。

## テストと型検査

```bash
npm test
npm run typecheck
```

Reactを含む本番用ファイルを作成する場合は、APIディレクトリから
次のコマンドを実行できます。

```bash
npm run build
```

## D1マイグレーション

- `0001_initial_schema.sql`: D1用テーブルとインデックス
- `0002_seed_master_data.sql`: カテゴリー・ブランド・パーツのマスターデータ
- `0003_auth_and_saved_builds.sql`: 認証・セッション・ユーザーごとの保存構成
- `0004_config_slots.sql`: 構成1〜4の固定スロットと選択パーツ
- `0005_config_order.sql`: 固定・追加構成の表示順

`0003`では、次のテーブルを追加します。

- `users`: アプリ内ユーザー
- `auth_accounts`: Googleなどの認証プロバイダーとの紐付け
- `sessions`: トークンハッシュと有効期限を持つセッション
- `saved_builds`: ユーザーが保存した構成
- `saved_build_parts`: 構成内のスロット、パーツID、保存時の価格・重量

`0004`では`saved_builds.config_slot`と固定構成用の一意インデックスを追加します。
`0005`では、固定構成と追加構成の表示順を保存する`saved_build_orders`を追加します。

## 認証API

Google認証の実処理はAuth.js標準エンドポイントへ委譲しています。

- `GET /api/auth/google`: Googleログイン画面への入口
- `GET /api/auth/google/callback`: Googleからの戻り先（Auth.jsへ転送）
- `POST /api/auth/signin/google`: CSRFトークン付きでGoogle認証を開始する標準エンドポイント
- `GET /api/auth/session`: `{authenticated, user}`形式のログイン状態
- `POST /api/auth/logout`: CSRFトークンを検証してセッションを削除

認証設定が不足している場合、認証APIは`503`と
`AUTH_NOT_CONFIGURED`を返します。ローカルでは`api/.dev.vars`へ
必要な値を設定してから開発サーバーを再起動してください。

Auth.js標準の`/api/auth/signin/google`、`/api/auth/callback/google`、
`/api/auth/signout`も利用できます。セッションCookieの値はD1へ直接保存せず、
SHA-256ハッシュのみを`sessions.token_hash`へ保存します。

Googleプロバイダーは認可・トークン・UserInfoエンドポイントを明示したOAuth 2.0設定です。
Googleの認可レスポンスで`iss`が欠落する場合にも対応しつつ、stateとPKCEの検証は維持します。

## アカウント削除API

`DELETE /api/account`はログイン中の本人のアカウントを削除します。
リクエスト本文には、先に`GET /api/auth/csrf`で取得したCSRFトークンを渡します。

```json
{
  "csrfToken": "取得したCSRFトークン"
}
```

削除時には、ユーザー情報、Googleアカウント紐付け、全セッション、保存構成、
保存構成内のパーツが削除されます。ブラウザのlocalStorageにある構成は削除しません。
削除成功時は`204`、CSRFトークン不正時は`403`を返します。

## 保存構成API

保存構成APIはログイン済みユーザー専用です。自分のユーザーIDに紐づく構成だけを
取得・更新・削除できます。

作成・更新のリクエスト本文は次の形式です。
変更系API（作成・更新・削除）では、先に`GET /api/auth/csrf`で取得した
`csrfToken`も本文へ含めます。

```json
{
  "name": "週末用ロードバイク",
  "csrfToken": "取得したCSRFトークン",
  "parts": [
    {"slotKey": "frame", "partId": 1},
    {"slotKey": "tire:front", "partId": 2}
  ]
}
```

更新時は、取得した`version`を本文へ追加します。

```json
{
  "name": "更新した構成",
  "version": 1,
  "csrfToken": "取得したCSRFトークン",
  "parts": []
}
```

`version`が現在の値と異なる場合、更新・削除は`409 SAVED_BUILD_CONFLICT`を返します。
保存時の価格・重量は、リクエスト値ではなくD1の`parts`マスターから取得して保存します。
パーツ一覧の取得・保存・更新は、すべてログインユーザー単位で分離されます。

削除時の本文は次の形式です。

```json
{
  "version": 1,
  "csrfToken": "取得したCSRFトークン"
}
```

フロントエンドでは、ログイン後にlocalStorageへ残っている構成を検出し、
ユーザーの確認後に構成ごとにこのAPIへ登録します。空の構成は登録せず、
移行済みの構成はブラウザ内の移行記録で二重登録を防ぎます。
移行に失敗した場合もlocalStorageの構成は削除せず、再試行できる状態を保ちます。
前後スロットは`tire:front`、`tire:rear`のようにカテゴリーと位置を`:`で区切ります。

ローカルD1へ適用する場合は次を実行します。

```bash
npm run db:migrate:local
```

Cloudflare上にD1を作成した後は、`wrangler.jsonc`の`database_id`を、
`wrangler d1 create barakann-kun`で発行されたIDへ置き換えます。
その後、リモートD1へマイグレーションを適用します。

```bash
npm run db:migrate:remote
```

リモートD1への適用はCloudflare上のデータを変更するため、
対象データベースとバックアップを確認してから実行してください。

## Google本番設定

本番ドメインを`https://example.com`とした場合、Google Cloud ConsoleのOAuthクライアントへ
次の承認済みURIを登録します。

```text
承認済みのJavaScript生成元: https://example.com
承認済みのリダイレクトURI: https://example.com/api/auth/callback/google
```

`AUTH_URL`は`/api/auth`を含めず、WorkerとReact SPAを配信する本番オリジンだけを設定します。
ローカルの`http://localhost:5173`と本番ドメインの設定を混在させないでください。

## Cloudflareへデプロイ

Cloudflareへ初めて登録する場合は、APIディレクトリでログイン状態を確認します。

```bash
cd /Users/wcyt/Develop/barakann-kun/api
npx wrangler login
npx wrangler whoami
```

次にD1を作成し、表示されたIDを`wrangler.jsonc`の`database_id`へ設定します。
`npm run deploy`には設定チェックがあり、初期値のダミーIDのままでは停止します。

```bash
npx wrangler d1 create barakann-kun
```

本番の認証値は、リポジトリへ書き込まずCloudflare Secretへ登録します。
各コマンド実行時に値の入力を求められます。

```bash
npx wrangler secret put AUTH_SECRET
npx wrangler secret put AUTH_URL
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

`AUTH_SECRET`は次のように本番専用のランダム値を生成します。

```bash
openssl rand -hex 32
```

Secret登録後、リモートD1へマイグレーションを適用し、Workerをデプロイします。

```bash
npm run db:migrate:remote
npm run deploy
```

デプロイ後は、次の項目を確認します。

- `https://example.com/api/health`が`{"status":"ok"}`を返す
- Googleログインから`/api/auth/callback/google`へ戻れる
- `/api/auth/session`でログイン状態を取得できる
- 構成保存・アカウント削除のCSRF検証が通る
- `npx wrangler tail`でSecretの値をログ出力していない

`npm run deploy`では先にReactをビルドし、Hono Workerと
`frontend/dist`の静的ファイルをまとめてデプロイします。

- `/api`と`/api/*`: Hono Worker
- `/assets/*`: Reactの静的アセット
- `/simulator`などの画面URL: `index.html`へフォールバック
