import {
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from "react"

import {fetchParts, fetchPartsByIds} from "@/api/parts"
import type {ConfigSlot} from "@/api/configSlots"
import type {SavedBuild} from "@/api/savedBuilds"
import {useAuth} from "@/features/auth/useAuth"
import {calculateSelectedPartsTotals} from "@/features/simulator/partCompatibility"
import {getPartDisplayName} from "@/features/simulator/partDisplay"
import {
    getPartSlotCategoryKey,
    getPartSlotPositionLabel,
    getPartSlots,
    type PartSlot,
} from "@/features/simulator/partSlots"
import {
    CONFIG_IDS,
    type ConfigId,
    type ConfigStates,
    type SelectedParts,
} from "@/features/simulator/simulatorTypes"
import {
    createInitialSimulatorState,
    simulatorReducer,
} from "@/features/simulator/simulatorReducer"
import {
    loadSimulatorState,
    saveSimulatorState,
} from "@/lib/simulator-storage"
import type {Category} from "@/types/category"
import type {Part} from "@/types/part"

// シミュレーターの入力値
export type UseSimulatorControllerProps = {
    categories: Category[]
    autoSaveEnabled: boolean
}

// 画面へ渡すシミュレーターの状態と操作
export type SimulatorController = {
    activeCategory: string
    activeConfigId: ConfigId
    activeSavedBuildId: string | null
    activeSlot: PartSlot
    activeParts: Part[]
    autoSaveEnabled: boolean
    blockedCategoryKeys: Set<string>
    blockedMessage: string | undefined
    blockingCategoryNames: string[]
    blockingPartNames: string[]
    configs: ConfigStates
    isLoadingParts: boolean
    isSavedBuildLoading: boolean
    partsError: string
    restoreError: string
    savedBuildError: string
    selectedPart: Part | undefined
    selectedParts: SelectedParts
    slotPositionLabel: string | null
    totalPrice: number
    totalWeight: number
    changeCategory: (category: string) => void
    changeConfig: (configId: ConfigId) => void
    restoreConfigSlot: (slot: ConfigSlot) => Promise<void>
    changeSlot: (slot: PartSlot) => void
    clearActiveConfig: () => void
    clearConfig: (configId: ConfigId) => Promise<void>
    onRemoveBlockingParts: () => void
    onSelectPart: (
        part: Part,
        slotKeys?: string[],
        removeSlotKeys?: string[],
    ) => void
    prefetchSavedBuild: (build: SavedBuild) => void
    selectSavedBuild: (build: SavedBuild) => Promise<void>
}

// 空の選択済みパーツ
const EMPTY_SELECTED_PARTS: SelectedParts = {}

// 保存構成のスロット情報を、取得済みパーツへ変換
function restoreSavedBuildParts(
    build: SavedBuild,
    partsById: ReadonlyMap<number, Part>,
    allowMissing: boolean,
): SelectedParts {
    // 保存時のslotKeyをそのまま維持し、表示用の最新Partだけを差し替える。
    const restoredParts: SelectedParts = {}

    for (const savedPart of build.parts) {
        const part = partsById.get(savedPart.partId)

        // 先読み段階では未取得パーツを許容し、選択確定時だけ欠落をエラーにする。
        if (!part) {
            if (allowMissing) {
                continue
            }

            throw new Error(
                `「${build.name}」に含まれるパーツを読み込めませんでした`,
            )
        }

        if (part.categoryKey !== getPartSlotCategoryKey(savedPart.slotKey)) {
            // 保存データとカタログのカテゴリーが違う場合は、誤った枠へ復元しない。
            throw new Error(
                `「${build.name}」に含まれるパーツを読み込めませんでした`,
            )
        }

        restoredParts[savedPart.slotKey] = part
    }

    return restoredParts
}

// 取得済みパーツをIDで再利用できるようキャッシュへ登録
function cacheParts(cache: Map<number, Part>, parts: Part[]) {
    // APIの返却順に依存せず、IDをキーにして候補取得と保存構成復元で共有する。
    for (const part of parts) {
        cache.set(part.id, part)
    }
}

// シミュレーターの状態・非同期処理をまとめて管理するフック
export function useSimulatorController({
                                           categories,
                                           autoSaveEnabled,
                                       }: UseSimulatorControllerProps): SimulatorController {
    // UIからのイベントをReducer・API・キャッシュへ振り分ける唯一の窓口。
    const {status: authStatus, user} = useAuth()
    const authUserId = authStatus === "authenticated"
        ? user?.id ?? null
        : null
    const [storedState] = useState(loadSimulatorState)
    const storedPartIds = useMemo(
        () => Array.from(new Set(
            storedState
                ? Object.values(storedState.configs).flatMap((selections) =>
                    Object.values(selections),
                )
                : [],
        )),
        [storedState],
    )
    // 保存状態に含まれるIDを重複排除し、復元APIを一度だけ呼び出す。
    const [hasRestoredStoredParts, setHasRestoredStoredParts] = useState(
        storedPartIds.length === 0,
    )
    // localStorageのパーツ取得が終わるまで、ログイン後自動保存を開始しない。
    const [restoreError, setRestoreError] = useState("")
    const [isSavedBuildLoading, setIsSavedBuildLoading] = useState(false)
    const [savedBuildError, setSavedBuildError] = useState("")
    const savedBuildSelectionRequestRef = useRef(0)
    const previousAuthUserIdRef = useRef(authUserId)
    // カテゴリー取得・保存構成取得で得たパーツをID単位で再利用
    const partCacheRef = useRef(new Map<number, Part>())
    // 複数カードの先読みが同じパーツを要求しても通信を共有
    const partRequestsRef = useRef(new Map<number, Promise<void>>())

    // 未取得パーツだけを取得し、同じ構成への同時リクエストは共有
    const loadSavedBuildParts = useCallback((build: SavedBuild) => {
        // 追加構成カードの先読みと選択確定の両方から呼ばれるため、通信共有をここへ集約する。
        const partIds = Array.from(
            new Set(build.parts.map((part) => part.partId)),
        )
        const missingPartIds = partIds.filter((partId) =>
            !partCacheRef.current.has(partId),
        )

        // すべてキャッシュ済みなら、構成選択時の追加通信を発生させない。
        if (missingPartIds.length === 0) {
            return Promise.resolve()
        }

        const requestPartIds = missingPartIds.filter((partId) =>
            !partRequestsRef.current.has(partId),
        )

        // 同じパーツを別カードが先に要求している場合は、そのPromiseを共有する。
        if (requestPartIds.length > 0) {
            const request = fetchPartsByIds(requestPartIds).then((parts) => {
                cacheParts(partCacheRef.current, parts)
            })
            const trackedRequest = request.finally(() => {
                for (const partId of requestPartIds) {
                    if (partRequestsRef.current.get(partId) === trackedRequest) {
                        partRequestsRef.current.delete(partId)
                    }
                }
            })

            for (const partId of requestPartIds) {
                partRequestsRef.current.set(partId, trackedRequest)
            }
        }

        return Promise.all(
            missingPartIds.map((partId) => partRequestsRef.current.get(partId)),
        ).then(() => undefined)
    }, [])

    // 構成カードへカーソルが移動した段階でパーツを先読み
    const prefetchSavedBuild = useCallback((build: SavedBuild) => {
        void loadSavedBuildParts(build).catch(() => {
            // 先読みの失敗は選択時に再試行し、画面にはエラーを表示しない
        })
    }, [loadSavedBuildParts])

    // シミュレーターの状態管理
    const [simulatorState, dispatch] = useReducer(
        simulatorReducer,
        categories[0]?.key ?? "",
        (initialCategory) => {
            // 初期状態
            const initialState = createInitialSimulatorState(
                initialCategory,
            )

            if (!storedState) {
                return initialState
            }

            // localStorageに保存済みの選択構成がある場合だけ、アクティブ構成を引き継ぐ。
            return {
                ...initialState,
                activeConfigId: storedState.activeConfigId,
            }
        },
    )
    // Reducerを介してだけ状態を変更し、固定枠と追加構成の排他ルールを一か所で適用する。

    const {activeConfigId, activeSavedBuildId, activeSlot, configs} = simulatorState
    const {categoryKey: activeCategory} = activeSlot

    // ユーザー変更時に前ユーザーの追加構成選択と読み込み途中の状態を破棄
    useEffect(() => {
        // 認証ユーザーが変わらない初回実行では、現在の構成をリセットしない。
        if (previousAuthUserIdRef.current === authUserId) {
            return
        }

        previousAuthUserIdRef.current = authUserId
        savedBuildSelectionRequestRef.current += 1
        setIsSavedBuildLoading(false)
        setSavedBuildError("")
        dispatch({
            type: "changeConfig",
            configId: activeConfigId,
        })
    }, [activeConfigId, authUserId])

    // 保存済みIDから最新のパーツ情報を復元
    useEffect(() => {
        // 保存状態がない、またはパーツIDが空なら復元用APIを呼ばない。
        if (!storedState || storedPartIds.length === 0) {
            return
        }

        const controller = new AbortController()
        const stateToRestore = storedState

        async function restoreStoredParts() {
            try {
                const parts = await fetchPartsByIds(
                    storedPartIds,
                    controller.signal,
                )
                cacheParts(partCacheRef.current, parts)
                const partsById = new Map(
                    parts.map((part) => [part.id, part]),
                )
                const restoredConfigs = Object.fromEntries(
                    CONFIG_IDS.map((configId) => [
                        configId,
                        Object.fromEntries(
                            Object.entries(stateToRestore.configs[configId]).flatMap(
                                ([slotKey, partId]) => {
                                    const part = partsById.get(partId)

                                    return part?.categoryKey ===
                                        getPartSlotCategoryKey(slotKey)
                                        ? [[slotKey, part]]
                                        : []
                                },
                            ),
                        ),
                    ]),
                ) as ConfigStates

                dispatch({
                    type: "restore",
                    activeConfigId: stateToRestore.activeConfigId,
                    configs: restoredConfigs,
                })
                setRestoreError("")
                setHasRestoredStoredParts(true)
            } catch (error) {
                if (!controller.signal.aborted) {
                    setRestoreError(
                        error instanceof Error
                            ? error.message
                            : "保存済み構成の復元に失敗しました",
                    )
                }
            }
        }

        void restoreStoredParts()

        return () => controller.abort()
    }, [storedPartIds, storedState])

    // 構成変更時の保存
    useEffect(() => {
        if (!hasRestoredStoredParts) {
            return
        }

        saveSimulatorState({
            activeConfigId,
            configs,
        })
    }, [activeConfigId, configs, hasRestoredStoredParts])

    // 現在構成の選択済みパーツ
    const selectedParts = activeSavedBuildId && authUserId
        ? simulatorState.savedBuildParts
        : configs[activeConfigId] ?? EMPTY_SELECTED_PARTS
    // 未認証時は追加構成IDを無効とし、固定枠の選択だけを表示対象にする。

    // 選択済みパーツが占有しているカテゴリー
    const blockedCategoryKeys = useMemo(() => {
        // 一体型ハンドルなどが占有するカテゴリーをSet化し、候補取得前にO(1)で判定する。
        return new Set(
            Object.values(selectedParts).flatMap(
                (part) => part.blockedCategoryKeys ?? [],
            ),
        )
    }, [selectedParts])

    // 現在カテゴリーを占有している選択内容
    const blockingSelections = useMemo(() => {
        // 現在カテゴリーを占有しているパーツだけを解除ダイアログの対象にする。
        return Object.entries(selectedParts).filter(([, part]) =>
            (part.blockedCategoryKeys ?? []).includes(activeCategory),
        )
    }, [activeCategory, selectedParts])

    // 占有中パーツのカテゴリー名
    const blockingCategoryNames = useMemo(() => {
        // 同じカテゴリーを複数スロットが占有しても、表示名は一度だけにまとめる。
        return Array.from(new Set(
            blockingSelections.map(([slotKey]) => {
                const categoryKey = getPartSlotCategoryKey(slotKey)

                return categories.find(
                    (category) => category.key === categoryKey,
                )?.displayName ?? "選択済みパーツ"
            }),
        ))
    }, [blockingSelections, categories])

    // 現在カテゴリーの選択不可メッセージ
    const blockedMessage = blockingSelections.length > 0
        ? `${blockingSelections.map(([, part]) => getPartDisplayName(part)).join("、")}に含まれるため、${
            categories.find((category) => category.key === activeCategory)
                ?.displayName ?? "このカテゴリー"
        }は選択できません。`
        : undefined
    // 解除対象がないときは候補表を通常表示し、あるときだけ解除導線を出す。

    // カテゴリー別の候補パーツ
    const [partsByCategory, setPartsByCategory] = useState<Record<string, Part[]>>({})

    // カテゴリー別のエラーメッセージ
    const [partsErrorsByCategory, setPartsErrorsByCategory] = useState<Record<string, string>>({})

    useEffect(() => {
        // カテゴリー未選択・他パーツに含まれる場合の終了処理
        if (
            !activeCategory ||
            blockedCategoryKeys.has(activeCategory)
        ) {
            return
        }

        // 取得済みパーツの再利用
        if (Object.hasOwn(partsByCategory, activeCategory)) {
            // 同じカテゴリーを戻っても、既存の候補一覧を再取得しない。
            return
        }

        // API通信の中断制御
        const controller = new AbortController()

        // 候補パーツの取得処理
        async function loadParts() {
            try {
                // カテゴリー単位で取得し、取得済みデータはpartsByCategoryへ保存する。
                const parts = await fetchParts(
                    activeCategory,
                    controller.signal,
                )
                cacheParts(partCacheRef.current, parts)

                // 取得結果のカテゴリー別保存
                setPartsByCategory((current) => ({
                    ...current,
                    [activeCategory]: parts,
                }))

                // 取得成功時のエラー削除
                setPartsErrorsByCategory((current) => {
                    const next = {...current}

                    delete next[activeCategory]

                    return next
                })
            } catch (error) {
                // 通信中断以外のエラー処理
                if (!controller.signal.aborted) {
                    setPartsErrorsByCategory((current) => ({
                        ...current,
                        [activeCategory]:
                            error instanceof Error
                                ? error.message
                                : "エラーが発生しました",
                    }))
                }
            }
        }

        // 非同期処理の実行
        void loadParts()

        // カテゴリー変更・画面破棄時の通信中断
        return () => controller.abort()
    }, [activeCategory, blockedCategoryKeys, partsByCategory])

    // 選択中カテゴリーの取得状態
    const hasLoadedActiveCategory = Object.hasOwn(
        partsByCategory,
        activeCategory,
    )
    // 空配列と未取得を区別し、候補表のloading表示を正しく切り替える。

    // 選択中カテゴリーの候補パーツ
    const activeParts = partsByCategory[activeCategory] ?? []

    // 選択中カテゴリーのエラーメッセージ
    const partsError = partsErrorsByCategory[activeCategory] ?? ""

    // 候補パーツの読み込み状態
    const isLoadingParts =
        Boolean(activeCategory) &&
        !hasLoadedActiveCategory &&
        !partsError
    // エラーがある場合はloadingを解除し、再試行可能なエラー表示を優先する。

    // 選択済みパーツの合計
    const {price: totalPrice, weight: totalWeight} = useMemo(
        () => calculateSelectedPartsTotals(selectedParts),
        [selectedParts],
    )
    // 合計値は現在の編集対象だけを元に計算し、固定枠・追加枠を混ぜない。

    // 構成変更処理
    const changeConfig = useCallback((configId: ConfigId) => {
        // 構成切り替えで進行中の追加構成復元を無効化し、古い応答を受け付けない。
        savedBuildSelectionRequestRef.current += 1
        setIsSavedBuildLoading(false)
        setSavedBuildError("")
        dispatch({
            type: "changeConfig",
            configId,
        })
    }, [dispatch])

    // 保存済み追加構成のパーツを取得し、編集対象として読み込む
    const selectSavedBuild = useCallback(async (build: SavedBuild) => {
        // 先にキャッシュ済み部分を表示し、全パーツ取得後に完全な状態へ置き換える。
        const requestId = ++savedBuildSelectionRequestRef.current

        setIsSavedBuildLoading(true)
        setSavedBuildError("")

        try {
            // 通信を待たずに選択中の色を切り替え、カードの反応を先に表示
            const cachedParts = restoreSavedBuildParts(
                build,
                partCacheRef.current,
                true,
            )
            dispatch({
                type: "selectSavedBuild",
                buildId: build.id,
                parts: cachedParts,
            })

            await loadSavedBuildParts(build)

            // 取得中に別の構成が選ばれた場合、古い構成で選択状態を上書きしない。
            if (requestId !== savedBuildSelectionRequestRef.current) {
                return
            }

            const restoredParts = restoreSavedBuildParts(
                build,
                partCacheRef.current,
                false,
            )
            dispatch({
                type: "selectSavedBuild",
                buildId: build.id,
                parts: restoredParts,
            })
        } catch (error) {
            if (
                requestId === savedBuildSelectionRequestRef.current &&
                error instanceof Error
            ) {
                setSavedBuildError(error.message)
            } else if (requestId === savedBuildSelectionRequestRef.current) {
                setSavedBuildError("保存構成の読み込みに失敗しました")
            }
        } finally {
            if (requestId === savedBuildSelectionRequestRef.current) {
                setIsSavedBuildLoading(false)
            }
        }
    }, [loadSavedBuildParts])

    // 競合解決時にD1から取得した固定構成をローカル選択状態へ復元
    const restoreConfigSlot = useCallback(async (slot: ConfigSlot) => {
        // 固定枠もSavedBuildと同じ復元経路へ変換し、パーツ取得・欠落検証を共有する。
        const requestId = ++savedBuildSelectionRequestRef.current
        const buildSnapshot: SavedBuild = {
            id: `config-${slot.configId}`,
            name: slot.name,
            version: slot.version,
            createdAt: slot.updatedAt ?? new Date(0).toISOString(),
            updatedAt: slot.updatedAt ?? new Date(0).toISOString(),
            shareToken: null,
            parts: slot.parts,
        }

        setIsSavedBuildLoading(true)
        setSavedBuildError("")

        try {
            await loadSavedBuildParts(buildSnapshot)

            // 最新の競合解決対象でなくなった復元結果は、現在の編集状態へ反映しない。
            if (requestId !== savedBuildSelectionRequestRef.current) {
                return
            }

            dispatch({
                type: "restoreConfigSlot",
                configId: slot.configId,
                parts: restoreSavedBuildParts(
                    buildSnapshot,
                    partCacheRef.current,
                    false,
                ),
            })
        } catch (error) {
            if (requestId === savedBuildSelectionRequestRef.current) {
                setSavedBuildError(
                    error instanceof Error
                        ? error.message
                        : "固定構成の復元に失敗しました",
                )
            }
        } finally {
            if (requestId === savedBuildSelectionRequestRef.current) {
                setIsSavedBuildLoading(false)
            }
        }
    }, [loadSavedBuildParts])

    // 選択枠変更処理
    const changeSlot = useCallback((slot: PartSlot) => {
        // 前後スロットを含む行情報をそのままReducerへ渡す。
        dispatch({
            type: "changeSlot",
            slot,
        })
    }, [dispatch])

    // カテゴリー変更処理
    const changeCategory = useCallback((category: string) => {
        // 同じカテゴリーなら現在位置を維持し、別カテゴリーなら先頭スロットを選ぶ。
        const nextSlot = activeCategory === category
            ? activeSlot
            : getPartSlots(category)[0]

        changeSlot(nextSlot)
    }, [activeCategory, activeSlot, changeSlot])

    // パーツ選択処理
    const onSelectPart = useCallback((
        part: Part,
        slotKeys?: string[],
        removeSlotKeys?: string[],
    ) => {
        // 候補表から受け取った選択・解除対象をReducerへ一度に渡す。
        dispatch({
            type: "selectPart",
            part,
            slotKeys,
            removeSlotKeys,
        })
    }, [dispatch])

    // 現在カテゴリーを占有するパーツの解除処理
    const onRemoveBlockingParts = useCallback(() => {
        // 現在カテゴリーを占有する全スロットをまとめて解除する。
        dispatch({
            type: "removeParts",
            slotKeys: blockingSelections.map(([slotKey]) => slotKey),
        })
    }, [blockingSelections, dispatch])

    // 現在構成の初期化処理
    const clearActiveConfig = useCallback(() => {
        // 未ログイン時の確認ダイアログから呼ばれ、現在編集中の枠だけを空にする。
        dispatch({
            type: "clearActiveConfig",
        })
    }, [dispatch])

    // 指定構成のローカル選択を初期化し、アクティブ構成ならフレーム選択へ戻す
    const clearConfig = useCallback(async (configId: ConfigId) => {
        // ローカルReducerのクリア後、自動保存フックがD1同期を担当する。
        dispatch({
            type: "clearConfig",
            configId,
        })
    }, [dispatch])

    return {
        activeCategory,
        activeConfigId,
        activeSavedBuildId: authUserId ? activeSavedBuildId : null,
        activeSlot,
        activeParts,
        autoSaveEnabled: autoSaveEnabled && hasRestoredStoredParts,
        blockedCategoryKeys,
        blockedMessage,
        blockingCategoryNames,
        blockingPartNames: blockingSelections.map(([, part]) =>
            getPartDisplayName(part),
        ),
        configs,
        isLoadingParts,
        isSavedBuildLoading,
        partsError,
        restoreError,
        savedBuildError,
        selectedPart: selectedParts[activeSlot.key],
        selectedParts,
        slotPositionLabel: getPartSlotPositionLabel(activeSlot.position),
        totalPrice,
        totalWeight,
        changeCategory,
        changeConfig,
        restoreConfigSlot,
        changeSlot,
        clearActiveConfig,
        clearConfig,
        onRemoveBlockingParts,
        onSelectPart,
        prefetchSavedBuild,
        selectSavedBuild,
    }
}
