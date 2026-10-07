# React frontend

React、TypeScript、Viteで構成されたフロントエンドです。
APIは同一オリジンの`/api`へリクエストします。

## ローカル起動

プロジェクトルートからReactとHonoを同時に起動できます。

```bash
cd /Users/wcyt/Develop/barakann-kun
npm run dev
```

ブラウザで`http://localhost:5173`を開きます。
Viteは`/api`へのリクエストをHonoの`http://localhost:8787`へ転送します。

フロントエンドだけを起動する場合は次のコマンドを使用します。

```bash
cd /Users/wcyt/Develop/barakann-kun/frontend
npm run dev
```

## テストとビルド

```bash
npm test
npm run lint
npm run build
```

ビルド結果は`dist/`へ出力されます。
Cloudflare Workersへのデプロイ時は、Hono APIと同じWorkerの静的アセットとして配信されます。
