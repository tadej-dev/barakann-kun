import {
    getFrameCockpitStatus,
    getSpecificationLabel,
    getSpecificationValueLabel,
    type CompatibilityResult,
} from "@/features/simulator/partCompatibility"
import type {Part} from "@/types/part"

// 表示モード: 全件 / 非互換を除外 / 適合のみ。
export type CandidateViewMode = "all" | "excludeIncompatible" | "compatibleOnly"

// コックピット状態（複数選択できる）。
export type CockpitStatus = "included" | "dedicated" | "open" | "standard"

// 候補パーツの絞り込み状態。UIと適用ロジックで同じ型を共有する。
export type CandidateFilterState = {
    brands: string[]
    viewMode: CandidateViewMode
    cockpits: CockpitStatus[]
    modelYears: number[]
    integratedHandlebarOnly: boolean
    specs: Record<string, string[]>
}

// 初期状態（絞り込みなし）。
export const initialCandidateFilterState: CandidateFilterState = {
    brands: [],
    viewMode: "all",
    cockpits: [],
    modelYears: [],
    integratedHandlebarOnly: false,
    specs: {},
}

// 規格値フィルターとして提示するキーの許可リスト。
// ここに無いキーは（値が複数あっても）自動生成の対象にしない。
export const SPEC_FILTER_KEYS: readonly string[] = [
    "freehub_body",
    "wheel_diameter",
    "rotor_mount",
    "drivetrain_speed",
    "shift_system",
    "bb_standard",
    "crank_spindle",
    "pad_family",
    "rotor_diameter_mm",
    "cleat_system",
    "saddle_rail",
    "seatpost_diameter_mm",
    "brake_mount",
    "max_tire_width_mm",
    "tire_width_mm",
    "min_tire_width_mm",
]

export type SpecFilterOption = {
    value: string
    label: string
}

export type SpecFilter = {
    key: string
    label: string
    options: SpecFilterOption[]
}

// 候補パーツに実在する規格から、複数選択フィルターを自動生成する。
export function buildSpecFilters(parts: Part[]): SpecFilter[] {
    // spec_key ごとに出現した値を重複なく集める。
    const valuesByKey = new Map<string, Set<string>>()

    for (const part of parts) {
        for (const [key, raw] of Object.entries(part.specifications ?? {})) {
            const values = raw.split(",").map((value) => value.trim()).filter(Boolean)
            const bucket = valuesByKey.get(key) ?? new Set<string>()

            values.forEach((value) => bucket.add(value))
            valuesByKey.set(key, bucket)
        }
    }

    return [...valuesByKey]
        // 許可リストにあるキーだけを対象にする。
        .filter(([key]) => SPEC_FILTER_KEYS.includes(key))
        // 選択肢が1つだけでは絞り込みにならないため除外する。
        .filter(([, values]) => values.size >= 2)
        .map(([key, values]) => ({
            key,
            label: getSpecificationLabel(key),
            options: [...values]
                .sort((a, b) => a.localeCompare(b, "ja-JP"))
                .map((value) => ({
                    value,
                    label: getSpecificationValueLabel(key, value),
                })),
        }))
}

// 重複・空文字を除外したブランド一覧を返す。
export function collectBrands(parts: Part[]): string[] {
    return [...new Set(
        parts
            .map((part) => part.brandName)
            .filter((brand): brand is string =>
                typeof brand === "string" && brand.trim() !== "",
            ),
    )].sort((a, b) => a.localeCompare(b, "ja-JP"))
}

// 候補に実在するモデルイヤーを昇順で返す（未設定は除外）。
export function collectModelYears(parts: Part[]): number[] {
    return [...new Set(
        parts
            .map((part) => part.modelYear)
            .filter((year): year is number => typeof year === "number"),
    )].sort((a, b) => a - b)
}

// 適用中の条件数を数える（トリガーのバッジ表示用）。
export function countActiveFilters(filters: CandidateFilterState): number {
    return (
        (filters.brands.length > 0 ? 1 : 0) +
        (filters.viewMode !== "all" ? 1 : 0) +
        (filters.cockpits.length > 0 ? 1 : 0) +
        (filters.modelYears.length > 0 ? 1 : 0) +
        (filters.integratedHandlebarOnly ? 1 : 0) +
        Object.values(filters.specs).filter((values) => values.length > 0).length
    )
}

// 複数選択の切替（通常のチェック動作）。チェックで追加、解除で削除する。
export function toggleSelection(
    selected: string[],
    value: string,
    checked: boolean,
): string[] {
    return checked
        ? [...selected, value]
        : selected.filter((item) => item !== value)
}

// 候補の中に確定した適合/非互換（＝比較相手が存在するもの）が1件でもあるかを返す。
// これが false のときは「表示」フィルターは意味を持たないため、UIでは隠して無効化する。
export function hasCompatibilityInfo(
    parts: Part[],
    compatibilityByPartId: ReadonlyMap<number, CompatibilityResult | null>,
): boolean {
    return parts.some((part) => compatibilityByPartId.get(part.id) != null)
}

// 候補パーツへ絞り込みを適用する純関数。UIから切り離してテスト可能にする。
export function filterCandidateParts(
    parts: Part[],
    filters: CandidateFilterState,
    compatibilityByPartId: ReadonlyMap<number, CompatibilityResult | null>,
): Part[] {
    // 選択値が1つ以上ある規格フィルターだけを判定対象にする。
    const activeSpecFilters = Object.entries(filters.specs)
        .filter(([, selected]) => selected.length > 0)

    return parts.filter((part) => {
        // メーカー（複数選択。未選択なら絞り込みなし）
        if (
            filters.brands.length > 0 &&
            !filters.brands.includes(part.brandName)
        ) {
            return false
        }

        // コックピット状態（複数選択はいずれか一致。フレーム以外は null を返す）
        if (filters.cockpits.length > 0) {
            const cockpitStatus = getFrameCockpitStatus(part)

            if (
                !cockpitStatus ||
                cockpitStatus === "unknown" ||
                !filters.cockpits.includes(cockpitStatus)
            ) {
                return false
            }
        }

        // モデルイヤー（複数選択はいずれか一致。未設定は除外）
        if (
            filters.modelYears.length > 0 &&
            (typeof part.modelYear !== "number" ||
                !filters.modelYears.includes(part.modelYear))
        ) {
            return false
        }

        // ステム一体型のみ
        if (
            filters.integratedHandlebarOnly &&
            !(part.blockedCategoryKeys ?? []).includes("stem")
        ) {
            return false
        }

        // 表示モード
        // フレームは全パーツ互換の基準として扱うため、互換フィルターの対象外にする。
        const isFrame = part.categoryKey === "frame"
        const status = compatibilityByPartId.get(part.id)?.status

        if (
            !isFrame &&
            filters.viewMode === "excludeIncompatible" &&
            status === "incompatible"
        ) {
            return false
        }

        if (
            !isFrame &&
            filters.viewMode === "compatibleOnly" &&
            status !== "compatible"
        ) {
            return false
        }

        // 規格値: 複数選択はいずれか一致、カンマ区切りの値は集合交差で判定する。
        for (const [key, selected] of activeSpecFilters) {
            const raw = part.specifications?.[key]

            if (!raw) {
                return false
            }

            const values = raw.split(",").map((value) => value.trim())

            if (!selected.some((value) => values.includes(value))) {
                return false
            }
        }

        return true
    })
}
