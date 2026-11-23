import type {
    Adapter,
    AdapterAccount,
    AdapterSession,
    AdapterUser,
} from "@auth/core/adapters"

import {DEFAULT_DISPLAY_NAME} from "./display-name"

// usersテーブルの行
// メールアドレスとプロフィール画像は保存しない(0062のマイグレーションで列を削除)
type UserRow = {
    id: string
    display_name: string
}

// sessionsテーブルの行
type SessionRow = {
    id: string
    user_id: string
    token_hash: string
    expires_at: string
    created_at: string
    updated_at: string
}

// auth_accountsテーブルの行
type AccountRow = {
    user_id: string
    provider: string
    provider_account_id: string
}

// sessionsとusersを結合した行
type UserSessionRow = UserRow & {
    session_id: string
    session_user_id: string
    session_token_hash: string
    session_expires_at: string
}

// アカウントIDのハッシュ化に使う秘密鍵が未設定のときのエラー
export const MISSING_ACCOUNT_ID_HASH_SECRET_MESSAGE = "Missing ACCOUNT_ID_HASH_SECRET"

// D1から1行を型付きで取得する共通処理
async function firstRow<T>(
    database: D1Database,
    sql: string,
    parameters: unknown[] = [],
): Promise<T | null> {
    return database.prepare(sql).bind(...parameters).first<T>()
}

// バイト列を16進数の文字列へ変換
function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer), (byte) =>
        byte.toString(16).padStart(2, "0"),
    ).join("")
}

// セッションCookieの値をD1へ保存するためのSHA-256ハッシュを生成
async function hashSessionToken(token: string): Promise<string> {
    // UTF-8に変換したセッショントークン
    const data = new TextEncoder().encode(token)
    // SHA-256で計算したダイジェスト
    const digest = await crypto.subtle.digest("SHA-256", data)

    return toHex(digest)
}

// GoogleなどのアカウントIDを、サーバーだけが知る秘密鍵でHMAC-SHA256ハッシュにする
// DB流出時の突き合わせを防ぎ、同じ入力からは常に同じ値になるためログイン照合に使える
export async function hashProviderAccountId(
    secret: string,
    provider: string,
    providerAccountId: string,
): Promise<string> {
    const encoder = new TextEncoder()
    // 秘密鍵から作るHMAC署名用の鍵
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        {name: "HMAC", hash: "SHA-256"},
        false,
        ["sign"],
    )
    // プロバイダーごとに別の値になるよう、プロバイダー名も含めてハッシュにする
    // 一括置き換えのスクリプト(scripts/hash-account-ids.mjs)も同じ計算方法を使う
    const message = encoder.encode(`${provider}:${providerAccountId}`)
    // プロバイダー名とアカウントIDのHMAC署名
    const signature = await crypto.subtle.sign("HMAC", key, message)

    return toHex(signature)
}

// DBのユーザー行をAuth.jsのユーザー形式へ変換
// Auth.jsの型はemailを文字列で必須にしているため空文字を渡す(メールは保存せず、画面にも返さない)
function toAdapterUser(row: UserRow): AdapterUser {
    return {
        id: row.id,
        name: row.display_name,
        email: "",
        emailVerified: null,
        image: null,
    }
}

