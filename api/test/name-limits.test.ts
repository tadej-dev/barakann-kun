import {describe, expect, it} from "vitest"

import {
    parseRenameConfigSlotPayload,
} from "../src/schemas/config-slots"
import {
    parseCreateSavedBuildPayload,
} from "../src/schemas/saved-builds"

const nameAtLimit = "あ".repeat(50)
const nameOverLimit = "あ".repeat(51)

describe("構成名の文字数制限", () => {
    it("固定構成は50文字まで受け付ける", () => {
        expect(parseRenameConfigSlotPayload({
            name: nameAtLimit,
            version: 0,
        }).success).toBe(true)
    })

    it("固定構成は51文字以上を拒否する", () => {
        expect(parseRenameConfigSlotPayload({
            name: nameOverLimit,
            version: 0,
        }).success).toBe(false)
    })

    it("追加構成は50文字まで受け付ける", () => {
        expect(parseCreateSavedBuildPayload({
            name: nameAtLimit,
            parts: [],
        }).success).toBe(true)
    })

    it("追加構成は51文字以上を拒否する", () => {
        expect(parseCreateSavedBuildPayload({
            name: nameOverLimit,
            parts: [],
        }).success).toBe(false)
    })
})
