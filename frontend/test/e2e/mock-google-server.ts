/// <reference types="node" />
// E2E用モックサーバーはNodeのHTTPモジュールを使うため、Nodeの型定義を読み込む
import {Buffer} from "node:buffer"
import {createServer} from "node:http"
import type {IncomingMessage, Server, ServerResponse} from "node:http"
import process from "node:process"

const DEFAULT_MOCK_GOOGLE_PORT = 8788 // 既定の待ち受けポート
const MOCK_GOOGLE_HOST = "127.0.0.1" // ローカルのE2Eからだけ接続させる待ち受けアドレス
const MOCK_AUTHORIZATION_CODE = "e2e-code" // 認可レスポンスで返す固定の認可コード
const MOCK_ACCESS_TOKEN = "e2e-token" // トークン応答で返す固定のアクセストークン
const MOCK_TOKEN_TYPE = "Bearer" // トークン種別
const MOCK_EXPIRES_IN_SECONDS = 3600 // アクセストークンの有効期間（秒）

// モックGoogleが返すユーザープロフィール
export type MockGoogleProfile = {
    sub: string // GoogleアカウントID
    name: string // 表示名
    email: string // メールアドレス
}

// 既定のプロフィール（既存テストが使うログインユーザー）
export const DEFAULT_MOCK_PROFILE: MockGoogleProfile = {
    sub: "e2e-user",
    name: "E2E User",
    email: "e2e@example.com",
}

// モックGoogleの切り替え状態
type MockGoogleState = {
    profile: MockGoogleProfile // ユーザー情報応答で返すプロフィール
}

// 起動中のモックGoogleサーバー
export type MockGoogleServer = {
    port: number // 待ち受けポート
    origin: string // 接続先URLの基点
    close: () => Promise<void> // サーバー停止
}

// JSONレスポンスを返す
function sendJson(
    response: ServerResponse,
    status: number,
    body: Record<string, unknown>,
): void {
    const payload = JSON.stringify(body)

    response.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "content-length": Buffer.byteLength(payload),
        "cache-control": "no-store",
    })
    response.end(payload)
}

// 302リダイレクトを返す
function sendRedirect(response: ServerResponse, location: string): void {
    response.writeHead(302, {
        location,
        "cache-control": "no-store",
    })
    response.end()
}

// 認可リクエストをredirect_uriとstateの確認後にコールバックへ戻す
function handleAuthorize(url: URL, response: ServerResponse): void {
    // Google同意画面と同じく、戻り先と改ざん検知用のstateを受け取る
    const redirectUri = url.searchParams.get("redirect_uri")
    const state = url.searchParams.get("state")

    // 必須パラメーターが欠けた場合は認可せず400を返す
    if (!redirectUri || !state) {
        sendJson(response, 400, {error: "invalid_request"})

        return
    }

    try {
        // redirect_uriの既存クエリを保ったまま認可コードとstateを付与
        const location = new URL(redirectUri)
        location.searchParams.set("code", MOCK_AUTHORIZATION_CODE)
        location.searchParams.set("state", state)

        sendRedirect(response, location.toString())
    } catch {
        // redirect_uriがURLとして解釈できない場合は認可せず400を返す
        sendJson(response, 400, {error: "invalid_request"})
    }
}

// トークン交換リクエストへ固定のアクセストークンを返す
function handleToken(request: IncomingMessage, response: ServerResponse): void {
    // 認可コードやPKCE検証値は検証せず、接続を保つために本文を読み捨てる
    request.resume()
    sendJson(response, 200, {
        access_token: MOCK_ACCESS_TOKEN,
        token_type: MOCK_TOKEN_TYPE,
        expires_in: MOCK_EXPIRES_IN_SECONDS,
    })
}

// ユーザー情報取得へ設定中のプロフィールを返す
function handleUserinfo(
    response: ServerResponse,
    state: MockGoogleState,
): void {
    sendJson(response, 200, {...state.profile})
}

// リクエスト本文を読み切って文字列にする
function readRequestBody(request: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        // 受信した本文の断片
        const chunks: Buffer[] = []

        request.on("data", (chunk: Buffer) => {
            chunks.push(chunk)
        })
        request.on("end", () => {
            resolve(Buffer.concat(chunks).toString("utf8"))
        })
        // 通信エラーは本文を解釈できないため呼び出し元へ伝える
        request.on("error", reject)
    })
}

// 空でない文字列か判定
function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.length > 0
}

// 制御リクエストの本文からプロフィールを取り出す
function parseMockGoogleProfile(payload: unknown): MockGoogleProfile | null {
    // オブジェクト以外はプロフィールとして扱えない
    if (typeof payload !== "object" || payload === null) {
        return null
    }

    // 本文のキーを名前で読める形にした値
    const record = payload as Record<string, unknown>

    // sub・name・emailがそろわない場合は設定しない
    if (
        !isNonEmptyString(record.sub) ||
        !isNonEmptyString(record.name) ||
        !isNonEmptyString(record.email)
    ) {
        return null
    }

    return {
        sub: record.sub,
        name: record.name,
        email: record.email,
    }
}

