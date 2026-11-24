import {createContext} from "react"

import type {AuthUser} from "@/features/auth/authApi"

// 認証状態（読み込み・認証済み・未認証・エラー）
export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error"

// 認証情報と、画面から実行できる認証操作を同じContextで公開する。
export type AuthState = {
    status: AuthStatus // 現在の認証状態
    user: AuthUser | null // ログイン中のユーザー（未ログインはnull）
    errorMessage: string | null // 認証処理のエラーメッセージ
}

// Contextで公開する認証状態と認証操作
export type AuthContextValue = AuthState & {
    isDeletingAccount: boolean // アカウント削除APIの実行中フラグ
    isLoggingOut: boolean // ログアウトAPIの実行中フラグ
    deleteAccount: () => Promise<void> // アカウント削除を実行する関数
    login: () => Promise<void> // Googleログインを開始する関数
    logout: () => Promise<boolean> // ログアウトを実行し、成功したかを返す関数
    refreshSession: () => Promise<void> // セッションを取り直す関数
    updateDisplayName: (displayName: string) => Promise<void> // 表示名の変更
}

// 認証状態と認証操作を配るContext
export const AuthContext = createContext<AuthContextValue | null>(null)
