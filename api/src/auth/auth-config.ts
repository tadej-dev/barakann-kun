import type {Adapter} from "@auth/core/adapters"
import type {OAuthConfig} from "@auth/core/providers"
import type {AuthConfig} from "@hono/auth-js"

import {createD1AuthAdapter} from "./d1-auth-adapter"
import type {Bindings} from "../types"

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const SESSION_UPDATE_AGE_SECONDS = 60 * 60

const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo"

/**
 * Googleの認可レスポンスに `iss` が付かない環境でも処理できるOAuth設定。
 *
 * Auth.jsの組み込みGoogleプロバイダーはOIDC discoveryを利用するため、
 * discovery metadataが `iss` を必須と通知した場合に、その値を検証します。
 * Google側のレスポンス差異で `iss` が欠落するケースがあるため、エンドポイントを
 * 明示したOAuth 2.0として扱い、認可コード交換後はGoogleのUserInfo APIでプロフィールを取得します。
 * stateとPKCEは維持し、コールバックの改ざんと認可コード横取りへの対策を残します。
 */
function createGoogleProvider(
    clientId: string,
    clientSecret: string,
): OAuthConfig<Record<string, unknown>> {
    return {
        id: "google",
        name: "Google",
        type: "oauth",
        clientId,
        clientSecret,
        authorization: {
            url: GOOGLE_AUTHORIZATION_ENDPOINT,
            params: {
                scope: "openid profile email",
            },
        },
        token: {
            url: GOOGLE_TOKEN_ENDPOINT,
        },
        userinfo: {
            url: GOOGLE_USERINFO_ENDPOINT,
        },
        // Googleのレスポンスに依存せず、Auth.js側でstateとPKCEを検証する。
        checks: ["pkce", "state"],
    }
}

// Auth.js設定の生成
export function createAuthConfig(
    context: {env: Bindings},
    adapter?: Adapter,
): AuthConfig {
    const {
        AUTH_SECRET,
        AUTH_URL,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
    } = context.env

    return {
        basePath: "/api/auth",
        secret: AUTH_SECRET ?? "",
        trustHost: true,
        ...(AUTH_URL ? {url: AUTH_URL} : {}),
        adapter: adapter ?? createD1AuthAdapter(context.env.DB),
        providers: [
            createGoogleProvider(
                GOOGLE_CLIENT_ID ?? "",
                GOOGLE_CLIENT_SECRET ?? "",
            ),
        ],
        session: {
            strategy: "database",
            maxAge: SESSION_MAX_AGE_SECONDS,
            updateAge: SESSION_UPDATE_AGE_SECONDS,
        },
        callbacks: {
            // Auth.js標準のセッションへアプリ内ユーザーIDを追加
            async session({session, user}) {
                if (session.user) {
                    session.user.id = user.id
                }

                return session
            },
        },
    }
}
