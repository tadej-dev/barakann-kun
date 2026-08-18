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
                return
            }

            if (session.authenticated) {
                setAuthState({
                    status: "authenticated",
                    user: session.user,
                    errorMessage: null,
                })
            } else {
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
