import type {Adapter} from "@auth/core/adapters"
import type {OAuthConfig} from "@auth/core/providers"
import type {AuthConfig} from "@hono/auth-js"

import {createD1AuthAdapter} from "./d1-auth-adapter"
import type {Bindings} from "../types"

// セッションの有効期間(30日)
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
// セッションの有効期限を更新する間隔(1時間)
const SESSION_UPDATE_AGE_SECONDS = 60 * 60

// Googleの認可・トークン・ユーザー情報エンドポイント
const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo"

// GoogleのプロフィールからアカウントID(sub)だけを取り出す
// 返したidはAuth.jsのproviderAccountIdになる(ユーザーIDは別に自動生成)
export function toGoogleAccountUser(profile: Record<string, unknown>): {id: string} {
    // GoogleプロフィールのアカウントID(sub)
    const subject = profile.sub

    // アカウントIDが文字列でない、または空の場合は処理を中断
    if (typeof subject !== "string" || subject.length === 0) {
        throw new Error("Google profile does not include sub")
    }

    // openidスコープでも名前・メール・画像が返る場合があるため、ID以外の情報は捨てる
    return {id: subject}
}

// Googleの認可レスポンスにissが付かない環境でも処理できるOAuth設定
// discoveryのiss必須判定を避け、認可コード交換後はGoogleのUserInfo APIでプロフィールを取得
function createGoogleProvider(
    clientId: string,
    clientSecret: string,
): OAuthConfig<Record<string, unknown>> {
    // discoveryへ依存せずGoogleの各エンドポイントを固定
    return {
        id: "google",
        name: "Google",
        type: "oauth",
        // 明示OAuth設定でもGoogleが返すissuer値を正しく検証できるようにする
        issuer: "https://accounts.google.com",
        clientId,
        clientSecret,
        authorization: {
            url: GOOGLE_AUTHORIZATION_ENDPOINT,
            params: {
                // 本人を見分けるためのアカウントIDだけを求め、名前・メール・画像は求めない
                scope: "openid",
            },
        },
        token: {
            url: GOOGLE_TOKEN_ENDPOINT,
        },
        userinfo: {
            url: GOOGLE_USERINFO_ENDPOINT,
        },
        profile: toGoogleAccountUser,
        // stateとPKCEをAuth.js側で検証し、コールバックの改ざんと認可コード横取りへ備える
        checks: ["pkce", "state"],
    }
}

// Auth.js設定の生成
export function createAuthConfig(
    context: {env: Bindings},
    adapter?: Adapter,
): AuthConfig {
    // Bindingsから取り出すAuth.jsの認証設定
    const {
        AUTH_SECRET,
        AUTH_URL,
        AUTH_DEBUG,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
    } = context.env

    // ルートとテストで共通利用するAuth.js設定を組み立てる
    return {
        // 認証APIの共通パス
        basePath: "/api/auth",
        // Auth.jsのセッション署名などに使う秘密鍵（未設定は空文字）
        secret: AUTH_SECRET ?? "",
        // リバースプロキシ配下でもホストヘッダーを信頼する設定
        trustHost: true,
        // OAuthプロバイダーのエラー内容を確認するときだけローカルで明示的に有効化
        // 本番で常時有効にすると認証フローの詳細がログへ出るため、既定値は無効にする
        debug: AUTH_DEBUG === "true",
        // AUTH_URLが設定されている場合だけ基準URLを上書き
        ...(AUTH_URL ? {url: AUTH_URL} : {}),
        // テストから渡されたAdapterを優先し通常時だけD1実装を生成
        adapter: adapter ?? createD1AuthAdapter(
            context.env.DB,
            context.env.ACCOUNT_ID_HASH_SECRET,
        ),
        // ログイン手段として登録するGoogle OAuth
        providers: [
            createGoogleProvider(
                GOOGLE_CLIENT_ID ?? "",
                GOOGLE_CLIENT_SECRET ?? "",
            ),
        ],
        session: {
            // D1のセッションを正本としてログアウトや期限切れを管理
            strategy: "database",
            maxAge: SESSION_MAX_AGE_SECONDS,
            updateAge: SESSION_UPDATE_AGE_SECONDS,
        },
        callbacks: {
            // Auth.js標準のセッションへアプリ内ユーザーIDを追加
            async session({session, user}) {
                // 保存APIが本文のユーザーIDを信頼せず所有者を判定できるようにする
                if (session.user) {
                    session.user.id = user.id
                }

                return session
            },
        },
    }
}
