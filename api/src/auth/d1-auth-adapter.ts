import type {
    Adapter,
    AdapterAccount,
    AdapterSession,
    AdapterUser,
} from "@auth/core/adapters"

type UserRow = {
    id: string
    display_name: string
    email: string
    image_url: string | null
}

type SessionRow = {
    id: string
    user_id: string
    token_hash: string
    expires_at: string
    created_at: string
    updated_at: string
}

type AccountRow = {
    user_id: string
    provider: string
    provider_account_id: string
}

type UserSessionRow = UserRow & {
    session_id: string
    session_user_id: string
    session_token_hash: string
    session_expires_at: string
}

// D1から1行を型付きで取得する共通処理
async function firstRow<T>(
    database: D1Database,
    sql: string,
    parameters: unknown[] = [],
): Promise<T | null> {
    return database.prepare(sql).bind(...parameters).first<T>()
}

// セッションCookieの値をD1へ保存するためのSHA-256ハッシュを生成
async function hashSessionToken(token: string): Promise<string> {
    const data = new TextEncoder().encode(token)
    const digest = await crypto.subtle.digest("SHA-256", data)

    return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
    ).join("")
}

// DBのユーザー行をAuth.jsのユーザー形式へ変換
function toAdapterUser(row: UserRow): AdapterUser {
    return {
        id: row.id,
        name: row.display_name,
        email: row.email,
        emailVerified: null,
        image: row.image_url,
    }
}

// Auth.jsから渡されたメールアドレスを一意性判定用に正規化
function normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
}

// Auth.jsから渡された表示名をusers.display_nameの制約に合わせて整形
function displayName(name: string | null | undefined, email: string): string {
    const normalizedName = name?.trim()

    return normalizedName || email
}

// D1を利用するAuth.jsデータベースアダプター
export function createD1AuthAdapter(database: D1Database): Adapter {
    const selectUserSql = `
        SELECT id, display_name, email, image_url
        FROM users
    `

    const selectSessionSql = `
        SELECT id, user_id, token_hash, expires_at, created_at, updated_at
        FROM sessions
    `

    const loadUser = async (id: string): Promise<AdapterUser | null> => {
        const row = await firstRow<UserRow>(
            database,
            `${selectUserSql} WHERE id = ?`,
            [id],
        )

        return row ? toAdapterUser(row) : null
    }

    const loadAccount = async (
        providerAccountId: string,
        provider: string,
    ): Promise<AdapterAccount | null> => {
        const row = await firstRow<AccountRow>(
            database,
            `SELECT user_id, provider, provider_account_id
             FROM auth_accounts
             WHERE provider = ? AND provider_account_id = ?`,
            [provider, providerAccountId],
        )

        if (!row) {
            return null
        }

        return {
            provider: row.provider,
            providerAccountId: row.provider_account_id,
            userId: row.user_id,
            type: "oidc",
        } satisfies AdapterAccount
    }

    return {
        async createUser(user) {
            const email = normalizeEmail(user.email)
            const id = user.id || crypto.randomUUID()
            const name = displayName(user.name, email)
            const timestamp = new Date().toISOString()

            await database.prepare(
                `INSERT INTO users (
                     id, display_name, email, image_url, created_at, updated_at
                 ) VALUES (?, ?, ?, ?, ?, ?)`,
            ).bind(
                id,
                name,
                email,
                user.image ?? null,
                timestamp,
                timestamp,
            ).run()

            return {
                id,
                name,
                email,
                emailVerified: user.emailVerified ?? null,
                image: user.image ?? null,
            }
        },

        async getUser(id) {
            return loadUser(id)
        },

        async getUserByEmail(email) {
            const normalizedEmail = normalizeEmail(email)
            const row = await firstRow<UserRow>(
                database,
                `${selectUserSql} WHERE email = ?`,
                [normalizedEmail],
            )

            return row ? toAdapterUser(row) : null
        },

        async getUserByAccount({provider, providerAccountId}) {
            const row = await firstRow<UserRow>(
                database,
                `${selectUserSql}
                 JOIN auth_accounts
                   ON auth_accounts.user_id = users.id
                 WHERE auth_accounts.provider = ?
                   AND auth_accounts.provider_account_id = ?`,
                [provider, providerAccountId],
            )

            return row ? toAdapterUser(row) : null
        },

        async updateUser(user) {
            const currentUser = await loadUser(user.id)

            if (!currentUser) {
                throw new Error("Auth user not found")
            }

            const email = user.email === undefined || user.email === null
                ? currentUser.email
                : normalizeEmail(user.email)
            const name = displayName(
                user.name === undefined ? currentUser.name : user.name,
                email,
            )
            const image = user.image === undefined
                ? currentUser.image
                : user.image
            const timestamp = new Date().toISOString()

            await database.prepare(
                `UPDATE users
                 SET display_name = ?, email = ?, image_url = ?, updated_at = ?
                 WHERE id = ?`,
            ).bind(name, email, image ?? null, timestamp, user.id).run()

            const updatedUser = await loadUser(user.id)

            if (!updatedUser) {
                throw new Error("Auth user could not be loaded after update")
            }

            return updatedUser
        },

        async deleteUser(userId) {
            const user = await loadUser(userId)

            if (!user) {
                return null
            }

            await database.prepare("DELETE FROM users WHERE id = ?")
                .bind(userId)
                .run()

            return user
        },

        async linkAccount(account) {
            const timestamp = new Date().toISOString()

            // OAuthトークンはこのアプリでは利用せず、漏えいリスクを避けて保存しない。
            await database.prepare(
                `INSERT INTO auth_accounts (
                     user_id, provider, provider_account_id, created_at, updated_at
                 ) VALUES (?, ?, ?, ?, ?)`,
            ).bind(
                account.userId,
                account.provider,
                account.providerAccountId,
                timestamp,
                timestamp,
            ).run()
        },

        async unlinkAccount({provider, providerAccountId}) {
            const account = await loadAccount(providerAccountId, provider)

            await database.prepare(
                `DELETE FROM auth_accounts
                 WHERE provider = ? AND provider_account_id = ?`,
            ).bind(provider, providerAccountId).run()

            return account ?? undefined
        },

        async getAccount(providerAccountId, provider) {
            return loadAccount(providerAccountId, provider)
        },

        async createSession(session) {
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

        async getSessionAndUser(sessionToken) {
            const tokenHash = await hashSessionToken(sessionToken)
            // Cookieが残っていても、D1上の有効期限を過ぎたセッションは認証に使わない。
            const row = await firstRow<UserSessionRow>(
                database,
                `SELECT users.id,
                        users.display_name,
                        users.email,
                        users.image_url,
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

        async updateSession(session) {
            const tokenHash = await hashSessionToken(session.sessionToken)
            const currentSession = await firstRow<SessionRow>(
                database,
                `${selectSessionSql} WHERE token_hash = ?`,
                [tokenHash],
            )

            if (!currentSession) {
                return null
            }

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

        async deleteSession(sessionToken) {
            const tokenHash = await hashSessionToken(sessionToken)
            const currentSession = await firstRow<SessionRow>(
                database,
                `${selectSessionSql} WHERE token_hash = ?`,
                [tokenHash],
            )

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
