import {
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from "react"

import {fetchParts, fetchPartsByIds} from "@/api/parts"
import type {SavedBuild} from "@/api/savedBuilds"
import {useAuth} from "@/features/auth/useAuth"
import {blocksCategory} from "../../../../shared/part-compatibility-core"
import {
    calculateSelectedPartsTotals,
    evaluateSelectedPartsCompatibility,
} from "@/features/simulator/partCompatibility"
import {getPartDisplayName} from "@/features/simulator/partDisplay"
import {
    getPartSlotCategoryKey,
    getPartSlotPositionLabel,
    getPartSlots,
    type PartSlot,
} from "@/features/simulator/partSlots"
import {
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
    categories: Category[] // パーツカテゴリー一覧
    autoSaveEnabled: boolean // 自動保存を有効にするか
}

// 画面へ渡すシミュレーターの状態と操作
export type SimulatorController = {
    activeCategory: string // 選択中パーツのカテゴリーキー
    activeConfigId: ConfigId // 編集中の構成ID
    activeSlot: PartSlot // 選択中のパーツ選択枠
    activeParts: Part[] // 選択中カテゴリーの候補パーツ
    autoSaveEnabled: boolean // 自動保存を実行できる状態か
    blockedCategoryKeys: Set<string> // 占有中で選択できないカテゴリーキー
    blockedMessage: string | undefined // 占有理由の案内文（選択可能はundefined）
    blockingCategoryNames: string[] // 選択中カテゴリーを占有するカテゴリー名
    blockingPartNames: string[] // 選択中カテゴリーを占有するパーツ名
    configs: ConfigStates // 構成別の選択済みパーツ
    isLoadingParts: boolean // 候補パーツの読み込み中フラグ
    isConfigLoading: boolean // 保存構成の読み込み中フラグ
    loadedConfigIds: string[] // 保存内容を読み込んで編集中の状態にある構成ID
    partsError: string // 候補パーツ取得のエラーメッセージ
    restoreError: string // localStorage復元のエラーメッセージ
    savedBuildError: string // 保存構成読み込みのエラーメッセージ
    selectedPart: Part | undefined // 選択中の枠に入っているパーツ
    selectedParts: SelectedParts // 編集中の構成の選択済みパーツ
    slotPositionLabel: string | null // 選択枠の前後表示名（単一枠はnull）
    totalPrice: number // 選択済みパーツの合計価格（円）
    totalWeight: number // 選択済みパーツの合計重量（g）
    changeCategory: (category: string) => void // カテゴリーを切り替える関数
    changeConfig: (configId: ConfigId) => void // 構成を切り替える関数
    restoreConfig: (config: SavedBuild) => Promise<void> // 保存構成を編集状態へ復元する関数
    changeSlot: (slot: PartSlot) => void // 選択枠を変更する関数
    clearConfig: (configId: ConfigId) => Promise<void> // 構成の選択内容を空にする関数
    onRemoveBlockingParts: () => void // 占有中のパーツをまとめて解除する関数
    // 候補パーツを選択する関数
    onSelectPart: (
        part: Part,
        slotKeys?: string[],
        removeSlotKeys?: string[],
    ) => void
    prefetchConfig: (config: SavedBuild) => void // 保存構成のパーツを先読みする関数
    selectConfig: (config: SavedBuild) => Promise<void> // 保存構成を選択して読み込む関数
    isConfigLoaded: (configId: string) => boolean // 構成の保存内容を読み込み済みか返す関数
}

// 空の選択済みパーツ
const EMPTY_SELECTED_PARTS: SelectedParts = {}

// 保存構成のスロット情報を、取得済みパーツへ変換
function restoreSavedBuildParts(
    build: SavedBuild,
    partsById: ReadonlyMap<number, Part>,
): SelectedParts {
    // 保存時のslotKeyをそのまま維持し、表示用の最新Partだけを差し替える。
    // 復元した選択済みパーツ
    const restoredParts: SelectedParts = {}

    for (const savedPart of build.parts) {
        // 保存されたパーツIDに対応する最新パーツ
        const part = partsById.get(savedPart.partId)

        // カタログに無いパーツは復元できない
        if (!part) {
            throw new Error(
                `「${build.name}」に含まれるパーツを読み込めませんでした`,
            )
        }

        // 保存データとカテゴリーが違う場合は誤った枠へ復元しない
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

// 復元経路からも既知の規格不一致を持つ構成を編集状態へ入れない
function assertRestoredPartsAreCompatible(
    parts: SelectedParts,
    buildName: string,
) {
    // 最初に見つかった非互換の問題
    const issue = evaluateSelectedPartsCompatibility(parts).find(
        (candidate) => candidate.status === "incompatible",
    )

    // 非互換が無ければ何もしない
    if (!issue) {
        return
    }

    throw new Error(
        `「${buildName}」には規格が一致しないパーツが含まれています。${issue.reasons.join("、")}`,
    )
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
    // ログイン中のユーザーID（未ログインはnull）
    const authUserId = authStatus === "authenticated"
        ? user?.id ?? null
        : null
    // localStorageから読み込んだ保存状態
    const [storedState] = useState(loadSimulatorState)
    // 保存状態に含まれるパーツID（重複を除外）
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
    const [restoreError, setRestoreError] = useState("") // localStorage復元のエラーメッセージ
    const [isConfigLoading, setIsConfigLoading] = useState(false) // 保存構成の読み込み中フラグ
    const [loadedConfigIds, setLoadedConfigIds] = useState<string[]>([]) // 読み込み済みの構成ID
    const [savedBuildError, setSavedBuildError] = useState("") // 保存構成読み込みのエラーメッセージ
    const savedBuildSelectionRequestRef = useRef(0) // 保存構成選択の実行番号（古い応答の破棄用）
    const previousAuthUserIdRef = useRef(authUserId) // 直前の認証ユーザーID
    const partCacheRef = useRef(new Map<number, Part>()) // カテゴリー取得・保存構成取得で得たパーツをID単位で再利用
    const partRequestsRef = useRef(new Map<number, Promise<void>>()) // 複数カードの先読みが同じパーツを要求しても通信を共有

    // 未取得パーツだけを取得し、同じ構成への同時リクエストは共有
    const loadSavedBuildParts = useCallback((build: SavedBuild) => {
        // 追加構成カードの先読みと選択確定の両方から呼ばれるため、通信共有をここへ集約する。
        // 保存構成に含まれるパーツID（重複を除外）
        const partIds = Array.from(
            new Set(build.parts.map((part) => part.partId)),
        )
        // キャッシュに無いパーツID
        const missingPartIds = partIds.filter((partId) =>
            !partCacheRef.current.has(partId),
        )

        // すべてキャッシュ済みなら、構成選択時の追加通信を発生させない。
        if (missingPartIds.length === 0) {
            return Promise.resolve()
        }

        // まだ取得を開始していないパーツID
        const requestPartIds = missingPartIds.filter((partId) =>
            !partRequestsRef.current.has(partId),
        )

        // 同じパーツを別カードが先に要求している場合は、そのPromiseを共有する。
        if (requestPartIds.length > 0) {
            // パーツ取得のPromise
            const request = fetchPartsByIds(requestPartIds).then((parts) => {
                cacheParts(partCacheRef.current, parts)
            })
            // 完了時に共有記録から外すPromise
            const trackedRequest = request.finally(() => {
                for (const partId of requestPartIds) {
                    // 記録が同じPromiseのときだけ共有記録を消す
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
    // 規格判定の基準となるフレームから選択を開始する
    const initialCategory = "frame"
    // 構成別の選択状態をReducerで管理
    const [simulatorState, dispatch] = useReducer(
        simulatorReducer,
        initialCategory,
        (initialCategory) => {
            // 初期状態
            const initialState = createInitialSimulatorState(
                initialCategory,
            )

            // 保存状態が無ければ初期状態を返す
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

    // 選択中の構成ID・選択枠・構成別の選択状態
    const {activeConfigId, activeSlot, configs} = simulatorState
    // 選択中パーツのカテゴリーキー
    const {categoryKey: activeCategory} = activeSlot

    // ユーザー変更時に前ユーザーの追加構成選択と読み込み途中の状態を破棄
    useEffect(() => {
        // 認証ユーザーが変わらない初回実行では、現在の構成をリセットしない。
        if (previousAuthUserIdRef.current === authUserId) {
            return
        }

        previousAuthUserIdRef.current = authUserId
        savedBuildSelectionRequestRef.current += 1
        setIsConfigLoading(false)
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

        // 復元用パーツ取得を中断する制御
        const controller = new AbortController()
        // 復元対象の保存状態
        const stateToRestore = storedState

        // 保存済みパーツを取得して構成を復元
        async function restoreStoredParts() {
            try {
                // 取得した最新パーツ
                const parts = await fetchPartsByIds(
                    storedPartIds,
                    controller.signal,
                )
                cacheParts(partCacheRef.current, parts)
                // パーツIDからパーツを引く対応表
                const partsById = new Map(
                    parts.map((part) => [part.id, part]),
                )
                // 保存されているすべての構成を復元する
                // 復元した構成別の選択状態
                const restoredConfigs = Object.fromEntries(
                    Object.entries(stateToRestore.configs).map(
                        ([configId, selections]) => [
                            configId,
                            Object.fromEntries(
                                Object.entries(selections).flatMap(
                                    ([slotKey, partId]) => {
                                        // 保存されたパーツIDに対応する最新パーツ
                                        const part = partsById.get(partId)

                                        return part?.categoryKey ===
                                            getPartSlotCategoryKey(slotKey)
                                            ? [[slotKey, part]]
                                            : []
                                    },
                                ),
                            ),
                        ],
                    ),
                ) as ConfigStates

                // 互換性違反で空にした構成があるか
                let hadIncompatibleState = false

                for (const configId of Object.keys(restoredConfigs)) {
                    // 古いlocalStorageからの復元でも、既知の不一致を現行状態へ持ち込まない
                    try {
                        assertRestoredPartsAreCompatible(
                            restoredConfigs[configId],
                            `構成${configId}`,
                        )
                    } catch {
                        // 互換性違反の構成は空にして復元を続行し、他構成の復元を妨げない
                        restoredConfigs[configId] = {}
                        hadIncompatibleState = true
                    }
                }

                // 互換性違反で空にした構成があれば保存し直す
                if (hadIncompatibleState) {
                    // 破棄した構成を保存し直し、次回以降の復元失敗を防ぐ
                    saveSimulatorState({
                        activeConfigId: stateToRestore.activeConfigId,
                        configs: restoredConfigs,
                    })
                }

                dispatch({
                    type: "restore",
                    activeConfigId: stateToRestore.activeConfigId,
                    configs: restoredConfigs,
                })
                setRestoreError("")
                setHasRestoredStoredParts(true)
            } catch (error) {
                // 中断されていなければ復元エラーを表示
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
        // localStorageの復元が終わるまでは保存しない
        if (!hasRestoredStoredParts) {
            return
        }

        saveSimulatorState({
            activeConfigId,
            configs,
        })
    }, [activeConfigId, configs, hasRestoredStoredParts])

    // 現在構成の選択済みパーツ
    const selectedParts = configs[activeConfigId] ?? EMPTY_SELECTED_PARTS

    // 選択済みパーツが占有しているカテゴリー
    const blockedCategoryKeys = useMemo(() => {
        // 一体型ハンドルなどが占有するカテゴリーをSet化し、候補取得前にO(1)で判定する。
        // 交換可能な付属コックピットの占有は除き、規格判定側で可否を決める。
        return new Set(
            Object.values(selectedParts).flatMap((part) =>
                (part.blockedCategoryKeys ?? []).filter((categoryKey) =>
                    blocksCategory(part, categoryKey),
                ),
            ),
        )
    }, [selectedParts])

    // 現在カテゴリーを占有している選択内容
    const blockingSelections = useMemo(() => {
        // 現在カテゴリーを占有しているパーツだけを解除ダイアログの対象にする。
        return Object.entries(selectedParts).filter(([, part]) =>
            blocksCategory(part, activeCategory),
        )
    }, [activeCategory, selectedParts])

    // 占有中パーツのカテゴリー名
    const blockingCategoryNames = useMemo(() => {
        // 同じカテゴリーを複数スロットが占有しても、表示名は一度だけにまとめる。
        return Array.from(new Set(
            blockingSelections.map(([slotKey]) => {
                // 占有パーツのカテゴリーキー
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

    // 選択中カテゴリーの候補パーツを取得
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
        setIsConfigLoading(false)
        setSavedBuildError("")
        dispatch({
            type: "changeConfig",
            configId,
        })
    }, [dispatch])

    // 保存済み構成のパーツを取得し、編集対象として読み込む
    const selectConfig = useCallback(async (config: SavedBuild) => {
        // 保存構成選択の実行番号
        const requestId = ++savedBuildSelectionRequestRef.current

        setIsConfigLoading(true)
        setSavedBuildError("")

        try {
            await loadSavedBuildParts(config)

            // 取得中に別の構成が選ばれた場合、古い構成で選択状態を上書きしない。
            if (requestId !== savedBuildSelectionRequestRef.current) {
                return
            }

            // 復元した選択済みパーツ
            const restoredParts = restoreSavedBuildParts(
                config,
                partCacheRef.current,
            )
            assertRestoredPartsAreCompatible(restoredParts, config.name)
            dispatch({
                type: "restoreConfigSlot",
                configId: config.id,
                parts: restoredParts,
            })
            dispatch({
                type: "changeConfig",
                configId: config.id,
            })
            setLoadedConfigIds((current) => current.includes(config.id)
                ? current
                : [...current, config.id])
        } catch (error) {
            // 最後に開始した選択でエラー内容があれば理由を表示
            if (
                requestId === savedBuildSelectionRequestRef.current &&
                error instanceof Error
            ) {
                setSavedBuildError(error.message)
            // 最後に開始した選択なら原因不明のエラーを表示
            } else if (requestId === savedBuildSelectionRequestRef.current) {
                setSavedBuildError("構成の読み込みに失敗しました")
            }
        } finally {
            // 最後に開始した選択なら読み込み中表示を解除
            if (requestId === savedBuildSelectionRequestRef.current) {
                setIsConfigLoading(false)
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
        isConfigLoading,
        loadedConfigIds,
        // 構成の保存内容を読み込み済みか
        isConfigLoaded: (configId: string) =>
            loadedConfigIds.includes(configId),
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
        restoreConfig: selectConfig,
        changeSlot,
        clearConfig,
        onRemoveBlockingParts,
        onSelectPart,
        prefetchConfig: prefetchSavedBuild,
        selectConfig,
    }
}
