import Google from "@auth/core/providers/google"
import type {Adapter} from "@auth/core/adapters"
import type {AuthConfig} from "@hono/auth-js"

import {createD1AuthAdapter} from "./d1-auth-adapter"
import type {Bindings} from "../types"

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const SESSION_UPDATE_AGE_SECONDS = 60 * 60

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
            Google({
                clientId: GOOGLE_CLIENT_ID ?? "",
                clientSecret: GOOGLE_CLIENT_SECRET ?? "",
                checks: ["pkce", "state", "nonce"],
                authorization: {
                    params: {
                        scope: "openid profile email",
                    },
                },
            }),
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
