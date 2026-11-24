import {
    MAX_PARTS_PER_BUILD,
    MAX_SAVED_BUILDS,
    isSavedBuildId,
    type SavedBuildPart,
} from "@/api/savedBuilds"
import {
    MAX_CONFIG_ORDER_ITEM_LENGTH,
    MAX_CONFIG_ORDER_ITEMS,
} from "@/api/configOrder"
import {
    isNonNegativeSafeInteger,
    isPartSlotKey,
    isPositiveSafeInteger,
    isRecord,
} from "@/api/responseValidation"

// 構成の上限(1〜20件)
export const MAX_CONFIGS = MAX_SAVED_BUILDS

// 構成名の長さ(サーバーのsavedBuildNameSchemaと揃える)
export const MAX_BUILD_NAME_LENGTH = 50

// 表示順の件数とキーの長さは、APIの検証と同じ定数を使う
export const MAX_ORDER_ITEMS = MAX_CONFIG_ORDER_ITEMS
// 表示順キーの最大長（200文字）
export const MAX_ORDER_KEY_LENGTH = MAX_CONFIG_ORDER_ITEM_LENGTH

// 未ログイン時に保存する構成。パーツは保存時点の価格・重量も持つ
export type StoredConfig = {
    id: string // 構成ID（UUID）
    name: string // 構成名（1〜50文字）
    parts: SavedBuildPart[] // 保存時点の価格・重量を含むパーツ一覧
}

// 未ログイン時に保存する構成一覧と表示順
export type LocalConfigCollection = {
    configs: StoredConfig[] // 保存済みの構成一覧
    order: string[] // 構成の表示順（config:ID形式）
}

// 構成を表示順で扱うためのキー。APIの表示順と同じ形式に揃える
export function configItemKey(configId: string): string {
    return `config:${configId}`
}

// 構成名を前後の空白を除いて整える。空・長すぎる名前は受け付けない
export function normalizeBuildName(value: string): string | null {
    const name = value.trim()

    return name.length >= 1 && name.length <= MAX_BUILD_NAME_LENGTH
        ? name
        : null
}

// パーツ一覧を検証し、同じスロットの重複を除いて上限までに整える
export function normalizeBuildParts(value: unknown): SavedBuildPart[] {
    // 配列でない壊れた値は空のパーツ一覧にする
    if (!Array.isArray(value)) {
        return []
    }

    // 同じスロットキーの重複を除くための記録
    const seenSlotKeys = new Set<string>()
    // 検証を通ったパーツ（上限まで）
    const parts: SavedBuildPart[] = []

    for (const part of value) {
        // パーツ数が上限（100件）に達したら残りを読み飛ばす
        if (parts.length >= MAX_PARTS_PER_BUILD) {
            break
        }

        // オブジェクトでない項目は読み飛ばす
        if (!isRecord(part)) {
            continue
        }

        // サーバーはtrimしてからスロット名を検証するため、同じ順序で扱う
        // 前後空白を除いたスロットキー（文字列以外は空）
        const slotKey = typeof part.slotKey === "string"
            ? part.slotKey.trim()
            : ""

        // スロット・ID・価格・重量のいずれかが不正なら読み飛ばす
        if (
            !isPartSlotKey(slotKey) ||
            seenSlotKeys.has(slotKey) ||
            !isPositiveSafeInteger(part.partId) ||
            !isNonNegativeSafeInteger(part.price) ||
            !isNonNegativeSafeInteger(part.weight)
        ) {
            continue
        }

        seenSlotKeys.add(slotKey)
        parts.push({
            slotKey,
            partId: part.partId,
            price: part.price,
            weight: part.weight,
        })
    }

    return parts
}

// 構成一覧を検証する。壊れた項目は読み飛ばし、IDの重複を除いて上限までに整える
export function normalizeConfigs(value: unknown): StoredConfig[] {
    // 配列でない壊れた値は空の構成一覧にする
    if (!Array.isArray(value)) {
        return []
    }

    // 同じ構成IDの重複を除くための記録
    const seenIds = new Set<string>()
    // 検証を通った構成（上限まで）
    const configs: StoredConfig[] = []

    for (const config of value) {
        // 構成数が上限（20件）に達したら残りを読み飛ばす
        if (configs.length >= MAX_CONFIGS) {
            break
        }

        // ID・名前・重複のいずれかが不正なら読み飛ばす
        if (
            !isRecord(config) ||
            !isSavedBuildId(config.id) ||
            seenIds.has(config.id) ||
            typeof config.name !== "string"
        ) {
            continue
        }

        // 前後空白を除いた構成名（不正はnull）
        const name = normalizeBuildName(config.name)

        // 名前が1〜50文字でなければ読み飛ばす
        if (!name) {
            continue
        }

        seenIds.add(config.id)
        configs.push({
            id: config.id,
            name,
            parts: normalizeBuildParts(config.parts),
        })
    }

    return configs
}

// 表示順を検証する。空文字・長すぎるキー・重複を除いて上限までに整える
export function normalizeConfigOrder(value: unknown): string[] {
    // 配列でない壊れた値は空の表示順にする
    if (!Array.isArray(value)) {
        return []
    }

    // 同じ表示順キーの重複を除くための記録
    const seenKeys = new Set<string>()
    // 検証を通った表示順（上限まで）
    const order: string[] = []

    for (const key of value) {
        // 表示順が上限（20件）に達したら残りを読み飛ばす
        if (order.length >= MAX_ORDER_ITEMS) {
            break
        }

        // 文字列でない項目は読み飛ばす
        if (typeof key !== "string") {
            continue
        }

        // 前後空白を除いた表示順キー
        const itemKey = key.trim()

        // キーが空・長すぎる・重複なら読み飛ばす
        if (
            itemKey.length < 1 ||
            itemKey.length > MAX_ORDER_KEY_LENGTH ||
            seenKeys.has(itemKey)
        ) {
            continue
        }

        seenKeys.add(itemKey)
        order.push(itemKey)
    }

    return order
}
