import {useEffect, useMemo, useRef, useState} from "react"

import {fetchCategories} from "@/api/categories"
import {Simulator} from "@/components/simulator/Simulator"
import {SavedBuildMigrationDialog} from "@/components/simulator/SavedBuildMigrationDialog"
import {useAuth} from "@/features/auth/useAuth"
import {
    getNonEmptyConfigIds,
    hasPendingLocalSimulatorMigration,
    migrateLocalSimulatorState,
} from "@/lib/saved-build-migration"
import {loadSimulatorState} from "@/lib/simulator-storage"
import type {SavedBuildMigrationResult} from "@/lib/saved-build-migration"
import type {Category} from "@/types/category"

// シミュレーター画面
export function SimulatorPage() {
    const {
        errorMessage: authErrorMessage,
        status: authStatus,
        user,
    } = useAuth()

    // 既存ユーザーのブラウザ構成を移行するため、初期状態を一度だけ読み取る
    const [localSimulatorState] = useState(loadSimulatorState)
    const [dismissedMigrationUserId, setDismissedMigrationUserId] = useState<string | null>(null)
    const [isMigrating, setIsMigrating] = useState(false)
    const [migrationResult, setMigrationResult] = useState<SavedBuildMigrationResult | null>(null)
    const migrationControllerRef = useRef<AbortController | null>(null)

    // 空の構成を除いた、移行候補の構成数
    const migrationConfigCount = useMemo(
        () => localSimulatorState
            ? getNonEmptyConfigIds(localSimulatorState).length
            : 0,
        [localSimulatorState],
    )

    // カテゴリー一覧
    const [categories, setCategories] = useState<
        Category[] // カテゴリー型の配列
    >([]) // 初期状態（未取得）

    // カテゴリー一覧の読み込み状態
    const [isLoading, setIsLoading] = useState(true)

    // カテゴリー取得時のエラーメッセージ
    const [categoryErrorMessage, setCategoryErrorMessage] = useState("")

    // 構成移行中の通信を画面破棄時に中断
    useEffect(() => () => {
        migrationControllerRef.current?.abort()
    }, [])

    // 確認ダイアログからlocalStorage構成をD1へ取り込む
    async function migrateLocalConfigurations() {
        if (
            !user ||
            authStatus !== "authenticated" ||
            isMigrating
        ) {
            return
        }

        const stateToMigrate = loadSimulatorState() ?? localSimulatorState

        if (!stateToMigrate) {
            setDismissedMigrationUserId(user.id)

            return
        }

        const controller = new AbortController()
        migrationControllerRef.current = controller
        setIsMigrating(true)
        setMigrationResult(null)

        try {
            const result = await migrateLocalSimulatorState(
                user.id,
                stateToMigrate,
                controller.signal,
            )

            if (!controller.signal.aborted) {
                setMigrationResult(result)
            }
        } catch (error) {
            if (!controller.signal.aborted) {
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
            if (!controller.signal.aborted) {
                setIsMigrating(false)
            }
        }
    }

    useEffect(() => {
        // 画面のマウント状態
        let isMounted = true

        // カテゴリー一覧の取得処理
        async function loadCategories() {
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
    const isMigrationDialogOpen = Boolean(
        authStatus === "authenticated" &&
        user &&
        (hasPendingMigration || isMigrating || migrationResult),
    )

    // ダイアログを閉じたユーザーを記録し、同一画面で繰り返し表示しない
    function dismissMigrationDialog() {
        setMigrationResult(null)
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
            {authStatus === "error" && authErrorMessage && (
                <div
                    className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900"
                    role="alert"
                >
                    {authErrorMessage}
                </div>
            )}

            <Simulator categories={categories}/>

            <SavedBuildMigrationDialog
                open={isMigrationDialogOpen}
                configCount={migrationConfigCount}
                isSubmitting={isMigrating}
                result={migrationResult}
                onConfirm={() => void migrateLocalConfigurations()}
                onDismiss={dismissMigrationDialog}
            />
        </>
    )
}
