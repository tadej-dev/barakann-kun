import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react"

import {
    deleteAccount as deleteAuthAccount,
    fetchAuthSession,
    getCurrentCallbackUrl,
    logout as logoutAuthSession,
    startGoogleLogin,
} from "@/features/auth/authApi"
import {
    AuthContext,
    type AuthContextValue,
    type AuthState,
} from "@/features/auth/authContext"

type AuthProviderProps = {
    children: ReactNode
}

const initialAuthState: AuthState = {
    status: "loading",
    user: null,
    errorMessage: null,
}

// エラー型に依存しない画面表示用メッセージ
function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message
        ? error.message
        : fallback
}

// 認証状態をアプリケーション全体へ提供
export function AuthProvider({children}: AuthProviderProps) {
    const [authState, setAuthState] = useState(initialAuthState)
    const [isDeletingAccount, setIsDeletingAccount] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const sessionRequestIdRef = useRef(0)

    // セッションAPIの再取得
    const refreshSession = useCallback(async (signal?: AbortSignal) => {
        // 競合するセッション取得のうち、最後に開始したリクエストだけを画面へ反映する。
        const requestId = ++sessionRequestIdRef.current

        setAuthState((current) => ({
            ...current,
            status: "loading",
            errorMessage: null,
        }))

        try {
            const session = await fetchAuthSession(signal)

            if (
                signal?.aborted ||
                sessionRequestIdRef.current !== requestId
            ) {
                // アンマウント後、または後続リクエスト開始後の応答は古い状態なので破棄する。
                return
            }

            if (session.authenticated) {
                // 認証済みの場合だけユーザー情報を保持し、未認証状態の残値を消す。
                setAuthState({
                    status: "authenticated",
                    user: session.user,
                    errorMessage: null,
                })
            } else {
                // セッションがない場合は、前回のユーザー情報を画面へ残さない。
                setAuthState({
                    status: "unauthenticated",
                    user: null,
                    errorMessage: null,
                })
            }
        } catch (error) {
            if (
                signal?.aborted ||
                sessionRequestIdRef.current !== requestId
            ) {
                // 失敗した応答も、古いリクエストなら現在のエラー表示を上書きしない。
                return
            }

            setAuthState({
                status: "error",
                user: null,
                errorMessage: getErrorMessage(
                    error,
                    "ログイン状態を確認できませんでした",
                ),
            })
        }
    }, [])

    // CSRF検証後にAuth.jsから返されたGoogleの認証URLへ遷移する
    const login = useCallback(async () => {
        try {
            const loginUrl = await startGoogleLogin(getCurrentCallbackUrl())

            // URL取得後の遷移はAuth.js/Google側へ任せ、戻り先はAPIが発行した値を使う。
            window.location.assign(loginUrl)
        } catch (error) {
            setAuthState((current) => ({
                ...current,
                status: "error",
                errorMessage: getErrorMessage(
                    error,
                    "Googleログインの開始に失敗しました",
                ),
            }))
        }
    }, [])

    // CSRFトークン取得後のログアウト
    const logout = useCallback(async () => {
        setIsLoggingOut(true)

        try {
            await logoutAuthSession()
            // Cookie削除後のサーバー状態を再取得し、全画面の表示を同じ状態へ揃える。
            await refreshSession()
        } catch (error) {
            setAuthState((current) => ({
                ...current,
                errorMessage: getErrorMessage(
                    error,
                    "ログアウトに失敗しました",
                ),
            }))
        } finally {
            setIsLoggingOut(false)
        }
    }, [refreshSession])

    // アカウント削除成功後は、削除済みセッションを画面へ残さない
    const deleteAccount = useCallback(async () => {
        setIsDeletingAccount(true)

        try {
            await deleteAuthAccount()
            // 削除前に開始されたセッション取得が、削除済み状態を上書きしないよう無効化
            sessionRequestIdRef.current += 1
            setAuthState({
                status: "unauthenticated",
                user: null,
                errorMessage: null,
            })
        } catch (error) {
            setAuthState((current) => ({
                ...current,
                errorMessage: getErrorMessage(
                    error,
                    "アカウントの削除に失敗しました",
                ),
            }))
            throw error
        } finally {
            setIsDeletingAccount(false)
        }
    }, [])

    // 初回表示時のログイン状態
    useEffect(() => {
        const controller = new AbortController()

        // ページを離れた後にセッション応答がstate更新しないよう、取得を中断する。
        void refreshSession(controller.signal)

        return () => controller.abort()
    }, [refreshSession])

    const contextValue = useMemo<AuthContextValue>(() => ({
        ...authState,
        isDeletingAccount,
        isLoggingOut,
        deleteAccount,
        login,
        logout,
        refreshSession: async () => refreshSession(),
    }), [
        authState,
        deleteAccount,
        isDeletingAccount,
        isLoggingOut,
        login,
        logout,
        refreshSession,
    ])

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    )
}
