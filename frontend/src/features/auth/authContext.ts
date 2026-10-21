import {createContext} from "react"

import type {AuthUser} from "@/features/auth/authApi"

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error"

// 認証情報と、画面から実行できる認証操作を同じContextで公開する。
export type AuthState = {
    status: AuthStatus
    user: AuthUser | null
    errorMessage: string | null
}

export type AuthContextValue = AuthState & {
    isDeletingAccount: boolean
    isLoggingOut: boolean
    deleteAccount: () => Promise<void>
    login: () => Promise<void>
    logout: () => Promise<void>
    refreshSession: () => Promise<void>
    // 表示名を変更する。失敗時はエラーを投げ、呼び出し側(ダイアログ)で表示する
    updateDisplayName: (displayName: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
