# Hono API / React SPA

Cloudflare WorkersとD1で動作するロードバイクパーツ取得APIと、
React SPAを同一Worker・同一オリジンで配信します。

- `GET /api/health`
- `GET /api/categories`
- `GET /api/parts?category=frame`
- `GET /api/parts/by-ids?ids=1&ids=2`

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

## Cloudflareへデプロイ

最初にCloudflare上のD1を作成し、`wrangler.jsonc`の
`database_id`を発行されたIDへ置き換えます。
リモートD1へマイグレーションを適用した後、Workerをデプロイします。

```bash
npm run db:migrate:remote
npm run deploy
```

`npm run deploy`では先にReactをビルドし、Hono Workerと
`frontend/dist`の静的ファイルをまとめてデプロイします。

- `/api`と`/api/*`: Hono Worker
- `/assets/*`: Reactの静的アセット
- `/simulator`などの画面URL: `index.html`へフォールバック
