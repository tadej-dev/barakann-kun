import {useEffect, useMemo, useRef, useState} from "react"

import {fetchCategories} from "@/api/categories"
import {Simulator} from "@/components/simulator/Simulator"
import {SavedBuildMigrationDialog} from "@/components/simulator/SavedBuildMigrationDialog"
import {Button} from "@/components/ui/button"
import {useAuth} from "@/features/auth/useAuth"
import {GoogleIcon} from "@/features/auth/GoogleIcon"
import {
    dismissLocalSimulatorMigration,
    getNonEmptyConfigIds,
    hasPendingLocalSimulatorMigration,
    migrateLocalSimulatorState,
} from "@/lib/saved-build-migration"
import {loadSimulatorState} from "@/lib/simulator-storage"
import type {SavedBuildMigrationResult} from "@/lib/saved-build-migration"
import type {ConfigId} from "@/features/simulator/simulatorTypes"
import type {Category} from "@/types/category"

// シミュレーター画面
export function SimulatorPage() {
    const {
        errorMessage: authErrorMessage,
        login,
        status: authStatus,
        user,
    } = useAuth()

    // Googleの同意画面でキャンセルされた通知を一度だけ表示する
    const [isGoogleLoginCancelled] = useState(() => {
        const url = new URL(window.location.href)

        return url.searchParams.get("authError") === "google-cancelled"
    })

    useEffect(() => {
        if (!isGoogleLoginCancelled) {
            return
        }

        // ブラウザ更新で同じ通知を繰り返さないよう、表示後にクエリを消す。
        const url = new URL(window.location.href)
        url.searchParams.delete("authError")
        window.history.replaceState(
            null,
            "",
            `${url.pathname}${url.search}${url.hash}`,
        )
    }, [isGoogleLoginCancelled])

    // 既存ユーザーのブラウザ構成を移行するため、初期状態を一度だけ読み取る
    const [localSimulatorState] = useState(loadSimulatorState)
    const [dismissedMigrationUserId, setDismissedMigrationUserId] =
        useState<string | null>(null)
    const [isMigrating, setIsMigrating] = useState(false)
    const [migrationResult, setMigrationResult] = useState<SavedBuildMigrationResult | null>(null)
    const [savedBuildsReloadKey, setSavedBuildsReloadKey] = useState(0)
    const migrationControllerRef = useRef<AbortController | null>(null)
    const migrationRequestIdRef = useRef(0)
    const activeMigrationRequestIdRef = useRef<number | null>(null)
    const [migrationOwnerKey, setMigrationOwnerKey] = useState<string | null>(null)
    const [migrationResultOwnerKey, setMigrationResultOwnerKey] =
        useState<string | null>(null)
    const authUserId = authStatus === "authenticated"
        ? user?.id ?? null
        : null
    const currentAuthUserIdRef = useRef(authUserId)

    // 空の構成を除いた、移行候補の構成数
    const migrationConfigIds = useMemo(
        () => localSimulatorState
            ? getNonEmptyConfigIds(localSimulatorState)
            : [],
        [localSimulatorState],
    )
    const migrationConfigCount = migrationConfigIds.length
    const [migrationNames, setMigrationNames] = useState<
        Partial<Record<ConfigId, string>>
    >(() => Object.fromEntries(
        migrationConfigIds.map((configId) => [configId, `構成${configId}`]),
    ))

    // カテゴリー一覧
    const [categories, setCategories] = useState<
        Category[] // カテゴリー型の配列
    >([]) // 初期状態（未取得）

    // カテゴリー一覧の読み込み状態
    const [isLoading, setIsLoading] = useState(true)

    // カテゴリー取得時のエラーメッセージ
    const [categoryErrorMessage, setCategoryErrorMessage] = useState("")

    // ユーザー変更時に、前ユーザーの構成移行通信と結果を無効化
    useEffect(() => {
        currentAuthUserIdRef.current = authUserId
        migrationControllerRef.current?.abort()
        migrationRequestIdRef.current += 1
        activeMigrationRequestIdRef.current = null
        // ユーザー切り替え時は前ユーザーの移行状態を画面から外す。
        // これは外部認証状態との同期であり、同じEffect内で意図的に状態をリセットする。
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMigrationOwnerKey(null)
        setMigrationResultOwnerKey(null)
    }, [authUserId])

    // 画面破棄時に構成移行通信を中断
    useEffect(() => () => {
        migrationControllerRef.current?.abort()
    }, [])

    // 確認ダイアログからlocalStorage構成をD1へ取り込む
    async function migrateLocalConfigurations() {
        // 認証前・別ユーザーの処理中・同一ユーザーの二重実行中は保存を開始しない。
        const isCurrentMigrationRunning = isMigrating &&
            migrationOwnerKey === authUserId

        if (
            !user ||
            authStatus !== "authenticated" ||
            isCurrentMigrationRunning
        ) {
            return
        }

        const stateToMigrate = loadSimulatorState() ?? localSimulatorState

        // Storageが空の場合は、ログインしていても移行対象がないためダイアログだけを閉じる。
        if (!stateToMigrate) {
            return
        }

        const controller = new AbortController()
        const requestId = ++migrationRequestIdRef.current
        const migrationUserId = user.id
        migrationControllerRef.current = controller
        activeMigrationRequestIdRef.current = requestId
        setIsMigrating(true)
        setMigrationOwnerKey(migrationUserId)
        setMigrationResult(null)
        setMigrationResultOwnerKey(null)

        try {
            const result = await migrateLocalSimulatorState(
                migrationUserId,
                stateToMigrate,
                controller.signal,
                migrationNames,
            )

            if (
                !controller.signal.aborted &&
                currentAuthUserIdRef.current === migrationUserId &&
                activeMigrationRequestIdRef.current === requestId
            ) {
                // 現在のユーザー・リクエストだけを結果へ反映し、完了件数があれば一覧を再取得する。
                setMigrationResultOwnerKey(migrationUserId)
                setMigrationResult(result)

                if (result.created.length > 0) {
                    setSavedBuildsReloadKey((current) => current + 1)
                }
            }
        } catch (error) {
            if (
                !controller.signal.aborted &&
                currentAuthUserIdRef.current === migrationUserId &&
                activeMigrationRequestIdRef.current === requestId
            ) {
                // 部分失敗も構成ごとに表示し、成功した構成を再試行で二重登録しない。
                setMigrationResultOwnerKey(migrationUserId)
                const message = error instanceof Error
                    ? error.message
                    : "構成の保存に失敗しました"

                setMigrationResult({
                    created: [],
                    skipped: [],
                    failed: getNonEmptyConfigIds(stateToMigrate).map(
                        (configId) => ({configId, message}),
                    ),
                })
            }
        } finally {
            if (
                !controller.signal.aborted &&
                currentAuthUserIdRef.current === migrationUserId &&
                activeMigrationRequestIdRef.current === requestId
            ) {
                setIsMigrating(false)
            }
        }
    }

    useEffect(() => {
        // 画面のマウント状態
        let isMounted = true

        // カテゴリー一覧の取得処理
        async function loadCategories() {
            // カテゴリーは候補取得の入口なので、一覧を読み終えるまでシミュレーターを表示しない。
            try {
                const data = await fetchCategories()

                // 画面表示中のみカテゴリーを更新
                if (isMounted) {
                    setCategories(data)
                }
            } catch (error) {
                // 画面表示中のみエラーを更新
                if (isMounted) {
                    setCategoryErrorMessage(
                        error instanceof Error
                            ? error.message // Error型のメッセージ
                            : "エラーが発生しました", // Error型以外のメッセージ
                    )
                }
            } finally {
                // 画面表示中のみ読み込み状態を解除
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        // 非同期処理の実行
        void loadCategories()

        // 画面破棄時のマウント状態更新
        return () => {
            isMounted = false
        }
    }, []) // 初回表示時のみ実行

    // ログイン済みで未移行の構成がある場合だけダイアログを表示
    const hasPendingMigration = Boolean(
        !isLoading &&
        authStatus === "authenticated" &&
        user &&
        localSimulatorState &&
        migrationConfigCount > 0 &&
        user.id !== dismissedMigrationUserId &&
        hasPendingLocalSimulatorMigration(user.id, localSimulatorState),
    )
    const isMigratingForCurrentUser = Boolean(
        authUserId &&
        isMigrating &&
        migrationOwnerKey === authUserId,
    )
    const hasMigrationResultForCurrentUser = Boolean(
        authUserId &&
        migrationResult &&
        migrationResultOwnerKey === authUserId,
    )
    const isMigrationDialogOpen = Boolean(
        authStatus === "authenticated" &&
        user &&
        (hasPendingMigration ||
            isMigratingForCurrentUser ||
            hasMigrationResultForCurrentUser),
    )

    // ダイアログを閉じたユーザーを記録し、同一画面で繰り返し表示しない
    function dismissMigrationDialog() {
        if (user) {
            // 途中失敗の結果画面を閉じた場合も、同じ内容の再表示を防ぐ
            const stateToDismiss = loadSimulatorState() ?? localSimulatorState

            if (stateToDismiss) {
                dismissLocalSimulatorMigration(user.id, stateToDismiss)
            }
        }

        setMigrationResult(null)
        setMigrationResultOwnerKey(null)
        setDismissedMigrationUserId(user?.id ?? null)
    }

    // カテゴリー読み込み中の表示
    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 p-8 text-white">
                読み込み中...
            </div>
        )
    }

    // カテゴリー取得失敗時の表示
    if (categoryErrorMessage) {
        return (
            <div className="min-h-screen bg-zinc-950 p-8 text-red-400">
                {categoryErrorMessage}
            </div>
        )
    }

    // シミュレーター画面
    return (
        <>
            {isGoogleLoginCancelled && (
                <div
                    className="border-b border-amber-300 bg-amber-50 px-4 py-4 text-amber-950"
                    role="alert"
                >
                    <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold">
                                Googleログインがキャンセルされました。
                            </p>
                            <p className="mt-1 text-sm text-amber-900/80">
                                再度ログインする場合は、ボタンを押してください。
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full border-amber-400 bg-white text-amber-950 hover:bg-amber-100 hover:text-amber-950 sm:w-auto"
                            onClick={() => void login()}
                        >
                            <GoogleIcon className="size-4" />
                            もう一度Googleでログイン
                        </Button>
                    </div>
                </div>
            )}

            {authStatus === "error" && authErrorMessage && (
                <div
                    className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900"
                    role="alert"
                >
                    {authErrorMessage}
                </div>
            )}

            <Simulator
                categories={categories}
                savedBuildsReloadKey={savedBuildsReloadKey}
                autoSaveEnabled={!isMigrationDialogOpen}
            />

            <SavedBuildMigrationDialog
                open={isMigrationDialogOpen}
                configCount={migrationConfigCount}
                configIds={migrationConfigIds}
                names={migrationNames}
                isSubmitting={isMigrating}
                result={migrationResult}
                onConfirm={() => void migrateLocalConfigurations()}
                onDismiss={dismissMigrationDialog}
                onNameChange={(configId, name) => setMigrationNames(
                    (current) => ({...current, [configId]: name}),
                )}
            />
        </>
    )
}
