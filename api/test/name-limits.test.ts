import {describe, expect, it} from "vitest"

import {
    parseCreateSavedBuildPayload,
} from "../src/schemas/saved-builds"

// 境界値だけを対象に、50文字=受理 / 51文字=拒否を固定
const nameAtLimit = "あ".repeat(50)
const nameOverLimit = "あ".repeat(51)

// 構成名の文字数上限を境界値で確認
describe("構成名の文字数制限", () => {
    // 作成リクエストの構成名に50文字の上限が効いていることを確認
    it.each([
        ["50文字は受理", nameAtLimit, true],
        ["51文字は拒否", nameOverLimit, false],
    ])("追加構成: %s", (_label, name, expected) => {
        expect(parseCreateSavedBuildPayload({name, parts: []}).success)
            .toBe(expected)
    })
})
