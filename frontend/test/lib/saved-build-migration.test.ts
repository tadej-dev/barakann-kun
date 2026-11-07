import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

import {
    dismissLocalSimulatorMigration,
    hasPendingLocalSimulatorMigration,
    loadSavedBuildMigration,
    migrateLocalSimulatorState,
} from "@/lib/saved-build-migration"
import type {StoredSimulatorState} from "@/lib/simulator-storage"

function createLocalStorage() {
    const values = new Map<string, string>()

    return {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => Array.from(values.keys())[index] ?? null,
        get length() {
            return values.size
        },
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
    } satisfies Storage
}

function createState(): StoredSimulatorState {
    return {
        activeConfigId: "1",
        configs: {
            "1": {
                frame: 10,
                "tire:rear": 12,
                "tire:front": 11,
            },
            "2": {},
            "3": {frame: 20},
            "4": {},
        },
    }
}

function createSavedBuildResponse(id: string, name: string) {
    return new Response(JSON.stringify({
        id,
        name,
        version: 1,
        createdAt: "2026-08-05T00:00:00.000Z",
        updatedAt: "2026-08-05T00:00:00.000Z",
        shareToken: null,
        parts: [],
    }), {
        status: 201,
        headers: {"content-type": "application/json"},
    })
}

function createCsrfResponse() {
    return new Response(JSON.stringify({csrfToken: "csrf-token"}), {
        headers: {"content-type": "application/json"},
    })
}

