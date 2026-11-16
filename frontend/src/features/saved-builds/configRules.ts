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

// 固定枠(構成1〜4)の数
export const FIXED_CONFIG_COUNT = 4

// 追加構成の上限。全構成の上限から固定枠を引いた件数まで追加できる
export const MAX_ADDED_SAVED_BUILDS = MAX_SAVED_BUILDS - FIXED_CONFIG_COUNT

// 構成名の長さ(サーバーのsavedBuildNameSchemaと揃える)
export const MAX_BUILD_NAME_LENGTH = 50

// 表示順の件数とキーの長さは、APIの検証と同じ定数を使う
export const MAX_ORDER_ITEMS = MAX_CONFIG_ORDER_ITEMS
export const MAX_ORDER_KEY_LENGTH = MAX_CONFIG_ORDER_ITEM_LENGTH

// 未ログイン時に保存する追加構成。パーツは保存時点の価格・重量も持つ。
export type StoredSavedBuild = {
    id: string
    name: string
    parts: SavedBuildPart[]
}

// 未ログイン時に保存する追加構成と表示順
export type LocalConfigCollection = {
    savedBuilds: StoredSavedBuild[]
    order: string[]
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
    if (!Array.isArray(value)) {
        return []
    }

    const seenSlotKeys = new Set<string>()
    const parts: SavedBuildPart[] = []

    for (const part of value) {
        if (parts.length >= MAX_PARTS_PER_BUILD) {
            break
        }

        if (!isRecord(part)) {
            continue
        }

        // サーバーはtrimしてからスロット名を検証するため、同じ順序で扱う
        const slotKey = typeof part.slotKey === "string"
            ? part.slotKey.trim()
            : ""

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

// 追加構成一覧を検証する。壊れた項目は読み飛ばし、IDの重複を除いて上限までに整える
export function normalizeSavedBuilds(value: unknown): StoredSavedBuild[] {
    if (!Array.isArray(value)) {
        return []
    }

    const seenIds = new Set<string>()
    const builds: StoredSavedBuild[] = []

    for (const build of value) {
        if (builds.length >= MAX_ADDED_SAVED_BUILDS) {
            break
        }

        if (
            !isRecord(build) ||
            !isSavedBuildId(build.id) ||
            seenIds.has(build.id) ||
            typeof build.name !== "string"
        ) {
            continue
        }

        const name = normalizeBuildName(build.name)

        if (!name) {
            continue
        }

        seenIds.add(build.id)
        builds.push({id: build.id, name, parts: normalizeBuildParts(build.parts)})
    }

    return builds
}

// 表示順を検証する。空文字・長すぎるキー・重複を除いて上限までに整える
export function normalizeConfigOrder(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return []
    }

    const seenKeys = new Set<string>()
    const order: string[] = []

    for (const key of value) {
        if (order.length >= MAX_ORDER_ITEMS) {
            break
        }

        if (typeof key !== "string") {
            continue
        }

        const itemKey = key.trim()

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
