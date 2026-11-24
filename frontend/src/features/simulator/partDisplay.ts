import type {Part, PartIncludedItem} from "@/types/part"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"

// パーツ選択画面で表示する製品名
export function getPartDisplayName(
    part: Pick<Part, "name" | "modelName" | "brandName">,
): string {
    // modelNameを優先し、ブランド名が重複する場合だけ先頭の表記を取り除く。
    // 表示に使う製品名
    const productName = part.modelName?.trim() || part.name.trim()
    // 前後空白を除いたブランド名
    const brandName = part.brandName.trim()

    // ブランド名が無ければ製品名だけを返す
    if (!brandName) {
        return productName
    }

    // 製品名の先頭から切り出したブランド名相当の文字列
    const namePrefix = productName.slice(0, brandName.length)
    // ブランド名の直後1文字（区切り判定用）
    const separator = productName.slice(
        brandName.length,
        brandName.length + 1,
    )

    // ブランド名が製品名の先頭に完全一致する場合だけ除去
    if (
        namePrefix.toLowerCase() !== brandName.toLowerCase() ||
        !/\s/u.test(separator)
    ) {
        return productName
    }

    return productName.slice(brandName.length).trim()
}

// 占有枠の表示名は、同じカテゴリーの付属品を持つ選択パーツから補う。
export function findBlockedSlotItem(
    selectedParts: SelectedParts,
    categoryKey: string,
): PartIncludedItem | null {
    for (const part of Object.values(selectedParts)) {
        // 選択済みパーツの同梱品から探した該当カテゴリーの品
        const item = (part.includedItems ?? []).find(
            (candidate) => candidate.categoryKey === categoryKey,
        )

        // 同梱品が見つかったら項目を返す
        if (item) {
            return item
        }
    }

    return null
}

// バリエーション・仕様列の表示要否
export function hasPartVariantColumn(
    parts: Pick<Part, "variantName" | "specifications">[],
): boolean {
    // 1件でもバリエーションまたは規格値があれば列を残し、情報の見落としを防ぐ。
    return parts.some((part) => {
        // バリエーション名が登録されているか
        const hasVariantName = Boolean(part.variantName?.trim())
        // 規格値が1つでも登録されているか
        const hasSpecifications = Object.values(
            part.specifications ?? {},
        ).some((value) => value.trim() !== "")

        return hasVariantName || hasSpecifications
    })
}

// 同一モデル（年式・エディションを含む）を1行へまとめるためのキー。
// ブランド・製品名・年式・世代がすべて一致するものだけを同じ行に集約する。
export function getPartModelKey(
    part: Pick<
        Part,
        "brandName" | "modelName" | "name" | "modelYear" | "edition"
    >,
): string {
    // 表示名に使う製品名
    const modelName = part.modelName?.trim() || part.name.trim()

    return [
        part.brandName,
        modelName,
        part.modelYear ?? "",
        part.edition ?? "",
    ].join("\u0000")
}

// バリアント名に含まれる数値を比較用に取り出す（例: "360x90mm" → [360, 90]）。
function getVariantNumbers(
    part: Pick<Part, "name" | "variantName">,
): number[] {
    // 数値を取り出す元の文字列
    const source = part.variantName?.trim() || part.name
    // バリアント名から取り出した数値文字列
    const matches = source.match(/\d+(?:\.\d+)?/g) ?? []

    return matches.map(Number)
}

// バリアントを表示順（数値昇順→名前順）に並べるための比較関数。
export function comparePartVariants(a: Part, b: Part): number {
    const aNumbers = getVariantNumbers(a) // 比較元の数値一覧
    const bNumbers = getVariantNumbers(b) // 比較先の数値一覧
    const length = Math.max(aNumbers.length, bNumbers.length) // 比較する数値の最大個数

    for (let index = 0; index < length; index += 1) {
        // 数値が無いバリアントは末尾へ寄せるため -1 を既定値にする。
        const aValue = aNumbers[index] ?? -1
        const bValue = bNumbers[index] ?? -1

        // 数値が異なる位置で比較結果を確定
        if (aValue !== bValue) {
            return aValue - bValue
        }
    }

    return (a.variantName ?? a.name).localeCompare(
        b.variantName ?? b.name,
        "ja-JP",
    )
}

// サマリー・比較で使う、サイズや世代まで含めた表示名。
// 候補表の行内では候補の絞り込みに使うため、ここでは付加情報を明示する。
export function getPartVariantLabel(
    part: Pick<Part, "name" | "modelName" | "brandName" | "variantName" | "edition">,
): string {
    const baseName = getPartDisplayName(part) // ブランド名を除いた製品名
    const variantLabel = part.variantName?.trim() // バリエーション名（未登録はundefined）
    const editionLabel = part.edition?.trim() // 世代・仕様名（未登録はundefined）
    const suffixes = [editionLabel, variantLabel].filter(Boolean) // 製品名の後ろへ付ける仕様名

    return suffixes.length > 0
        ? `${baseName}（${suffixes.join(" / ")}）`
        : baseName
}