// localStorageからD1へ移行する際の成功・スキップ・部分失敗・再表示条件を確認する。
describe("saved-build-migration", () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, "window", {
            configurable: true,
            value: {localStorage: createLocalStorage()},
        })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        Reflect.deleteProperty(globalThis, "window")
    })

    // パーツのある構成だけを作成し、前後スロットの順序をAPIへ安定して渡す。
    it("空の構成を除き、スロット順を安定させて移行する", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(createCsrfResponse())
            .mockResolvedValueOnce(createSavedBuildResponse(
                "build-1",
                "構成1",
            ))
            .mockResolvedValueOnce(createCsrfResponse())
            .mockResolvedValueOnce(createSavedBuildResponse(
                "build-3",
                "構成3",
            ))
        vi.stubGlobal("fetch", fetchMock)

        const result = await migrateLocalSimulatorState(
            "user-1",
            createState(),
        )

        expect(result.created.map(({configId}) => configId)).toEqual([
            "1",
            "3",
        ])
        expect(result.skipped).toEqual([])
        expect(result.failed).toEqual([])
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "/api/builds",
            expect.objectContaining({
                body: JSON.stringify({
                    name: "構成1",
                    parts: [
                        {slotKey: "frame", partId: 10},
                        {slotKey: "tire:front", partId: 11},
                        {slotKey: "tire:rear", partId: 12},
                    ],
                    csrfToken: "csrf-token",
                }),
            }),
        )
        expect(loadSavedBuildMigration("user-1")).toMatchObject({
            userId: "user-1",
            configs: {
                "1": {buildId: "build-1"},
                "3": {buildId: "build-3"},
            },
            completedAt: expect.any(String),
        })
    })

    // 一度移行したユーザーには、後からlocalStorageが変わっても同じ案内を出さない。
    it("保存完了後はローカル構成が変わっても移行案内を再表示しない", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(createCsrfResponse())
            .mockResolvedValueOnce(createSavedBuildResponse(
                "build-1",
                "構成1",
            ))
            .mockResolvedValueOnce(createCsrfResponse())
            .mockResolvedValueOnce(createSavedBuildResponse(
                "build-3",
                "構成3",
            ))
        vi.stubGlobal("fetch", fetchMock)

        const state = createState()

        await migrateLocalSimulatorState("user-1", state)

        const changedState: StoredSimulatorState = {
            ...state,
            configs: {
                ...state.configs,
                "1": {...state.configs["1"], frame: 99},
            },
        }

        expect(hasPendingLocalSimulatorMigration("user-1", changedState))
            .toBe(false)
    })

    // UIで入力された名前を優先し、固定枠名を勝手に上書きしない。
    it("移行時に利用者が指定した構成名を使用する", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(createCsrfResponse())
            .mockResolvedValueOnce(createSavedBuildResponse(
                "build-1",
                "通勤用",
            ))
            .mockResolvedValueOnce(createCsrfResponse())
            .mockResolvedValueOnce(createSavedBuildResponse(
                "build-3",
                "ヒルクライム用",
            ))
        vi.stubGlobal("fetch", fetchMock)

        await migrateLocalSimulatorState(
            "user-1",
            createState(),
            undefined,
            {"1": "通勤用", "3": "ヒルクライム用"},
        )

        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "/api/builds",
            expect.objectContaining({
                body: expect.stringContaining('"name":"通勤用"'),
            }),
        )
        expect(fetchMock).toHaveBeenNthCalledWith(
            4,
            "/api/builds",
            expect.objectContaining({
                body: expect.stringContaining('"name":"ヒルクライム用"'),
            }),
        )
    })

    // ユーザー単位の移行記録があればAPIを呼ばず、二重登録を防ぐ。
    it("同じユーザーの移行済み構成を二重登録しない", async () => {
        vi.stubGlobal("fetch", vi.fn(async (input: string) => (
            input === "/api/auth/csrf"
                ? createCsrfResponse()
                : createSavedBuildResponse("build-1", "構成1")
        )))

        await migrateLocalSimulatorState("user-1", createState())
        const fetchMock = vi.fn()
        vi.stubGlobal("fetch", fetchMock)

        const result = await migrateLocalSimulatorState(
            "user-1",
            createState(),
        )

        expect(result.created).toEqual([])
        expect(result.skipped).toEqual(["1", "3"])
        expect(fetchMock).not.toHaveBeenCalled()
    })

    // 見送りは内容の指紋に紐づけ、パーツが変わったときだけ再び候補にする。
    it("同じ内容で移行を見送った構成は再表示せず、内容変更時は候補に戻す", () => {
        const state = createState()

        expect(hasPendingLocalSimulatorMigration("user-1", state)).toBe(true)

        dismissLocalSimulatorMigration("user-1", state)

        expect(hasPendingLocalSimulatorMigration("user-1", state)).toBe(false)

        const changedState: StoredSimulatorState = {
            ...state,
            configs: {
                ...state.configs,
                "1": {...state.configs["1"], frame: 99},
            },
        }

        expect(hasPendingLocalSimulatorMigration("user-1", changedState))
            .toBe(true)
    })

    // 部分失敗でも成功分のIDを保持し、次回に全件をやり直さない。
    it("構成ごとの失敗を記録し、成功した構成の移行を保持する", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(createCsrfResponse())
            .mockResolvedValueOnce(createSavedBuildResponse(
                "build-1",
                "構成1",
            ))
            .mockResolvedValueOnce(createCsrfResponse())
            .mockResolvedValueOnce(new Response(JSON.stringify({
                error: {
                    code: "INVALID_SAVED_BUILD_PARTS",
                    message: "存在しないパーツが含まれています",
                },
            }), {
                status: 400,
                headers: {"content-type": "application/json"},
            }))
        vi.stubGlobal("fetch", fetchMock)

        const result = await migrateLocalSimulatorState(
            "user-1",
            createState(),
        )

        expect(result.created.map(({configId}) => configId)).toEqual(["1"])
        expect(result.failed).toEqual([{
            configId: "3",
            message: "存在しないパーツが含まれています",
        }])
        expect(loadSavedBuildMigration("user-1")?.configs["1"])
            .toMatchObject({buildId: "build-1"})
        expect(loadSavedBuildMigration("user-1")?.configs["3"])
            .toBeUndefined()

        // 失敗結果を閉じた後は、同じ内容の移行案内を再表示しない
        expect(hasPendingLocalSimulatorMigration("user-1", createState()))
            .toBe(true)
        dismissLocalSimulatorMigration("user-1", createState())
        expect(hasPendingLocalSimulatorMigration("user-1", createState()))
            .toBe(false)
    })
})
