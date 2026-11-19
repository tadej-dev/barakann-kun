import type {SavedBuild} from "@/api/savedBuilds"
import type {StoredConfig} from "@/features/saved-builds/configRules"
import {saveLocalConfigCollection} from "@/lib/simulator-storage"

// ローカル構成の由来アカウントを保存するキー
const ORIGIN_STORAGE_KEY = "barakann-local-config-origin-v1"

// 構成の移行可否。重複・上限超過を画面で区別する
export type MigrationCandidateStatus = "new" | "duplicate" | "over-limit"

// 1件の移行候補。構成そのものと、移行できるかの判定結果を持つ
export type MigrationCandidate = {
    config: StoredConfig // ローカル保存構成
    status: MigrationCandidateStatus // 新規・重複・上限超過のいずれか
}

// 移行ダイアログに表示する候補と、初期状態の選択
export type MigrationPlan = {
    candidates: MigrationCandidate[] // 移行ダイアログに表示する候補(ローカル構成と判定結果)
    defaultSelectedIds: string[] // 既定で選択する構成(重複と上限超過は除く)
    remainingSlots: number // 保存できる残り件数
}

// ログアウト時にローカルへ保存する構成のまとまり
export type SavedConfigSnapshot = {
    configs: StoredConfig[] // 構成の内容
    order: string[] // 表示順(構成IDの並び)
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
    // パーツの取得順に依存しないよう、slotKey順に並べてから連結する
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

// ローカル構成の由来アカウントを記録する。nullで消去する
export function saveLocalOrigin(accountId: string | null): void {
    const storage = getStorage()

    // localStorageが使えない環境では記録できないため、何もせず戻る
    if (!storage) {
        return
    }

    // nullは「由来を消す」指示。別アカウントの判定を残さない
    if (accountId === null) {
        storage.removeItem(ORIGIN_STORAGE_KEY)
        return
    }

    // 由来を記録し、次回ログイン時に同じアカウントか判定する
    storage.setItem(ORIGIN_STORAGE_KEY, accountId)
}

// ローカル構成から、移行候補と重複・上限超過を判定する
export function buildMigrationPlan(
    localConfigs: StoredConfig[], // ブラウザに保存されている構成
    serverConfigs: SavedBuild[], // アカウントに保存済みの構成
    maxConfigs: number, // 構成の上限(20件)
): MigrationPlan {
    // アカウント側の構成を「一致判定用キー」に変え、名前＋パーツの比較に使う
    const serverMatchKeys = new Set(
        // キーの作成に必要な項目(名前・パーツ)だけを取り出す
        serverConfigs.map((config) => createConfigMatchKey({
            id: config.id,
            name: config.name,
            parts: config.parts,
        })),
    )
    // 上限からアカウントの件数を引き、移行できる残り枠を出す(負にはしない)
    const remainingSlots = Math.max(0, maxConfigs - serverConfigs.length)

    // 残り枠をいくつ使ったかを数えるカウンター
    let newCount = 0

    // ローカルの並び順のまま判定し、画面の表示順と一致させる
    const candidates = localConfigs.map((config): MigrationCandidate => {
        // 名前＋パーツ構成からキーを作り、アカウント側に同じ構成があるか調べる
        const matchKey = createConfigMatchKey(config)

        // 同じ構成が既にある場合は、二重登録しないよう選択不可にする
        if (serverMatchKeys.has(matchKey)) {
            return {config, status: "duplicate"}
        }

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

    return {candidates, defaultSelectedIds, remainingSlots}
}

// アカウントの構成をローカルへ保存する(ログアウト時)
export function saveServerSnapshotToLocal(
    accountId: string,
    snapshot: SavedConfigSnapshot,
): boolean {
    // 容量超過などで保存できなかった場合は、中途半端に由来だけ記録しない
    const saved = saveLocalConfigCollection(snapshot.configs, snapshot.order)

    // 保存に失敗したらfalseを返し、呼び出し元が再試行や中止を選べるようにする
    if (!saved) {
        return false
    }

    // 保存できたときだけ由来を記録し、次回ログイン時の判定に使う
    saveLocalOrigin(accountId)

    return true
}
