import type {SavedBuild} from "@/api/savedBuilds"
import {
    MAX_CONFIGS,
    configItemKey,
    type StoredConfig,
} from "@/features/saved-builds/configRules"
import {
    loadLocalConfigCollection,
    saveLocalConfigCollection,
    type LocalConfigCollection,
} from "@/lib/simulator-storage"

// 由来アカウントの保存キー
const ORIGIN_STORAGE_KEY = "barakann-local-config-origin-v1"
// 移行が完了していないアカウントの保存キー
const INCOMPLETE_MIGRATION_STORAGE_KEY =
    "barakann-local-config-incomplete-migration-v1"

// 移行可否（新規・重複・上限超過）
export type MigrationCandidateStatus = "new" | "duplicate" | "over-limit"

// 移行候補
export type MigrationCandidate = {
    config: StoredConfig // ローカル構成
    status: MigrationCandidateStatus // 判定結果
}

// 移行計画
export type MigrationPlan = {
    candidates: MigrationCandidate[] // 候補
    defaultSelectedIds: string[] // 既定選択
    remainingSlots: number // 残り枠
    // 置き換える初期構成
    replaceInitialConfig: {id: string; version: number} | null
    // 判定件数
    counts: {
        duplicate: number // 完全一致
        new: number // 新規
        overLimit: number // 上限超過
    }
}

// ログアウト保存用の構成
export type SavedConfigSnapshot = {
    configs: StoredConfig[] // 構成
    order: string[] // 表示順
}

// localStorageが使えない環境でも処理を止めない
function getStorage(): Storage | null {
    // localStorageへの参照自体が例外になるブラウザがあるため、ここで包む
    try {
        // サーバー側(SSR)ではwindowが無いのでnullを返す
        return typeof window === "undefined" ? null : window.localStorage
    } catch {
        return null
    }
}

// 構成の内容を、並び順に依存しない「一致判定用キー」にする
// 名前とパーツ構成を1つの文字列にまとめ、同じ構成かどうかの比較に使う
export function createConfigMatchKey(config: StoredConfig): string {
    // パーツの取得順に依存しないよう、slotKey順に並べてから連結
    const parts = config.parts
        .map((part) => `${part.slotKey}:${part.partId}`)
        .sort()
        .join(",")

    return `${config.name.trim()}|${parts}`
}

// ローカル構成の由来アカウントを読み取る
export function loadLocalOrigin(): string | null {
    const storage = getStorage()

    // localStorageが使えない環境では由来を判定できないためnullを返す
    if (!storage) {
        return null
    }

    return storage.getItem(ORIGIN_STORAGE_KEY)
}

// ローカル構成の由来アカウントを記録し、nullで消去
// 保存できたかを返し、呼び出し元が失敗を判断できるようにする
export function saveLocalOrigin(accountId: string | null): boolean {
    const storage = getStorage()

    // localStorageが使えない環境では記録できないため、失敗として返す
    if (!storage) {
        return false
    }

    try {
        // nullは「由来を消す」指示。別アカウントの判定を残さない
        if (accountId === null) {
            storage.removeItem(ORIGIN_STORAGE_KEY)
            return true
        }

        // 由来を記録し、次回ログイン時に同じアカウントか判定
        storage.setItem(ORIGIN_STORAGE_KEY, accountId)

        return true
    } catch {
        // 容量超過などで書けなかった場合は失敗として返す
        return false
    }
}

// ローカルの構成を、ログイン中のアカウントへ移行してよいか判定
// 由来が無い(未ログインで作った)か、同じアカウントのときだけ移行
export function canMigrateForAccount(
    origin: string | null,
    accountId: string,
): boolean {
    return origin === null || origin === accountId
}

