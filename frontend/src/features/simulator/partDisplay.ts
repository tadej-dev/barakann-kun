import type {Part} from "@/types/part"

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
