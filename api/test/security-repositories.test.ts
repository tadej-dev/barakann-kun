import {describe, expect, it} from "vitest"

import {createD1AuthAdapter} from "../src/auth/d1-auth-adapter"
import {D1AccountRepository} from "../src/db/d1-account-repository"
import {D1SavedBuildRepository} from "../src/db/d1-saved-build-repository"

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
    it("期限切れセッションを取得対象から除外する", async () => {
        const {database, statements} = createDatabaseStub()
        const adapter = createD1AuthAdapter(database)

        expect(adapter.getSessionAndUser).toBeDefined()
        await adapter.getSessionAndUser!("session-token")

        expect(statements).toHaveLength(1)
        expect(statements[0]?.sql).toContain("sessions.expires_at > ?")
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
        expect(statements).toHaveLength(5)
        expect(statements.every(({parameters}) =>
            parameters.includes("user-1"),
        )).toBe(true)
        expect(statements[0]?.sql).toContain("saved_build_parts")
        expect(statements[1]?.sql).toContain("saved_builds")
        expect(statements[2]?.sql).toContain("sessions")
        expect(statements[3]?.sql).toContain("auth_accounts")
        expect(statements[4]?.sql).toContain("users")
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

        await expect(repository.count("user-3")).resolves.toBe(0)

        expect(statements[0]?.sql).toContain("WHERE user_id = ?")
        expect(statements[0]?.parameters).toEqual(["user-3"])
    })
})
