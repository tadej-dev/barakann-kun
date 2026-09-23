import type {Part, PartIncludedItem} from "@/types/part"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"

// パーツ選択画面で表示する製品名
export function getPartDisplayName(
    part: Pick<Part, "name" | "modelName" | "brandName">,
): string {
    // modelNameを優先し、ブランド名が重複する場合だけ先頭の表記を取り除く。
    const productName = part.modelName?.trim() || part.name.trim()
    const brandName = part.brandName.trim()

    if (!brandName) {
        return productName
    }

    const namePrefix = productName.slice(0, brandName.length)
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
        const item = (part.includedItems ?? []).find(
            (candidate) => candidate.categoryKey === categoryKey,
        )

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
        const hasVariantName = Boolean(part.variantName?.trim())
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
    const source = part.variantName?.trim() || part.name
    const matches = source.match(/\d+(?:\.\d+)?/g) ?? []

    return matches.map(Number)
}

// バリアントを表示順（数値昇順→名前順）に並べるための比較関数。
export function comparePartVariants(a: Part, b: Part): number {
    const aNumbers = getVariantNumbers(a)
    const bNumbers = getVariantNumbers(b)
    const length = Math.max(aNumbers.length, bNumbers.length)

    for (let index = 0; index < length; index += 1) {
        // 数値が無いバリアントは末尾へ寄せるため -1 を既定値にする。
        const aValue = aNumbers[index] ?? -1
        const bValue = bNumbers[index] ?? -1

        if (aValue !== bValue) {
            return aValue - bValue
        }
    }

    return (a.variantName ?? a.name).localeCompare(
        b.variantName ?? b.name,
        "ja-JP",
    )
}

// サマリー・比較・共有表示で使う、サイズや世代まで含めた表示名。
// 候補表の行内では候補の絞り込みに使うため、ここでは付加情報を明示する。
export function getPartVariantLabel(
    part: Pick<Part, "name" | "modelName" | "brandName" | "variantName" | "edition">,
): string {
    const baseName = getPartDisplayName(part)
    const variantLabel = part.variantName?.trim()
    const editionLabel = part.edition?.trim()
    const suffixes = [editionLabel, variantLabel].filter(Boolean)

    return suffixes.length > 0
        ? `${baseName}（${suffixes.join(" / ")}）`
        : baseName
}