// 制御用リクエストでユーザー情報のプロフィールを設定
async function handleControlUser(
    request: IncomingMessage,
    response: ServerResponse,
    state: MockGoogleState,
): Promise<void> {
    // 本文から取り出したプロフィール（JSONでない場合はnull）
    let profile: MockGoogleProfile | null

    try {
        // 本文のJSONをプロフィールとして解釈
        profile = parseMockGoogleProfile(
            JSON.parse(await readRequestBody(request)) as unknown,
        )
    } catch {
        // 本文がJSONでない場合は設定せず400を返す
        sendJson(response, 400, {error: "invalid_request"})

        return
    }

    // 不正な本文では設定を変えず400を返す
    if (!profile) {
        sendJson(response, 400, {error: "invalid_request"})

        return
    }

    state.profile = profile
    sendJson(response, 200, {...profile})
}

// パスとメソッドごとにモックの応答を振り分ける
async function handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
    state: MockGoogleState,
): Promise<void> {
    // Hostヘッダーに依存せず、request.urlのパスとクエリだけを解析
    const url = new URL(request.url ?? "/", `http://${MOCK_GOOGLE_HOST}`)
    // リクエストのメソッド（未設定はGET扱い）
    const method = request.method ?? "GET"

    // 認可リクエストはブラウザの遷移をアプリのコールバックへ中継
    if (method === "GET" && url.pathname === "/authorize") {
        handleAuthorize(url, response)

        return
    }

    // トークン交換はフォーム本文を受け取って固定トークンを返す
    if (method === "POST" && url.pathname === "/token") {
        handleToken(request, response)

        return
    }

    // ユーザー情報取得は設定中のプロフィールを返す
    if (method === "GET" && url.pathname === "/userinfo") {
        handleUserinfo(response, state)

        return
    }

    // 制御用の設定は次回以降のログインに使うプロフィールを差し替える
    if (method === "POST" && url.pathname === "/__control/user") {
        await handleControlUser(request, response, state)

        return
    }

    // 想定外のリクエストはE2Eの設定誤りに気付けるよう404を返す
    sendJson(response, 404, {error: "not_found"})
}

// 起動ポートを引数・環境変数MOCK_GOOGLE_PORT・既定値の順で決める
function resolveListenPort(port?: number): number {
    // 引数で明示されたポートを最優先
    if (port !== undefined) {
        return port
    }

    // 環境変数MOCK_GOOGLE_PORTの値
    const configuredPort = process.env.MOCK_GOOGLE_PORT

    // 環境変数が未設定なら既定ポート
    if (!configuredPort) {
        return DEFAULT_MOCK_GOOGLE_PORT
    }

    // 環境変数の数値変換結果
    const parsedPort = Number(configuredPort)

    // 数値でない・範囲外・小数は誤設定として起動前に失敗させる
    if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
        throw new Error(
            `MOCK_GOOGLE_PORT must be a port number: ${configuredPort}`,
        )
    }

    return parsedPort
}

// 接続を閉じてからサーバー停止を待つ
function closeServer(server: Server): Promise<void> {
    return new Promise((resolve, reject) => {
        server.close((error) => {
            // 停止できなかった場合は後片付けの失敗として伝える
            if (error) {
                reject(error)

                return
            }

            resolve()
        })
        // キープアライブ接続が残っていても停止が終わるよう全接続を閉じる
        server.closeAllConnections()
    })
}

// PlaywrightのglobalSetupから起動し、待ち受け開始後に接続先を返す
export function startMockGoogleServer(port?: number): Promise<MockGoogleServer> {
    // 待ち受けポート（引数と環境変数で決定）
    const listenPort = resolveListenPort(port)
    // サーバーごとに保持するプロフィールの状態（起動時は既定プロフィール）
    const state: MockGoogleState = {profile: {...DEFAULT_MOCK_PROFILE}}
    // NodeのHTTPサーバー
    const server = createServer((request, response) => {
        // 非同期処理の失敗は応答前なら500、応答後なら接続終了として扱う
        void handleRequest(request, response, state).catch(() => {
            // 応答済みの場合は送信を繰り返さず接続だけ閉じる
            if (response.headersSent) {
                response.end()

                return
            }

            sendJson(response, 500, {error: "mock_server_error"})
        })
    })

    return new Promise((resolve, reject) => {
        // ポート使用中などで待ち受けできなかった場合は呼び出し元へ伝える
        server.once("error", reject)
        server.listen(listenPort, MOCK_GOOGLE_HOST, () => {
            // 起動後はエラー監視を外し、closeの完了だけを待つ
            server.off("error", reject)
            // 実際に待ち受けているポート（0指定時は自動割り当て）
            const address = server.address()
            const boundPort = typeof address === "object" && address !== null
                ? address.port
                : listenPort

            resolve({
                port: boundPort,
                origin: `http://${MOCK_GOOGLE_HOST}:${boundPort}`,
                close: () => closeServer(server),
            })
        })
    })
}
