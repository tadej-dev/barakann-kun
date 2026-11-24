import { mkdirSync, rmSync } from "node:fs"
import path from "node:path"

// apiディレクトリ（PlaywrightのwebServerがapiをcwdに実行する）
const API_DIR = process.cwd()
// E2E専用D1の永続化先（apiディレクトリ基準）
const E2E_PERSIST_TO = ".wrangler/e2e"
// wrangler devが静的アセットを要求するため、空のdistの用意
const FRONTEND_DIST = "../frontend/dist"

// api以外から実行された場合は、誤った場所を削除しないよう停止
if (!API_DIR.endsWith(`${path.sep}api`)) {
    throw new Error(`E2E用DBの初期化はapiディレクトリから実行してください: ${API_DIR}`)
}

// 削除対象のE2E専用D1ディレクトリ
const persistDir = path.resolve(API_DIR, E2E_PERSIST_TO)
// api直下のE2E専用ディレクトリと一致するか確認
const expectedPersistDir = path.resolve(API_DIR, ".wrangler", "e2e")

// 削除対象がE2E専用ディレクトリ以外なら停止
if (persistDir !== expectedPersistDir) {
    throw new Error(`E2E用DBの削除先が想定と異なります: ${persistDir}`)
}

rmSync(persistDir, { recursive: true, force: true })
mkdirSync(path.resolve(API_DIR, FRONTEND_DIST), { recursive: true })

console.log(`[E2E] D1の永続化先を初期化: ${persistDir}`)
