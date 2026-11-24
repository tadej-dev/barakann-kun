import {useEffect, useRef, useState} from "react"

import {fetchCategories} from "@/api/categories"
import {Simulator} from "@/components/simulator/Simulator"
import {SavedBuildMigrationDialog} from "@/components/simulator/SavedBuildMigrationDialog"
import {Button} from "@/components/ui/button"
import {AUTH_LOGGED_OUT_EVENT} from "@/features/auth/authEvents"
import {useAuth} from "@/features/auth/useAuth"
import {GoogleIcon} from "@/features/auth/GoogleIcon"
import {
    MAX_SAVED_BUILDS,
    createSavedBuild,
    deleteSavedBuild,
    fetchSavedBuilds,
} from "@/api/savedBuilds"
import {
    buildMigrationPlan,
    canMigrateForAccount,
    intersectSelectableIds,
    loadLocalOrigin,
    saveLocalOrigin,
    selectMigrationTargets,
} from "@/lib/local-config-sync"
import type {SavedBuild} from "@/api/savedBuilds"
import {loadLocalConfigCollection} from "@/lib/simulator-storage"
import type {MigrationPlan} from "@/lib/local-config-sync"
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
        // キャンセル通知が無ければURLを書き換えない
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

    // ローカル構成の引き継ぎ
    const [localCollection] = useState(loadLocalConfigCollection) // 起動時にブラウザ保存の構成を1回だけ読み込む
    const [migrationPlan, setMigrationPlan] = useState<MigrationPlan | null>(null) // 構成の移行計画
    const [serverConfigs, setServerConfigs] = useState<SavedBuild[]>([]) // 移行先アカウントの保存済み構成
    const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]) // 移行対象として選択した構成ID
    // 移行ダイアログを閉じたユーザーID
    const [dismissedMigrationUserId, setDismissedMigrationUserId] =
        useState<string | null>(null)
    const [isMigrating, setIsMigrating] = useState(false) // 移行の保存処理中か
    const [isDeletingServerConfig, setIsDeletingServerConfig] = useState(false) // アカウント構成の削除処理中か
    const [migrationErrorMessage, setMigrationErrorMessage] = useState("") // 移行時のエラーメッセージ
    const [savedBuildsReloadKey, setSavedBuildsReloadKey] = useState(0) // 構成一覧を再取得するための更新キー
    const generationRef = useRef(0) // 中断用の世代番号
    const isMountedRef = useRef(true) // 画面がマウント中か
    const authUserId = authStatus === "authenticated" // ログイン中のユーザーID(未ログインならnull)
        ? user?.id ?? null
        : null

    // カテゴリー一覧
    const [categories, setCategories] = useState<
        Category[] // カテゴリー型の配列
    >([]) // 初期状態（未取得）

    // カテゴリー一覧の読み込み状態
    const [isLoading, setIsLoading] = useState(true)

    // カテゴリー取得時のエラーメッセージ
    const [categoryErrorMessage, setCategoryErrorMessage] = useState("")

    // ログアウト時に「閉じた」記録を消し、次のログインで未移行の構成を再判定する。
    // イベントのコールバックで戻すため、Effect内で同期的にsetStateしない。
    useEffect(() => {
        // ログアウト時に移行状態を初期化
        function resetMigrationState() {
            setDismissedMigrationUserId(null)
            setMigrationPlan(null)
            setSelectedConfigIds([])
        }

        window.addEventListener(AUTH_LOGGED_OUT_EVENT, resetMigrationState)

        return () => {
            window.removeEventListener(AUTH_LOGGED_OUT_EVENT, resetMigrationState)
        }
    }, [])

    useEffect(() => {
        isMountedRef.current = true

        return () => {
            isMountedRef.current = false
            generationRef.current += 1
        }
    }, [])

    // ログイン後、ブラウザの構成とアカウントの構成を比べて移行候補を作る
    useEffect(() => {
        // 未ログインまたは移行ダイアログを閉じたユーザーなら判定しない
        if (!authUserId || dismissedMigrationUserId === authUserId) {
            return
        }

        // 別アカウント由来のデータは、そのアカウントへ移行しない
        if (!canMigrateForAccount(loadLocalOrigin(), authUserId)) {
            return
        }

        // ブラウザに構成が無ければ移行候補を作らない
        if (localCollection.configs.length === 0) {
            return
        }

        let cancelled = false
        const controller = new AbortController()

        void (async () => {
            try {
                // アカウントに保存済みの構成
                const fetchedConfigs = await fetchSavedBuilds(controller.signal)

                // 画面破棄後は取得結果を反映しない
                if (cancelled) {
                    return
                }

                // 移行候補の判定結果
                const plan = buildMigrationPlan(
                    localCollection.configs,
                    fetchedConfigs,
                    MAX_SAVED_BUILDS,
                )

                // すべてが完全一致のときだけダイアログを出さない
                if (plan.candidates.every((candidate) =>
                    candidate.status === "duplicate")) {
                    return
                }

                setServerConfigs(fetchedConfigs)
                setMigrationPlan(plan)
                setSelectedConfigIds(plan.defaultSelectedIds)
            } catch {
                // 判定に失敗してもシミュレーターは使えるため、ここでは通知しない
            }
        })()

        return () => {
            cancelled = true
            controller.abort()
        }
    }, [authUserId, dismissedMigrationUserId, localCollection])

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

    // ダイアログ表示
    const isMigrationDialogOpen = Boolean(
        authStatus === "authenticated" && user && migrationPlan)

    // 選択した構成をアカウントへ保存する
    async function migrateSelectedConfigs() {
        // 未ログイン・移行計画なし・移行中は保存しない
        if (!authUserId || !migrationPlan || isMigrating) {
            return
        }

        // 選択IDから実際に保存する移行候補を決める
        const targets = selectMigrationTargets(
            migrationPlan,
            selectedConfigIds,
        )

        // 保存対象が無い場合はエラーを表示
        if (targets.length === 0) {
            setMigrationErrorMessage("保存する構成を選んでください。")
            return
        }

        // 選択件数が残り枠を超えている場合は保存しない
        if (targets.length > migrationPlan.remainingSlots) {
            setMigrationErrorMessage(
                "残り枠を超えています。選択を減らしてください。",
            )
            return
        }

        setIsMigrating(true)
        setMigrationErrorMessage("")
        const generation = generationRef.current
        // 画面表示中かつ同じ処理世代かを判定
        const isCurrent = () =>
            isMountedRef.current && generationRef.current === generation
        // 保存できた構成の件数
        let created = 0
        // 保存に失敗した構成の件数
        let failed = 0

        // ログイン直後に自動作成された空の構成1は、選択した構成で置き換える
        if (migrationPlan.replaceInitialConfig) {
            try {
                await deleteSavedBuild(
                    migrationPlan.replaceInitialConfig.id,
                    migrationPlan.replaceInitialConfig.version,
                )
            } catch {
                setIsMigrating(false)
                setMigrationErrorMessage(
                    "ログイン時に作成された構成を置き換えられませんでした。",
                )
                return
            }

            // 置き換え後に画面を離れていたら処理を止める
            if (!isCurrent()) {
                return
            }
        }

        for (const config of targets) {
            try {
                await createSavedBuild(
                    config.name,
                    config.parts.map((part) => ({
                        slotKey: part.slotKey,
                        partId: part.partId,
                    })),
                )
                created += 1
            } catch {
                failed += 1

                // 保存失敗後に画面を離れていたら処理を止める
                if (!isCurrent()) {
                    return
                }
            }
        }

        // 保存後に画面を離れていたら以降の更新を止める
        if (!isCurrent()) {
            return
        }

        // 失敗が無ければ保存中表示を解除
        if (failed === 0) {
            setIsMigrating(false)
        }

        // 保存できた構成があれば、由来を記録して一覧を再取得する
        if (created > 0) {
            saveLocalOrigin(authUserId)
            setSavedBuildsReloadKey((current) => current + 1)
        }

        // 失敗が残る場合は、状態を取り直してダイアログに残し再試行できるようにする
        if (failed > 0) {
            try {
                // 取得し直したアカウント構成
                const refreshed = await fetchSavedBuilds()

                // 最新の状態を取得できた場合だけ画面へ反映
                if (isCurrent()) {
                    // 再取得後の移行候補
                    const plan = buildMigrationPlan(
                        localCollection.configs,
                        refreshed,
                        MAX_SAVED_BUILDS,
                    )

                    setServerConfigs(refreshed)
                    setMigrationPlan(plan)
                    // 移行済み・上限外になった構成を選択から外す
                    setSelectedConfigIds((current) =>
                        intersectSelectableIds(plan, current))
                    setMigrationErrorMessage(
                        `${failed}件の構成を保存できませんでした。もう一度お試しください。`,
                    )
                }
            } catch {
                // 再取得結果を画面へ反映できる場合だけ続ける
                if (isCurrent()) {
                    // 状態を確認できないため、選択を空にして二重作成を防ぐ
                    setSelectedConfigIds([])
                    setMigrationErrorMessage(
                        `${failed}件の構成を保存できませんでした。`,
                    )
                }
            }

            setIsMigrating(false)

            return
        }

        // 全件成功したときだけダイアログを閉じる
        setMigrationPlan(null)
        setDismissedMigrationUserId(authUserId)
    }

    // アカウントの構成を削除し、残り枠と上限超過を再計算する
    async function deleteServerConfig(configId: string) {
        const target = serverConfigs.find((config) => config.id === configId)

        // 削除中は別の削除や移行を始めない
        if (!target || isMigrating || isDeletingServerConfig) {
            return
        }

        setIsDeletingServerConfig(true)
        const generation = generationRef.current
        // 画面表示中かつ同じ処理世代かを判定
        const isCurrent = () =>
            isMountedRef.current && generationRef.current === generation

        try {
            await deleteSavedBuild(target.id, target.version)
        } catch {
            // 競合した場合に備えて最新の構成を取り直し、再試行できるようにする
            try {
                // 取得し直したアカウント構成
                const refreshed = await fetchSavedBuilds()

                // 最新の状態を取得できた場合だけ画面へ反映
                if (isCurrent()) {
                    // 再取得後の移行候補
                    const plan = buildMigrationPlan(
                        localCollection.configs,
                        refreshed,
                        MAX_SAVED_BUILDS,
                    )

                    setServerConfigs(refreshed)
                    setMigrationPlan(plan)
                    // 選択の絞り込み
                    setSelectedConfigIds((current) =>
                        intersectSelectableIds(plan, current))
                }
            } catch {
                // 再取得にも失敗した場合は、元のエラーだけを表示する
            }

            // 削除結果を画面へ反映できる場合だけエラーを表示
            if (isCurrent()) {
                setMigrationErrorMessage("構成を削除できませんでした。")
                setIsDeletingServerConfig(false)
            }

            return
        }

        // 画面を離れていたら以降の更新を止める
        if (!isCurrent()) {
            return
        }

        // サイドバーの一覧も、削除を反映して取り直す
        setSavedBuildsReloadKey((current) => current + 1)
        setIsDeletingServerConfig(false)

        // 削除後のアカウント構成
        const rest = serverConfigs.filter((config) => config.id !== configId)

        setServerConfigs(rest)
        // 削除後の移行候補
        const plan = buildMigrationPlan(
            localCollection.configs,
            rest,
            MAX_SAVED_BUILDS,
        )

        setMigrationPlan(plan)
        // 削除で状況が変わったため、選択も移行可能なものへ絞る
        setSelectedConfigIds((current) =>
            intersectSelectableIds(plan, current))
    }

    // ダイアログを閉じたユーザーを記録し、同じ画面で繰り返し表示しない
    function dismissMigrationDialog() {
        setMigrationPlan(null)
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
                candidates={migrationPlan?.candidates ?? []}
                remainingSlots={migrationPlan?.remainingSlots ?? 0}
                replacesInitialConfig={Boolean(migrationPlan?.replaceInitialConfig)}
                counts={migrationPlan?.counts ?? {duplicate: 0, new: 0, overLimit: 0}}
                serverConfigs={serverConfigs.map((config) => ({
                    id: config.id,
                    name: config.name,
                    parts: config.parts.length,
                }))}
                onDeleteServerConfig={(configId) => void deleteServerConfig(configId)}
                selectedIds={selectedConfigIds}
                isSubmitting={isMigrating || isDeletingServerConfig}
                errorMessage={migrationErrorMessage}
                onToggle={(configId, checked) => setSelectedConfigIds(
                    (current) => checked
                        ? [...current, configId]
                        : current.filter((id) => id !== configId),
                )}
                onConfirm={() => void migrateSelectedConfigs()}
                onDismiss={dismissMigrationDialog}
            />
        </>
    )
}
