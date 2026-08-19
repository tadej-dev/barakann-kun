// パーツの選択位置
export const PART_SLOT_POSITIONS = ["single", "front", "rear"] as const

export type PartSlotPosition = (typeof PART_SLOT_POSITIONS)[number]

// カテゴリー内の選択枠
export type PartSlot = {
    key: string
    categoryKey: string
    position: PartSlotPosition
}

const SLOT_KEY_SEPARATOR = ":"

// カテゴリー別の選択位置
const CATEGORY_SLOT_POSITIONS: Partial<
    Record<string, readonly PartSlotPosition[]>
> = {
    brake_caliper: ["front", "rear"],
    brake_pad: ["front", "rear"],
    disc_rotor: ["front", "rear"],
    tire: ["front", "rear"],
    inner_tube: ["front", "rear"],
}

// 選択枠キーの作成
export function createPartSlotKey(
    categoryKey: string,
    position: PartSlotPosition = "single",
) {
    return position === "single"
        ? categoryKey
        : `${categoryKey}${SLOT_KEY_SEPARATOR}${position}`
}

// 選択枠の作成
export function createPartSlot(
    categoryKey: string,
    position: PartSlotPosition = "single",
): PartSlot {
    return {
        key: createPartSlotKey(categoryKey, position),
        categoryKey,
        position,
    }
}

// 同一カテゴリーに属する複数選択枠の作成
export function createPartSlots(
    categoryKey: string,
    positions: readonly PartSlotPosition[],
) {
    return positions.map((position) =>
        createPartSlot(categoryKey, position),
    )
}

// カテゴリーに対応する選択枠一覧の取得
export function getPartSlots(categoryKey: string) {
    // 前後管理が必要なカテゴリーだけ2枠に展開し、それ以外は単一枠を返す。
    return createPartSlots(
        categoryKey,
        CATEGORY_SLOT_POSITIONS[categoryKey] ?? ["single"],
    )
}

// 前後スロット導入前の選択状態を先頭スロットへ引き継ぐ
export function migrateLegacyPartSlotSelections<T>(
    selections: Record<string, T>,
) {
    // 旧カテゴリーキーを残さず、現行のfront/rearキーへ一度だけ移す。
    const nextSelections = {...selections}

    for (const categoryKey of Object.keys(CATEGORY_SLOT_POSITIONS)) {
        const legacySelection = nextSelections[categoryKey]

        if (legacySelection === undefined) {
            continue
        }

        const firstSlot = getPartSlots(categoryKey)[0]

        if (!Object.hasOwn(nextSelections, firstSlot.key)) {
            nextSelections[firstSlot.key] = legacySelection
        }

        delete nextSelections[categoryKey]
    }

    return nextSelections
}

// 選択位置の表示名
export function getPartSlotPositionLabel(
    position: PartSlotPosition,
) {
    switch (position) {
        case "front":
            return "前輪"
        case "rear":
            return "後輪"
        default:
            return null
    }
}

// 選択枠キーに対応するカテゴリーキーの取得
export function getPartSlotCategoryKey(slotKey: string) {
    const separatorIndex = slotKey.indexOf(SLOT_KEY_SEPARATOR)

    return separatorIndex === -1
        ? slotKey
        : slotKey.slice(0, separatorIndex)
}

// 選択枠キーに対応する選択位置の取得
export function getPartSlotPosition(slotKey: string): PartSlotPosition {
    const separatorIndex = slotKey.indexOf(SLOT_KEY_SEPARATOR)

    if (separatorIndex === -1) {
        return "single"
    }

    const position = slotKey.slice(separatorIndex + 1)

    return PART_SLOT_POSITIONS.includes(position as PartSlotPosition)
        ? position as PartSlotPosition
        : "single"
}
