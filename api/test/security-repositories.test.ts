import {describe, expect, it} from "vitest"

import {createD1AuthAdapter} from "../src/auth/d1-auth-adapter"
import {D1AccountRepository} from "../src/db/d1-account-repository"
import {D1ConfigOrderRepository} from "../src/db/config-order-repository"
import {D1SavedBuildRepository} from "../src/db/d1-saved-build-repository"
import {
    InvalidSavedBuildPartsError,
    loadValidatedPartSnapshots,
} from "../src/db/saved-build-repository"

type PreparedStatement = {
    sql: string
    parameters: unknown[]
}

// D1へ接続せず、セキュリティに関わるSQL条件だけを検証する簡易スタブ
function createDatabaseStub(
    results: Array<{meta: {changes: number}}> = [],
) {
    const statements: PreparedStatement[] = []
    const database = {
        prepare(sql: string) {
            return {
                bind(...parameters: unknown[]) {
                    statements.push({sql, parameters})

                    return {
                        first: async () => null,
                        all: async () => ({results: []}),
                    }
                },
            }
        },
        batch: async () => results,
    } as unknown as D1Database

    return {database, statements}
}

describe("security-sensitive D1 queries", () => {
    it("Google表示名をusers.display_nameの上限内へ整形する", async () => {
        const statements: PreparedStatement[] = []
        const database = {
            prepare(sql: string) {
                return {
                    bind(...parameters: unknown[]) {
                        statements.push({sql, parameters})

                        return {
                            run: async () => ({meta: {changes: 1}}),
                        }
                    },
                }
            },
        } as unknown as D1Database
        const adapter = createD1AuthAdapter(database)
        const longName = "あ".repeat(101)

        const user = await adapter.createUser!({
            id: "user-1",
            name: longName,
            email: "test@example.com",
            emailVerified: null,
            image: null,
        })

        expect(user.name).toHaveLength(100)
        expect(statements[0]?.parameters[1]).toBe("あ".repeat(100))
    })

    it("期限切れセッションを取得対象から除外する", async () => {
        const {database, statements} = createDatabaseStub()
        const adapter = createD1AuthAdapter(database)

        expect(adapter.getSessionAndUser).toBeDefined()
        await adapter.getSessionAndUser!("session-token")

        expect(statements).toHaveLength(1)
        expect(statements[0]?.sql).toContain("sessions.expires_at > ?")
        expect(statements[0]?.parameters).toHaveLength(2)
    })

    it("期限切れセッションを更新対象から除外する", async () => {
        const {database, statements} = createDatabaseStub()
        const adapter = createD1AuthAdapter(database)

        expect(adapter.updateSession).toBeDefined()
        await adapter.updateSession!({
            sessionToken: "session-token",
            userId: "user-1",
            expires: new Date(Date.now() + 60 * 60 * 1000),
        })

        expect(statements).toHaveLength(1)
        expect(statements[0]?.sql).toContain("expires_at > ?")
        expect(statements[0]?.parameters).toHaveLength(2)
    })

    it("ユーザー関連テーブルをユーザーIDで削除する", async () => {
        const {database, statements} = createDatabaseStub([
            {meta: {changes: 1}},
            {meta: {changes: 1}},
            {meta: {changes: 1}},
            {meta: {changes: 1}},
            {meta: {changes: 1}},
        ])
        const repository = new D1AccountRepository(database)

        await expect(repository.deleteUser("user-1")).resolves.toEqual({
            kind: "deleted",
        })
        expect(statements).toHaveLength(6)
        expect(statements.every(({parameters}) =>
            parameters.includes("user-1"),
        )).toBe(true)
        expect(statements[0]?.sql).toContain("saved_build_parts")
        expect(statements[1]?.sql).toContain("saved_builds")
        expect(statements[2]?.sql).toContain("saved_build_orders")
        expect(statements[3]?.sql).toContain("sessions")
        expect(statements[4]?.sql).toContain("auth_accounts")
        expect(statements[5]?.sql).toContain("users")
    })

    it("保存構成の一覧検索にもユーザーID条件を付ける", async () => {
        const {database, statements} = createDatabaseStub()
        const repository = new D1SavedBuildRepository(database)

        await expect(repository.list("user-2")).resolves.toEqual([])

        expect(statements[0]?.sql).toContain("WHERE user_id = ?")
        expect(statements[0]?.parameters).toEqual(["user-2"])
    })

    it("保存構成の件数確認にもユーザーID条件を付ける", async () => {
        const {database, statements} = createDatabaseStub()
        const repository = new D1SavedBuildRepository(database)

        await expect(repository.count("user-3")).resolves.toBe(4)

        expect(statements[0]?.sql).toContain("WHERE user_id = ?")
        expect(statements[0]?.sql).toContain("config_slot IS NULL")
        expect(statements[0]?.parameters).toEqual(["user-3"])
    })

    it("表示順テーブル未適用時は既定順へフォールバックする", async () => {
        const database = {
            prepare(sql: string) {
                return {
                    bind() {
                        return {
                            all: async () => {
                                if (sql.includes("saved_build_orders")) {
                                    throw new Error(
                                        "D1_ERROR: no such table: saved_build_orders",
                                    )
                                }

                                return {results: []}
                            },
                        }
                    },
                }
            },
        } as unknown as D1Database
        const repository = new D1ConfigOrderRepository(database)

        await expect(repository.list("user-4")).resolves.toEqual([
            "config:1",
            "config:2",
            "config:3",
            "config:4",
        ])
    })

    it("保存時にスロットのカテゴリーと前後位置を検証する", async () => {
        const database = {
            prepare() {
                return {
                    bind() {
                        return {
                            all: async () => ({
                                results: [
                                    {
                                        id: 1,
                                        price: 100,
                                        weight: 100,
                                        category_key: "frame",
                                        allowed_position: null,
                                    },
                                    {
                                        id: 2,
                                        price: 200,
                                        weight: 200,
                                        category_key: "disc_rotor",
                                        allowed_position: "front",
                                    },
                                ],
                            }),
                        }
                    },
                }
            },
        } as unknown as D1Database

        await expect(loadValidatedPartSnapshots(database, [
            {slotKey: "tire:front", partId: 1},
        ])).rejects.toMatchObject({
            name: "InvalidSavedBuildPartsError",
            issues: [{
                slotKey: "tire:front",
                reason: "category",
                partId: 1,
            }],
        } satisfies Partial<InvalidSavedBuildPartsError>)

        await expect(loadValidatedPartSnapshots(database, [
            {slotKey: "disc_rotor:rear", partId: 2},
        ])).rejects.toMatchObject({
            name: "InvalidSavedBuildPartsError",
            issues: [{
                slotKey: "disc_rotor:rear",
                reason: "position",
                partId: 2,
            }],
        } satisfies Partial<InvalidSavedBuildPartsError>)
    })
})
