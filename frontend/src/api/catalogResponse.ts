import type {Category} from "@/types/category"
import type {Part, PartIncludedItem} from "@/types/part"
import {
    isNonNegativeFiniteNumber,
    isOptionalNullableString,
    isPositiveSafeInteger,
    isRecord,
} from "@/api/responseValidation"

// カタログAPIの形式不正を呼び出し元で区別できる例外
export class CatalogResponseError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "CatalogResponseError"
    }
}

// JSONでない成功レスポンスを、画面へそのまま露出させずに扱う
export async function readCatalogJson(
    response: Response,
    fallbackMessage: string,
): Promise<unknown> {
    try {
        return await response.json()
    } catch {
        throw new CatalogResponseError(fallbackMessage)
    }
}

function parseCategory(value: unknown): Category {
    if (
        !isRecord(value) ||
        !isPositiveSafeInteger(value.id) ||
        typeof value.key !== "string" ||
        value.key.length === 0 ||
        typeof value.displayName !== "string"
    ) {
        throw new CatalogResponseError(
            "カテゴリーのレスポンスを解釈できませんでした",
        )
    }

    return {
        id: value.id,
        key: value.key,
        displayName: value.displayName,
    }
}

function parseIncludedItem(value: unknown): PartIncludedItem {
    if (
        !isRecord(value) ||
        typeof value.name !== "string" ||
        !isPositiveSafeInteger(value.quantity) ||
        (value.categoryKey !== null && typeof value.categoryKey !== "string")
    ) {
        throw new CatalogResponseError(
            "パーツの付属品情報を解釈できませんでした",
        )
    }

    return {
        name: value.name,
        quantity: value.quantity,
        categoryKey: value.categoryKey,
    }
}

function parseSpecifications(value: unknown): Record<string, string> {
    if (!isRecord(value)) {
        throw new CatalogResponseError(
            "パーツの規格情報を解釈できませんでした",
        )
    }

    const entries = Object.entries(value)

    if (!entries.every(([, entryValue]) => typeof entryValue === "string")) {
        throw new CatalogResponseError(
            "パーツの規格情報を解釈できませんでした",
        )
    }

    return Object.fromEntries(entries) as Record<string, string>
}

// パーツ1件を検証し、UIへ渡す型へ変換
function parsePart(value: unknown): Part {
    if (!isRecord(value)) {
        throw new CatalogResponseError(
            "パーツのレスポンスを解釈できませんでした",
        )
    }

    const includedItems = value.includedItems
    const blockedCategoryKeys = value.blockedCategoryKeys

    if (
        !isPositiveSafeInteger(value.id) ||
        typeof value.name !== "string" ||
        !isOptionalNullableString(value.modelName) ||
        !isOptionalNullableString(value.variantName) ||
        typeof value.brandName !== "string" ||
        typeof value.categoryKey !== "string" ||
        !isNonNegativeFiniteNumber(value.weight) ||
        !isNonNegativeFiniteNumber(value.price) ||
        !isOptionalNullableString(value.priceUpdatedAt) ||
        !Array.isArray(includedItems) ||
        !Array.isArray(blockedCategoryKeys) ||
        !blockedCategoryKeys.every((key) => typeof key === "string")
    ) {
        throw new CatalogResponseError(
            "パーツのレスポンスを解釈できませんでした",
        )
    }

    return {
        id: value.id,
        name: value.name,
        modelName: value.modelName as string | null | undefined,
        variantName: value.variantName as string | null | undefined,
        brandName: value.brandName,
        categoryKey: value.categoryKey,
        weight: value.weight,
        price: value.price,
        priceUpdatedAt: value.priceUpdatedAt as string | null | undefined,
        includedItems: includedItems.map(parseIncludedItem),
        blockedCategoryKeys,
        specifications: parseSpecifications(value.specifications),
    }
}

// カテゴリー一覧レスポンスを検証
export function parseCategories(value: unknown): Category[] {
    if (!Array.isArray(value)) {
        throw new CatalogResponseError(
            "カテゴリー一覧のレスポンスを解釈できませんでした",
        )
    }

    return value.map(parseCategory)
}

// パーツ一覧レスポンスを検証
export function parseParts(value: unknown): Part[] {
    if (!Array.isArray(value)) {
        throw new CatalogResponseError(
            "パーツ一覧のレスポンスを解釈できませんでした",
        )
    }

    return value.map(parsePart)
}