// ローカル構成から、移行候補と重複・上限超過を判定
export function buildMigrationPlan(
    localConfigs: StoredConfig[], // ローカル構成
    serverConfigs: SavedBuild[], // アカウント構成
    maxConfigs: number, // 上限
): MigrationPlan {
    // ログイン直後は空の「構成1」が1件だけ自動作成されている
    // 空の構成を残したまま移行すると件数が増えてしまうため、置き換え対象として扱う
    const replaceInitialConfig = serverConfigs.length === 1 &&
        serverConfigs[0]?.name === "構成1" &&
        serverConfigs[0].parts.length === 0
        ? {id: serverConfigs[0].id, version: serverConfigs[0].version}
        : null

    // 置き換える場合は、アカウント側に構成が無いものとして残り枠と重複を判定
    const effectiveServerConfigs = replaceInitialConfig ? [] : serverConfigs

    // アカウント側の構成を「一致判定用キー」に変え、名前＋パーツの比較に使う
    const serverMatchKeys = new Set(
        // キーの作成に必要な項目(名前・パーツ)だけを取り出す
        effectiveServerConfigs.map((config) => createConfigMatchKey({
            id: config.id,
            name: config.name,
            parts: config.parts,
        })),
    )
    // 上限からアカウントの件数を引き、移行できる残り枠を出す(負にはしない)
    const remainingSlots = Math.max(
        0,
        maxConfigs - effectiveServerConfigs.length,
    )

    // 残り枠をいくつ使ったかを数えるカウンター
    let newCount = 0

    // パーツが空の構成は移行しても意味が無いため、候補から外す
    // (新規利用者の初期構成「構成1」で毎回ダイアログが出るのを防ぐ)
    const migratableConfigs = localConfigs.filter((config) =>
        config.parts.length > 0)

    // ローカル同士で同じ構成が並ぶ場合も、2件目以降を重複として扱う
    const localMatchKeys = new Set<string>()

    // ローカルの並び順のまま判定し、画面の表示順と一致させる
    const candidates = migratableConfigs.map((config): MigrationCandidate => {
        // 名前＋パーツ構成からキーを作り、アカウント側・ローカル側に同じ構成があるか調べる
        const matchKey = createConfigMatchKey(config)

        // 同じ構成が既にある場合は、二重登録しないよう選択不可にする
        if (serverMatchKeys.has(matchKey) || localMatchKeys.has(matchKey)) {
            return {config, status: "duplicate"}
        }

        localMatchKeys.add(matchKey)

        // 残り枠を超えた分は移行できないため、上限超過として扱う
        if (newCount >= remainingSlots) {
            return {config, status: "over-limit"}
        }

        newCount += 1

        return {config, status: "new"}
    })

    // 既定では新規の構成だけを選択し、重複・上限超過は選ばない
    const defaultSelectedIds = candidates
        .filter((candidate) => candidate.status === "new")
        .map((candidate) => candidate.config.id)

    // 画面の上部に「一致・新規・上限超過」の件数を出す
    const counts = {
        duplicate: candidates.filter((candidate) =>
            candidate.status === "duplicate").length,
        new: candidates.filter((candidate) =>
            candidate.status === "new").length,
        overLimit: candidates.filter((candidate) =>
            candidate.status === "over-limit").length,
    }

    return {
        candidates,
        defaultSelectedIds,
        remainingSlots,
        replaceInitialConfig,
        counts,
    }
}

// 選択されたIDのうち、実際に移行できる構成を返す
export function selectMigrationTargets(
    plan: MigrationPlan,
    selectedIds: string[],
): StoredConfig[] {
    return plan.candidates
        .filter((candidate) =>
            candidate.status !== "duplicate" &&
            selectedIds.includes(candidate.config.id))
        .map((candidate) => candidate.config)
}

// 再取得後の計画に合わせて、移行できない構成を選択から外す
export function intersectSelectableIds(
    plan: MigrationPlan,
    selectedIds: string[],
): string[] {
    return selectedIds.filter((id) => plan.candidates.some((candidate) =>
        candidate.config.id === id && candidate.status !== "duplicate"))
}


// 移行が完了していないアカウントを記録する
export function markLocalMigrationIncomplete(accountId: string): boolean {
    try {
        window.localStorage.setItem(INCOMPLETE_MIGRATION_STORAGE_KEY, accountId)

        return true
    } catch {
        // 記録できなくても移行自体は続けられる
        return false
    }
}

// 移行が完了していないアカウントか判定する
export function hasIncompleteLocalMigration(accountId: string): boolean {
    try {
        return window.localStorage.getItem(INCOMPLETE_MIGRATION_STORAGE_KEY) ===
            accountId
    } catch {
        return false
    }
}

