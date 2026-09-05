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
    // HTTP成功でもHTMLや空本文が返る可能性があるため、JSON変換を共通化する。
    try {
        return await response.json()
    } catch {
        throw new CatalogResponseError(fallbackMessage)
    }
}

function parseCategory(value: unknown): Category {
    // カテゴリーは候補取得のキーになるため、ID・キー・表示名をすべて必須にする。
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
    // 付属品は表示だけでなく排他判定に使う場合があるため、数量とカテゴリーの型を確認する。
    if (
        !isRecord(value) ||
        typeof value.name !== "string" ||
        !isPositiveSafeInteger(value.quantity) ||
        (value.categoryKey !== null && typeof value.categoryKey !== "string") ||
        !isNonNegativeFiniteNumber(value.weight)
    ) {
        throw new CatalogResponseError(
            "パーツの付属品情報を解釈できませんでした",
        )
    }

    return {
        name: value.name,
        quantity: value.quantity,
        categoryKey: value.categoryKey,
        weight: value.weight,
    }
}

function parseSpecifications(value: unknown): Record<string, string> {
    // 規格値はラベル変換・表示へ渡すため、キーごとに文字列であることを保証する。
    if (!isRecord(value)) {
        throw new CatalogResponseError(
            "パーツの規格情報を解釈できませんでした",
        )
    }

    const entries = Object.entries(value)

    // 規格値を文字列に限定し、UIで想定外のオブジェクトを描画しない。
    if (!entries.every(([, entryValue]) => typeof entryValue === "string")) {
        throw new CatalogResponseError(
            "パーツの規格情報を解釈できませんでした",
        )
    }

    return Object.fromEntries(entries) as Record<string, string>
}

// パーツの名称・所属カテゴリーなど、候補表示の識別に必要なフィールドを検証する。
type PartIdentity = Record<string, unknown> & {
    name: string
    modelName: string | null | undefined
    variantName: string | null | undefined
    brandName: string
    categoryKey: string
}

function hasValidPartIdentity(
    value: Record<string, unknown>,
): value is PartIdentity {
    return typeof value.name === "string" &&
        isOptionalNullableString(value.modelName) &&
        isOptionalNullableString(value.variantName) &&
        typeof value.brandName === "string" &&
        typeof value.categoryKey === "string"
}

// 合計金額・重量とIDは計算やReactのkeyに使うため、有限値と安全な整数に限定する。
type PartMeasurements = Record<string, unknown> & {
    id: number
    weight: number
    price: number
    priceUpdatedAt: string | null | undefined
}

function hasValidPartMeasurements(
    value: Record<string, unknown>,
): value is PartMeasurements {
    return isPositiveSafeInteger(value.id) &&
        isNonNegativeFiniteNumber(value.weight) &&
        isNonNegativeFiniteNumber(value.price) &&
        isOptionalNullableString(value.priceUpdatedAt)
}

type PartCollections = Record<string, unknown> & {
    includedItems: unknown[]
    blockedCategoryKeys: string[]
}

// 付属品と占有カテゴリーは配列で受け取り、後続のmap処理へ安全に渡せる形へ絞る。
function hasValidPartCollections(
    value: Record<string, unknown>,
): value is PartCollections {
    const {includedItems, blockedCategoryKeys} = value

    return Array.isArray(includedItems) &&
        Array.isArray(blockedCategoryKeys) &&
        blockedCategoryKeys.every((key) => typeof key === "string")
}

// パーツ1件を検証し、UIへ渡す型へ変換
function parsePart(value: unknown): Part {
    // パーツ1件を画面で扱える型へ正規化し、欠損フィールドを後段へ流さない。
    if (!isRecord(value)) {
        throw new CatalogResponseError(
            "パーツのレスポンスを解釈できませんでした",
        )
    }

    // 大きな条件式を識別情報・数値・配列に分け、どの契約違反かを読み取りやすくする。
    if (
        !hasValidPartIdentity(value) ||
        !hasValidPartMeasurements(value) ||
        !hasValidPartCollections(value)
    ) {
        throw new CatalogResponseError(
            "パーツのレスポンスを解釈できませんでした",
        )
    }

    const {includedItems, blockedCategoryKeys} = value

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
    // 配列以外は一覧として復元できないため、空配列へ丸めずエラーにする。
    if (!Array.isArray(value)) {
        throw new CatalogResponseError(
            "カテゴリー一覧のレスポンスを解釈できませんでした",
        )
    }

    return value.map(parseCategory)
}

// パーツ一覧レスポンスを検証
export function parseParts(value: unknown): Part[] {
    // 1件でも不正なパーツがある場合はmap中に例外を返し、部分一覧を表示しない。
    if (!Array.isArray(value)) {
        throw new CatalogResponseError(
            "パーツ一覧のレスポンスを解釈できませんでした",
        )
    }

    return value.map(parsePart)
}
