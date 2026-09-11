import {describe, expect, it} from "vitest"

import {
    parseRenameConfigSlotPayload,
} from "../src/schemas/config-slots"
import {
    parseCreateSavedBuildPayload,
} from "../src/schemas/saved-builds"

// 境界値だけを対象に、50文字=受理 / 51文字=拒否を両スキーマで固定する。
const nameAtLimit = "あ".repeat(50)
const nameOverLimit = "あ".repeat(51)

describe("構成名の文字数制限", () => {
    // 固定構成の名称変更でも、追加構成と同じ上限が効いていることを確認する。
    it.each([
        ["50文字は受理", nameAtLimit, true],
        ["51文字は拒否", nameOverLimit, false],
    ])("固定構成: %s", (_label, name, expected) => {
        expect(parseRenameConfigSlotPayload({name, version: 0}).success)
            .toBe(expected)
    })

    // 追加構成の作成でも、固定構成と同じ上限が効いていることを確認する。
    it.each([
        ["50文字は受理", nameAtLimit, true],
        ["51文字は拒否", nameOverLimit, false],
    ])("追加構成: %s", (_label, name, expected) => {
        expect(parseCreateSavedBuildPayload({name, parts: []}).success)
            .toBe(expected)
    })
})