// 移行が完了したアカウントの記録を、そのアカウントのときだけ消す
export function clearLocalMigrationIncomplete(accountId: string): void {
    try {
        // 別アカウントの未移行記録を消さない
        if (
            window.localStorage.getItem(INCOMPLETE_MIGRATION_STORAGE_KEY) !==
            accountId
        ) {
            return
        }

        window.localStorage.removeItem(INCOMPLETE_MIGRATION_STORAGE_KEY)
    } catch {
        // 消せなくても次回の移行で上書きされる
    }
}

// 構成IDごとの表示順キーを、希望順と構成一覧から作る
function orderedConfigKeys(
    configs: StoredConfig[],
    preferredOrder: string[],
): string[] {
    // 構成一覧に存在する表示順キー
    const configKeys = configs.map((config) => configItemKey(config.id))

    return [
        ...preferredOrder.filter((key) => configKeys.includes(key)),
        ...configKeys.filter((key) => !preferredOrder.includes(key)),
    ]
}

// アカウントの構成をローカルへ保存する(ログアウト時)
// 移行に失敗した構成が残る場合だけ、サーバー構成で上書きする前に統合
export function saveServerSnapshotToLocal(
    accountId: string,
    snapshot: SavedConfigSnapshot,
): boolean {
    // 保存できなかった場合に中途半端な由来だけ残さないよう、以前の由来を退避
    // 失敗時に戻せるよう、以前の由来を退避しておく
    const previousOrigin = loadLocalOrigin()

    // 移行に失敗した構成が残る場合だけ統合し、通常のログアウトは上書きのまま
    const canMergeLocal = hasIncompleteLocalMigration(accountId) &&
        canMigrateForAccount(previousOrigin, accountId)
    // 統合対象のローカル構成一覧（別アカウント由来なら空）
    const localCollection: LocalConfigCollection = canMergeLocal
        ? loadLocalConfigCollection()
        : {configs: [], order: []}
    // サーバー構成と同一と判定するためのキー一覧
    const serverMatchKeys = new Set(
        snapshot.configs.map((config) => createConfigMatchKey(config)),
    )
    // サーバー構成のID一覧
    const serverIds = new Set(snapshot.configs.map((config) => config.id))
    // サーバーに無いローカル構成（移行できていない構成）
    const localOnlyConfigs: StoredConfig[] = []
    // ローカル構成同士の重複判定用キー
    const localMatchKeys = new Set<string>()

    for (const config of localCollection.configs) {
        // サーバーに同じID・同じ内容の構成があれば移行済みとして除く
        if (
            serverIds.has(config.id) ||
            serverMatchKeys.has(createConfigMatchKey(config))
        ) {
            continue
        }

        // ローカル内で同じ内容が重複していれば1件だけ残す
        const matchKey = createConfigMatchKey(config)

        // 同じ内容の構成が既にあれば追加しない
        if (localMatchKeys.has(matchKey)) {
            continue
        }

        localMatchKeys.add(matchKey)
        localOnlyConfigs.push(config)
    }

    // 上限超過時はサーバーにも残る構成より、未移行のローカル構成を優先
    const localConfigsToKeep = localOnlyConfigs.slice(0, MAX_CONFIGS)
    // ローカルへ残せる残り枠に収まるサーバー構成
    const serverConfigsToKeep = snapshot.configs.slice(
        0,
        Math.max(0, MAX_CONFIGS - localConfigsToKeep.length),
    )
    // サーバー構成と未移行のローカル構成を合わせた一覧
    const mergedConfigs = [...serverConfigsToKeep, ...localConfigsToKeep]
    // 統合後の表示順（サーバー構成の後ろへ残したローカル構成を続ける）
    const mergedOrder = [
        ...orderedConfigKeys(serverConfigsToKeep, snapshot.order),
        ...orderedConfigKeys(localConfigsToKeep, localCollection.order),
    ]

    // 由来を先に記録し、構成の保存に失敗したら元へ戻す
    if (!saveLocalOrigin(accountId)) {
        return false
    }

    const saved = saveLocalConfigCollection(mergedConfigs, mergedOrder)

    // 保存に失敗したら以前の由来へ戻し、中途半端な状態を残さない
    if (!saved) {
        saveLocalOrigin(previousOrigin)
        return false
    }

    // 統合できたら未移行の記録を消し、次回から通常の上書きに戻す
    clearLocalMigrationIncomplete(accountId)

    return true
}
