import {describe, expect, it} from "vitest"

import {
    comparePartVariants,
    findBlockedSlotItem,
    getPartModelKey,
    getPartDisplayName,
    getPartVariantLabel,
    hasPartVariantColumn,
} from "@/features/simulator/partDisplay"
import type {Part} from "@/types/part"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"

function createPart(
    name: string,
    brandName: string,
    modelName?: string | null,
): Pick<Part, "name" | "modelName" | "brandName"> {
    return {name, brandName, modelName}
}

function createMetadata(
    variantName?: string | null,
    specifications: Record<string, string> = {},
): Pick<Part, "variantName" | "specifications"> {
    return {variantName, specifications}
}

// ブランド名の除去条件と、バリエーション列を表示する条件を確認する。
describe("getPartDisplayName", () => {
    // 一覧ではブランド列を別表示するため、製品名から先頭の重複を除く。
    it("製品名の先頭にあるブランド名を除去する", () => {
        expect(getPartDisplayName(
            createPart(
                "Shimano Ultegra CS-R8100",
                "Shimano",
            ),
        )).toBe("Ultegra CS-R8100")
    })

    // バリエーションを除いたモデル名がある場合は、正規化済み名称を優先する。
    it("modelNameを優先して表示する", () => {
        expect(getPartDisplayName(
            createPart(
                "Cervelo S5 2025",
                "Cervelo",
                "Cervelo S5",
            ),
        )).toBe("S5")
    })

    // DB表記の大文字小文字差で、同じブランドが二重表示されないようにする。
    it("ブランド名の大文字小文字が異なっても除去する", () => {
        expect(getPartDisplayName(
            createPart("sram Rival AXS", "SRAM"),
        )).toBe("Rival AXS")
    })

    // 製品名の途中にブランド文字列があるだけなら、意味を変えずに残す。
    it("ブランド名が先頭にない製品名はそのまま表示する", () => {
        expect(getPartDisplayName(
            createPart("SuperSix EVO", "Cannondale"),
        )).toBe("SuperSix EVO")
    })

    // 完全一致を除去すると名称が消えるため、最低限元の製品名を表示する。
    it("ブランド名と製品名が同じ場合は空文字にしない", () => {
        expect(getPartDisplayName(
            createPart("Shimano", "Shimano"),
        )).toBe("Shimano")
    })

    // 表示材料がないときは、候補テーブルのバリエーション列自体を省略する。
    it("バリエーションと仕様がすべて空なら列を非表示にする", () => {
        expect(hasPartVariantColumn([
            createMetadata(),
            createMetadata(""),
        ])).toBe(false)
    })

    // variant_nameが空でも規格情報があれば、列を残して仕様を表示する。
    it("仕様がある場合はバリエーション列を表示する", () => {
        expect(hasPartVariantColumn([
            createMetadata(null, {wheel_diameter: "700C"}),
        ])).toBe(true)
    })
})

// 同一モデルの集約キーと、バリアントの表示順を確認する。
describe("getPartModelKey", () => {
    function createVariant(
        variantName: string,
        overrides: Partial<Part> = {},
    ): Part {
        return {
            id: 1,
            name: `EXS AEROVER Compact ${variantName}`,
            modelName: "EXS AEROVER Compact",
            variantName,
            brandName: "EXS",
            weight: 300,
            price: 79800,
            blockedCategoryKeys: [],
            ...overrides,
        }
    }

    // ブランド・製品名・年式・世代が同じものだけを同じ行にまとめる。
    it("同一モデル・同一世代は同じキーにする", () => {
        const first = createVariant("360x90mm")
        const second = createVariant("400x110mm")

        expect(getPartModelKey(first)).toBe(getPartModelKey(second))
    })

    // 年式や世代が違えば別の行として扱う。
    it("年式・世代が異なれば別のキーにする", () => {
        const base = createVariant("360x90mm", {modelYear: 2025})
        const otherYear = createVariant("360x90mm", {modelYear: 2024})
        const otherEdition = createVariant("360x90mm", {modelYear: 2025, edition: "Gen 7"})

        expect(getPartModelKey(base)).not.toBe(getPartModelKey(otherYear))
        expect(getPartModelKey(base)).not.toBe(getPartModelKey(otherEdition))
    })
})

describe("comparePartVariants", () => {
    function createVariant(id: number, variantName: string): Part {
        return {
            id,
            name: `Bar ${variantName}`,
            variantName,
            brandName: "Test",
            weight: 300,
            price: 1000,
            blockedCategoryKeys: [],
        }
    }

    // 数値を含むバリアント名は、数値の昇順で並べる。
    it("バリアント名の数値を昇順で比較する", () => {
        const variants = [
            createVariant(3, "420x100mm"),
            createVariant(1, "360x90mm"),
            createVariant(2, "400x110mm"),
        ]

        expect([...variants].sort(comparePartVariants).map((part) => part.variantName))
            .toEqual(["360x90mm", "400x110mm", "420x100mm"])
    })
})

// サマリー表示用の、サイズ・世代まで含めた表示名を確認する。
describe("getPartVariantLabel", () => {
    function createFramePart(overrides: Partial<Part> = {}): Part {
        return {
            id: 612,
            name: "Argon 18 Nitrogen Frameset M",
            modelName: "Argon 18 Nitrogen Frameset",
            variantName: "M",
            brandName: "Argon 18",
            weight: 1150,
            price: 0,
            blockedCategoryKeys: [],
            ...overrides,
        }
    }

    // サイズと世代を括弧書きで添え、選択内容を判別できるようにする。
    it("サイズと世代を表示名へ付加する", () => {
        expect(getPartVariantLabel(createFramePart()))
            .toBe("Nitrogen Frameset（M）")

        expect(getPartVariantLabel(createFramePart({edition: "Gen 8"})))
            .toBe("Nitrogen Frameset（Gen 8 / M）")
    })

    // サイズも世代も無いパーツは、通常の表示名のまま返す。
    it("サイズ・世代が無ければモデル名だけを返す", () => {
        expect(getPartVariantLabel(createFramePart({
            variantName: null,
            edition: null,
        }))).toBe("Nitrogen Frameset")
    })
})

// 占有枠の表示名を、提供元パーツの付属品から補う処理を確認する。
describe("findBlockedSlotItem", () => {
    function createSelectedPart(
        includedItems: Part["includedItems"],
    ): Part {
        return {
            id: 534,
            name: "Basso SV Frame Kit",
            brandName: "Basso",
            weight: 780,
            price: 1155000,
            blockedCategoryKeys: ["handlebar", "stem", "seatpost"],
            includedItems,
        }
    }

    // 占有カテゴリーと一致する付属品を提供元パーツから返す。
    it("同じカテゴリーの付属品を返す", () => {
        const selectedParts: SelectedParts = {
            frame: createSelectedPart([{
                name: "Basso Fuga Integrated Handlebar",
                quantity: 1,
                categoryKey: "handlebar",
                weight: 320,
            }]),
        }

        expect(findBlockedSlotItem(selectedParts, "handlebar"))
            .toEqual({
                name: "Basso Fuga Integrated Handlebar",
                quantity: 1,
                categoryKey: "handlebar",
                weight: 320,
            })
    })

    // 一致する付属品がなければ、呼び出し元で従来表示へ戻せるようnullを返す。
    it("一致する付属品がなければnullを返す", () => {
        const selectedParts: SelectedParts = {
            frame: createSelectedPart([]),
        }

        expect(findBlockedSlotItem(selectedParts, "handlebar")).toBeNull()
    })
})
