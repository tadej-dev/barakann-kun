// パーツの選択位置
export const PART_SLOT_POSITIONS = ["single", "front", "rear"] as const

// 選択位置（単一・前輪・後輪）
export type PartSlotPosition = (typeof PART_SLOT_POSITIONS)[number]

// カテゴリー内の選択枠
export type PartSlot = {
    key: string // 選択枠の識別キー
    categoryKey: string // 選択枠が属するカテゴリーキー
    position: PartSlotPosition // 選択位置（単一・前輪・後輪）
}

// カテゴリーキーと選択位置を区切る記号
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
    // 引き継ぎ後の選択状態
    const nextSelections = {...selections}

    for (const categoryKey of Object.keys(CATEGORY_SLOT_POSITIONS)) {
        // 旧カテゴリーキーで保存された選択
        const legacySelection = nextSelections[categoryKey]

        // 旧キーの選択が無ければ引き継がない
        if (legacySelection === undefined) {
            continue
        }

        // カテゴリーの先頭スロット
        const firstSlot = getPartSlots(categoryKey)[0]

        // 先頭スロットが未選択のときだけ旧キーの選択を移す
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
    // 区切り記号の位置（単一枠は-1）
    const separatorIndex = slotKey.indexOf(SLOT_KEY_SEPARATOR)

    return separatorIndex === -1
        ? slotKey
        : slotKey.slice(0, separatorIndex)
}

// 選択枠キーに対応する選択位置の取得
export function getPartSlotPosition(slotKey: string): PartSlotPosition {
    // 区切り記号の位置（単一枠は-1）
    const separatorIndex = slotKey.indexOf(SLOT_KEY_SEPARATOR)

    // 区切り記号が無ければ単一枠
    if (separatorIndex === -1) {
        return "single"
    }

    // 区切り記号より後ろの選択位置文字列
    const position = slotKey.slice(separatorIndex + 1)

    return PART_SLOT_POSITIONS.includes(position as PartSlotPosition)
        ? position as PartSlotPosition
        : "single"
}
