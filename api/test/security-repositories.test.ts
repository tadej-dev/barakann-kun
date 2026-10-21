import {describe, expect, it} from "vitest"

import {toGoogleAccountUser} from "../src/auth/auth-config"
import {
    createD1AuthAdapter,
    hashProviderAccountId,
} from "../src/auth/d1-auth-adapter"
import {hashProviderAccountId as hashInScript} from "../scripts/hash-account-ids.mjs"
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
    it("Googleの名前・メール・画像を保存せず、仮の表示名でユーザーを作る", async () => {
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

        // Auth.jsから名前などが渡されても、保存してはいけない
        const user = await adapter.createUser!({
            id: "user-1",
            name: "山田 太郎",
            email: "taro@example.com",
            emailVerified: null,
            image: "https://example.com/photo.png",
        })
        const savedValues = statements[0]?.parameters ?? []

        expect(user.name).toBe("ユーザー")
        expect(savedValues).not.toContain("山田 太郎")
        expect(savedValues).not.toContain("taro@example.com")
        expect(savedValues).not.toContain("https://example.com/photo.png")
        // メール・画像の列には書き込まない(列自体を削除済み)
        expect(statements[0]?.sql).not.toContain("email")
        expect(statements[0]?.sql).not.toContain("image_url")
        expect(savedValues).toEqual(["user-1", "ユーザー", expect.any(String), expect.any(String)])
    })

    it("Auth.jsからの更新では、名前・メール・画像を書き換えない", async () => {
        const statements: PreparedStatement[] = []
        const database = {
            prepare(sql: string) {
                return {
                    bind(...parameters: unknown[]) {
                        statements.push({sql, parameters})

                        return {
                            first: async () => ({
                                id: "user-1",
                                display_name: "自分で付けた名前",
                            }),
                            run: async () => ({meta: {changes: 1}}),
                        }
                    },
                }
            },
        } as unknown as D1Database
        const adapter = createD1AuthAdapter(database)

        const user = await adapter.updateUser!({
            id: "user-1",
            name: "Googleの名前",
            email: "taro@example.com",
            image: "https://example.com/photo.png",
        })

        expect(user.name).toBe("自分で付けた名前")
        expect(statements.some((statement) => statement.sql.includes("UPDATE"))).toBe(false)
    })

    it("メールアドレスでユーザーを探さない", async () => {
        const {database, statements} = createDatabaseStub()
        const adapter = createD1AuthAdapter(database)

        await expect(adapter.getUserByEmail!("taro@example.com")).resolves.toBeNull()
        expect(statements).toHaveLength(0)
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

    it("公開トークンでは標準枠と追加構成の両方を検索する", async () => {
        const {database, statements} = createDatabaseStub()
        const repository = new D1SavedBuildRepository(database)
        const shareToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

        await expect(repository.findPublicByToken(shareToken)).resolves.toBeNull()

        expect(statements[0]?.sql).toContain("WHERE share_token = ?")
        expect(statements[0]?.sql).not.toContain("config_slot IS NULL")
        expect(statements[0]?.parameters).toEqual([shareToken])
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

    it("保存時にフレームとコックピットの規格不一致を拒否する", async () => {
        const database = {
            prepare(sql: string) {
                return {
                    bind() {
                        return {
                            all: async () => {
                                if (sql.includes("FROM parts")) {
                                    return {
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
                                                category_key: "handlebar",
                                                allowed_position: null,
                                            },
                                        ],
                                    }
                                }

                                if (sql.includes("FROM part_specifications")) {
                                    return {
                                        results: [
                                            {
                                                part_id: 1,
                                                spec_key: "cockpit_interface",
                                                spec_value: "canyon_cp0018",
                                            },
                                            {
                                                part_id: 1,
                                                spec_key: "cockpit_connection",
                                                spec_value: "integrated_only",
                                            },
                                            {
                                                part_id: 2,
                                                spec_key: "cockpit_interface",
                                                spec_value: "standard_1_1_8",
                                            },
                                        ],
                                    }
                                }

                                return {results: []}
                            },
                        }
                    },
                }
            },
        } as unknown as D1Database

        await expect(loadValidatedPartSnapshots(database, [
            {slotKey: "frame", partId: 1},
            {slotKey: "handlebar", partId: 2},
        ])).rejects.toMatchObject({
            name: "InvalidSavedBuildPartsError",
            issues: [{
                slotKey: "frame",
                partId: 1,
                reason: "compatibility",
                relatedPartId: 2,
            }],
            partIds: [1, 2],
        } satisfies Partial<InvalidSavedBuildPartsError>)
    })
})

