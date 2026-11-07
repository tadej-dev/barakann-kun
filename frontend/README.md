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

## テストの配置

テストは`test/`に置き、`src/`のパスをそのまま反映します（例: `src/features/simulator/partCompatibility.ts`のテストは`test/features/simulator/partCompatibility.test.ts`）。

`test/api/`は、`src/api/`にある**フロントエンド用のAPIクライアント**（`/api`を呼ぶfetch関数とレスポンス検証）のテストです。バックエンド（Cloudflare Workers + Hono）はリポジトリ直下の`api/`にあり、そのテストは`api/test/`に置いています。同じ`api`という名前が別の対象を指すため、`test/api/`のテストは画面から呼ぶクライアント側だと読み替えてください。

画面コンポーネントのテストは`test/components/`に置き、`src/components/`と同じ階層で作成します。DOMが必要なテストはファイル先頭に`// @vitest-environment jsdom`を書き、`afterEach(cleanup)`で後始末します。他のテストはnode環境のまま動きます。