// D1を利用するAuth.jsデータベースアダプター
// accountIdHashSecret: アカウントIDのハッシュ化に使う秘密鍵(ACCOUNT_ID_HASH_SECRET)
export function createD1AuthAdapter(
    database: D1Database,
    accountIdHashSecret?: string,
): Adapter {
    // 複数のAdapterメソッドで同じユーザー列を使うためSQLを共有
    const selectUserSql = `
        SELECT id, display_name
        FROM users
    `

    // セッション行を取得する共通SQL
    const selectSessionSql = `
        SELECT id, user_id, token_hash, expires_at, created_at, updated_at
        FROM sessions
    `

    // プロバイダーとアカウントIDで紐付けを検索するSQL
    const selectAccountSql = `
        SELECT user_id, provider, provider_account_id
        FROM auth_accounts
        WHERE provider = ? AND provider_account_id = ?
    `

    // IDからユーザー行を取得しAuth.jsの形式へ変換
    const loadUser = async (id: string): Promise<AdapterUser | null> => {
        // D1のユーザー行をAuth.jsが要求する形式へ変換して返す
        const row = await firstRow<UserRow>(
            database,
            `${selectUserSql} WHERE id = ?`,
            [id],
        )

        return row ? toAdapterUser(row) : null
    }

    // 保存用のアカウントID(ハッシュ値)を作る
    const toStoredAccountId = async (
        provider: string,
        providerAccountId: string,
    ): Promise<string> => {
        // 秘密鍵がないと照合できないため、平文で保存・検索せずに失敗させる
        if (!accountIdHashSecret) {
            throw new Error(MISSING_ACCOUNT_ID_HASH_SECRET_MESSAGE)
        }

        return hashProviderAccountId(accountIdHashSecret, provider, providerAccountId)
    }

    // ハッシュ値でOAuthアカウントを探し、平文の旧行はハッシュへ移行
    const findAccountRow = async (
        provider: string,
        providerAccountId: string,
    ): Promise<AccountRow | null> => {
        // ハッシュ値で保存されたアカウントを探す
        const storedAccountId = await toStoredAccountId(provider, providerAccountId)
        const hashedRow = await firstRow<AccountRow>(
            database,
            selectAccountSql,
            [provider, storedAccountId],
        )

        // ハッシュ化済みのアカウントが見つかった場合は即座に返す
        if (hashedRow) {
            return hashedRow
        }

        // ハッシュ化を導入する前の行は平文のアカウントIDで保存されている
        // 一括置き換え(scripts/hash-account-ids.mjs)の前にログインした場合に備え、
        // 見つかったら即時にハッシュ値へ置き換え、既存ユーザーのデータを引き継ぐ
        const plainRow = await firstRow<AccountRow>(
            database,
            selectAccountSql,
            [provider, providerAccountId],
        )

        // 平文の旧行も無ければ未登録として扱う
        if (!plainRow) {
            return null
        }

        await database.prepare(
            `UPDATE auth_accounts
             SET provider_account_id = ?, updated_at = ?
             WHERE provider = ? AND provider_account_id = ?`,
        ).bind(
            storedAccountId,
            new Date().toISOString(),
            provider,
            providerAccountId,
        ).run()

        return {
            ...plainRow,
            provider_account_id: storedAccountId,
        }
    }

    // プロバイダー内のアカウントIDから紐づくアカウントを取得
    const loadAccount = async (
        providerAccountId: string,
        provider: string,
    ): Promise<AdapterAccount | null> => {
        // プロバイダー内のアカウントIDから紐づくアプリユーザーを探す
        const row = await findAccountRow(provider, providerAccountId)

        // 紐づくアカウントが無ければ未ログインとして扱う
        if (!row) {
            return null
        }

        // Auth.jsへは受け取った元のIDを変更せず返す(ハッシュ値はDB内だけで使う)
        return {
            provider: row.provider,
            providerAccountId,
            userId: row.user_id,
            type: "oidc",
        } satisfies AdapterAccount
    }

    return {
        // ユーザーを作成し、変更可能な仮の表示名を設定
        async createUser(user) {
            // Googleから受け取った名前・メール・画像は保存しない
            // 表示名は仮の名前で作り、利用者が変更するまで固定
            // ユーザーID（指定が無ければ生成）
            const id = user.id || crypto.randomUUID()
            const timestamp = new Date().toISOString()

            await database.prepare(
                `INSERT INTO users (
                     id, display_name, created_at, updated_at
                 ) VALUES (?, ?, ?, ?)`,
            ).bind(
                id,
                DEFAULT_DISPLAY_NAME,
                timestamp,
                timestamp,
            ).run()

            return {
                id,
                name: DEFAULT_DISPLAY_NAME,
                email: "",
                emailVerified: null,
                image: null,
            }
        },

        // IDからユーザーを取得
        async getUser(id) {
            return loadUser(id)
        },

        // Auth.jsのメール検索は常に未登録として返す
        async getUserByEmail() {
            // メールアドレスを保存していないため、メールでユーザーを探すことはない
            // Auth.jsはメールがない場合にgetUserByEmailを呼ばないが、念のため常に見つからない扱いにする
            return null
        },

        // OAuthアカウントからログイン対象のアプリユーザーを解決
        async getUserByAccount({provider, providerAccountId}) {
            // OAuthアカウントの組み合わせからログイン対象のユーザーを取得
            // 平文で保存されていた行は照合時にハッシュ値へ置き換わる
            const account = await findAccountRow(provider, providerAccountId)

            // アカウントの紐付けが無い場合は未ログインとして返す
            if (!account) {
                return null
            }

            return loadUser(account.user_id)
        },

        // Auth.jsからのプロフィール更新は保存せず、現在のユーザーを返す
        async updateUser(user) {
            // Auth.jsから渡される名前・メール・画像は外部サービス由来のため保存しない
            // 表示名の変更は、利用者の操作だけを受け付けるアカウントAPIで行う
            // 保存済みの現在のユーザー
            const currentUser = await loadUser(user.id)

            // 対象ユーザーが削除済みの場合はエラー
            if (!currentUser) {
                throw new Error("Auth user not found")
            }

            return currentUser
        },

        // ユーザー行を削除し、削除前のユーザーを返す
        async deleteUser(userId) {
            // 削除前のユーザーを返せるよう現在値を先に取得
            const user = await loadUser(userId)

            // 削除対象が無い場合はnullを返す
            if (!user) {
                return null
            }

            await database.prepare("DELETE FROM users WHERE id = ?")
                .bind(userId)
                .run()

            return user
        },

        // OAuthアカウントをハッシュ化したIDでユーザーへ紐付け
        async linkAccount(account) {
            const timestamp = new Date().toISOString()
            // アカウントIDは平文で保存せず、秘密鍵でハッシュにした値だけを保存
            const storedAccountId = await toStoredAccountId(
                account.provider,
                account.providerAccountId,
            )

            // OAuthトークンはアプリで利用せず、漏えいリスクを避けて保存しない
            await database.prepare(
                `INSERT INTO auth_accounts (
                     user_id, provider, provider_account_id, created_at, updated_at
                 ) VALUES (?, ?, ?, ?, ?)`,
            ).bind(
                account.userId,
                account.provider,
                storedAccountId,
                timestamp,
                timestamp,
            ).run()
        },

        // ハッシュ化したアカウントIDで紐付けを解除
        async unlinkAccount({provider, providerAccountId}) {
            // 平文の行もハッシュ値へ置き換えてから、ハッシュ値で削除
            // 削除前の紐付け（存在しない場合はundefined）
            const account = await loadAccount(providerAccountId, provider)
            const storedAccountId = await toStoredAccountId(provider, providerAccountId)

            await database.prepare(
                `DELETE FROM auth_accounts
                 WHERE provider = ? AND provider_account_id = ?`,
            ).bind(provider, storedAccountId).run()

            return account ?? undefined
        },

        // プロバイダー内のアカウントIDから紐付けを取得
        async getAccount(providerAccountId, provider) {
            return loadAccount(providerAccountId, provider)
        },

        // セッショントークンのハッシュと有効期限を保存
        async createSession(session) {
            // Cookieの平文トークンを保存せずSHA-256ハッシュだけをD1へ保存
            const tokenHash = await hashSessionToken(session.sessionToken)
            const timestamp = new Date().toISOString()

            await database.prepare(
                `INSERT INTO sessions (
                     id, user_id, token_hash, expires_at, created_at, updated_at
                 ) VALUES (?, ?, ?, ?, ?, ?)`,
            ).bind(
                crypto.randomUUID(),
                session.userId,
                tokenHash,
                session.expires.toISOString(),
                timestamp,
                timestamp,
            ).run()

            return session
        },

        // 有効期限内のセッションとユーザーをセッショントークンから取得
        async getSessionAndUser(sessionToken) {
            // セッショントークンのSHA-256ハッシュ
            const tokenHash = await hashSessionToken(sessionToken)
            // Cookieが残っていても、D1上の有効期限を過ぎたセッションは認証に使わない
            const row = await firstRow<UserSessionRow>(
                database,
                `SELECT users.id,
                        users.display_name,
                        sessions.id AS session_id,
                        sessions.user_id AS session_user_id,
                        sessions.token_hash AS session_token_hash,
                        sessions.expires_at AS session_expires_at
                 FROM sessions
                 JOIN users
                   ON users.id = sessions.user_id
                 WHERE sessions.token_hash = ?
                   AND sessions.expires_at > ?`,
                [tokenHash, new Date().toISOString()],
            )

            // 有効期限切れ・未登録のセッションは未ログインとして返す
            if (!row) {
                return null
            }

            return {
                session: {
                    sessionToken,
                    userId: row.session_user_id,
                    expires: new Date(row.session_expires_at),
                },
                user: toAdapterUser(row),
            }
        },

        // セッションの有効期限を延長して返す
        async updateSession(session) {
            // 有効な現在セッションだけを対象に期限を更新
            const tokenHash = await hashSessionToken(session.sessionToken)
            const currentSession = await firstRow<SessionRow>(
                database,
                `${selectSessionSql}
                 WHERE token_hash = ? AND expires_at > ?`,
                [tokenHash, new Date().toISOString()],
            )

            // 有効なセッションが無ければ更新せずnullを返す
            if (!currentSession) {
                return null
            }

            // 更新後の有効期限（指定が無ければ現在値）
            const expires = session.expires ?? new Date(currentSession.expires_at)
            const timestamp = new Date().toISOString()

            await database.prepare(
                `UPDATE sessions
                 SET expires_at = ?, updated_at = ?
                 WHERE token_hash = ?`,
            ).bind(expires.toISOString(), timestamp, tokenHash).run()

            return {
                sessionToken: session.sessionToken,
                userId: currentSession.user_id,
                expires,
            }
        },

        // セッショントークンのハッシュからセッションを削除
        async deleteSession(sessionToken) {
            // ログアウト対象を平文ではなく保存済みハッシュで特定
            const tokenHash = await hashSessionToken(sessionToken)
            const currentSession = await firstRow<SessionRow>(
                database,
                `${selectSessionSql} WHERE token_hash = ?`,
                [tokenHash],
            )

            // 削除対象のセッションが無ければnullを返す
            if (!currentSession) {
                return null
            }

            await database.prepare("DELETE FROM sessions WHERE token_hash = ?")
                .bind(tokenHash)
                .run()

            return {
                sessionToken,
                userId: currentSession.user_id,
                expires: new Date(currentSession.expires_at),
            } satisfies AdapterSession
        },
    }
}