describe("Googleから受け取る情報", () => {
    it("プロフィールからアカウントID(sub)だけを取り出す", () => {
        const user = toGoogleAccountUser({
            sub: "108123456789012345678",
            name: "山田 太郎",
            email: "taro@example.com",
            picture: "https://example.com/photo.png",
        })

        expect(user).toEqual({id: "108123456789012345678"})
    })

    it("アカウントIDがないプロフィールは受け付けない", () => {
        expect(() => toGoogleAccountUser({email: "taro@example.com"})).toThrow()
    })
})

describe("アカウントIDのハッシュ化", () => {
    const secret = "test-account-id-hash-secret-long-enough"
    const googleId = "108123456789012345678"

    type AccountRow = {
        user_id: string
        provider: string
        provider_account_id: string
    }

    // auth_accountsとusersの行を持ち、SQLの種類に応じて応答する簡易スタブ
    function createAccountDatabase(accountRows: AccountRow[]) {
        const statements: PreparedStatement[] = []
        const database = {
            prepare(sql: string) {
                return {
                    bind(...parameters: unknown[]) {
                        statements.push({sql, parameters})

                        return {
                            first: async () => {
                                if (sql.includes("FROM auth_accounts")) {
                                    const [provider, accountId] = parameters

                                    return accountRows.find((row) =>
                                        row.provider === provider &&
                                        row.provider_account_id === accountId,
                                    ) ?? null
                                }

                                if (sql.includes("FROM users")) {
                                    return {
                                        id: parameters[0],
                                        display_name: "ユーザー",
                                    }
                                }

                                return null
                            },
                            run: async () => {
                                // ハッシュ値への置き換えを、スタブの行にも反映する
                                if (sql.includes("UPDATE auth_accounts")) {
                                    const [newId, , provider, oldId] = parameters
                                    const row = accountRows.find((candidate) =>
                                        candidate.provider === provider &&
                                        candidate.provider_account_id === oldId,
                                    )

                                    if (row) {
                                        row.provider_account_id = newId as string
                                    }
                                }

                                return {meta: {changes: 1}}
                            },
                        }
                    },
                }
            },
        } as unknown as D1Database

        return {database, statements}
    }

    const linkGoogleAccount = {
        userId: "user-1",
        provider: "google",
        providerAccountId: googleId,
        type: "oidc" as const,
    }

    it("アカウントIDを平文で保存せず、ハッシュ値で保存する", async () => {
        const {database, statements} = createAccountDatabase([])

        await createD1AuthAdapter(database, secret).linkAccount!(linkGoogleAccount)

        const storedId = statements[0]?.parameters[2]

        expect(storedId).not.toBe(googleId)
        expect(storedId).toMatch(/^[0-9a-f]{64}$/)
    })

    it("保存したハッシュ値で、同じアカウントを見つけられる", async () => {
        const storedId = await hashProviderAccountId(secret, "google", googleId)
        const {database} = createAccountDatabase([{
            user_id: "user-1",
            provider: "google",
            provider_account_id: storedId,
        }])

        const user = await createD1AuthAdapter(database, secret).getUserByAccount!({
            provider: "google",
            providerAccountId: googleId,
        })

        expect(user?.id).toBe("user-1")
    })

    it("平文で保存されていた既存の行は、ログイン時にハッシュ値へ置き換える", async () => {
        const rows: AccountRow[] = [{
            user_id: "user-1",
            provider: "google",
            provider_account_id: googleId,
        }]
        const {database} = createAccountDatabase(rows)

        const user = await createD1AuthAdapter(database, secret).getUserByAccount!({
            provider: "google",
            providerAccountId: googleId,
        })

        expect(user?.id).toBe("user-1")
        expect(rows[0]?.provider_account_id).toBe(
            await hashProviderAccountId(secret, "google", googleId),
        )
    })

    it("秘密鍵が違うと、別のハッシュ値になる", async () => {
        const first = await hashProviderAccountId(secret, "google", googleId)
        const second = await hashProviderAccountId(`${secret}-other`, "google", googleId)

        expect(first).not.toBe(second)
    })

    it("秘密鍵が未設定なら、平文で保存せずに失敗する", async () => {
        const {database, statements} = createAccountDatabase([])

        await expect(
            createD1AuthAdapter(database).linkAccount!(linkGoogleAccount),
        ).rejects.toThrow("Missing ACCOUNT_ID_HASH_SECRET")
        expect(statements).toHaveLength(0)
    })

    it("一括置き換えのスクリプトと、アプリが同じハッシュ値を作る", async () => {
        // 値がずれると、一括置き換えのあとに既存ユーザーがログインできなくなる
        const fromApp = await hashProviderAccountId(secret, "google", googleId)
        const fromScript = hashInScript(secret, "google", googleId)

        expect(fromScript).toBe(fromApp)
    })
})
