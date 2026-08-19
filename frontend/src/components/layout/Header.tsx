import {
    Bike,
    ChevronDown,
    LogOut,
    Trash2,
} from "lucide-react"
import {NavLink} from "react-router"
import {useState} from "react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {Button} from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {GoogleIcon} from "@/features/auth/GoogleIcon"
import {AccountDeleteDialog} from "@/features/auth/AccountDeleteDialog"
import {useAuth} from "@/features/auth/useAuth"

// ユーザー名からアバター用の頭文字を作成
function getUserInitials(displayName: string): string {
    const initials = displayName
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")

    return initials.slice(0, 2).toUpperCase() || "U"
}

// ヘッダー
export function Header() {
    const {
        deleteAccount,
        errorMessage,
        isDeletingAccount,
        isLoggingOut,
        login,
        logout,
        status,
        user,
    } = useAuth()
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

    // 削除成功時だけダイアログを閉じ、失敗時はエラーを確認できるように残す
    async function handleDeleteAccount() {
        try {
            await deleteAccount()
            setIsDeleteDialogOpen(false)
        } catch {
            // AuthProviderが保持したエラーを確認ダイアログへ表示する
        }
    }

    // 認証状態に応じて、確認中・ユーザーメニュー・ログイン導線のいずれかを表示する。
    return (
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0b0f12] text-white">
            <div className="mx-auto flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-8">
                <div className="flex min-w-0 items-center gap-4">
                    <Button
                        render={<NavLink to="/" aria-label="シミュレーターへ戻る" />}
                        nativeButton={false}
                        type="button"
                        variant="ghost"
                        className="-ml-2 h-10 min-w-0 gap-3 px-2 text-base font-semibold text-white hover:bg-slate-800 hover:text-white"
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-sky-300 shadow-xs">
                            <Bike className="size-4" />
                        </span>

                        <span className="truncate">
                            barakann-kun
                        </span>
                    </Button>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                    {status === "loading" && (
                        <span
                            className="text-xs text-slate-400"
                            aria-live="polite"
                        >
                            認証状態を確認中…
                        </span>
                    )}

                    {status === "authenticated" && user && (
                        <>
                            {errorMessage && (
                                <span
                                    className="hidden max-w-56 truncate text-xs text-amber-300 md:inline"
                                    title={errorMessage}
                                    role="alert"
                                >
                                    {errorMessage}
                                </span>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    type="button"
                                    className="group flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 p-1 pr-2 text-left text-white shadow-xs transition-colors hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-sky-400/40"
                                    aria-label="アカウントメニューを開く"
                                >
                                    <Avatar className="size-8">
                                        {user.image && (
                                            <AvatarImage
                                                src={user.image}
                                                alt=""
                                            />
                                        )}
                                        <AvatarFallback className="bg-sky-100 text-sky-800">
                                            {getUserInitials(user.displayName)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <span className="hidden max-w-40 truncate text-sm sm:inline">
                                        {user.displayName}
                                    </span>

                                    <ChevronDown className="size-4 text-slate-400 transition-transform group-aria-expanded:rotate-180" />
                                </DropdownMenuTrigger>

                                <DropdownMenuContent>
                                    <div className="px-2.5 py-2">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {user.displayName}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>

                                    <div className="my-1 h-px bg-border" />

                                    {/* ログアウト後のセッション再取得はAuthProviderへ集約する。 */}
                                    <DropdownMenuItem
                                        disabled={isLoggingOut}
                                        onClick={() => void logout()}
                                    >
                                        <LogOut className="size-4" />
                                        {isLoggingOut
                                            ? "ログアウト中…"
                                            : "ログアウト"}
                                    </DropdownMenuItem>

                                    {/* 削除処理は確認ダイアログで明示的に承認してから実行する。 */}
                                    <DropdownMenuItem
                                        disabled={isLoggingOut || isDeletingAccount}
                                        onClick={() => setIsDeleteDialogOpen(true)}
                                    >
                                        <Trash2 className="size-4" />
                                        アカウントを削除
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}

                    {(status === "unauthenticated" || status === "error") && (
                        <>
                            {/* 未ログインと認証エラーでは、再試行できるログインボタンを残す。 */}
                            {status === "error" && errorMessage && (
                                <span
                                    className="hidden max-w-56 truncate text-xs text-amber-300 md:inline"
                                    title={errorMessage}
                                    role="alert"
                                >
                                    {errorMessage}
                                </span>
                            )}

                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-9 gap-2 rounded-lg border-slate-600 bg-white px-3 text-sm font-medium text-slate-900 shadow-none hover:border-slate-400 hover:bg-slate-100 hover:text-slate-950 sm:px-4"
                                onClick={() => void login()}
                            >
                                <GoogleIcon className="size-4" />
                                <span className="hidden sm:inline">
                                    Googleでログイン
                                </span>
                                <span className="sm:hidden">
                                    ログイン
                                </span>
                            </Button>
                        </>
                    )}

                </div>
            </div>

            <AccountDeleteDialog
                open={isDeleteDialogOpen && status === "authenticated"}
                isDeleting={isDeletingAccount}
                errorMessage={errorMessage}
                onConfirm={() => void handleDeleteAccount()}
                onDismiss={() => setIsDeleteDialogOpen(false)}
            />
        </header>
    )
}
