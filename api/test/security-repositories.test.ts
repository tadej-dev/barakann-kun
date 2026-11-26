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
    // 実行するSQL
    sql: string
    // SQLへ渡すパラメーター
    parameters: unknown[]
}

// D1へ接続せず、セキュリティに関わるSQL条件だけを検証する簡易スタブ
function createDatabaseStub(
    results: Array<{meta: {changes: number}}> = [],
) {
    const statements: PreparedStatement[] = []
    const database = {
        // SQLを保持して結果を返す実行部を用意
        prepare(sql: string) {
            return {
                // SQLと引数を記録して結果を返す
                bind(...parameters: unknown[]) {
                    statements.push({sql, parameters})

                    return {
                        first: async () => null,
                        all: async () => ({results: []}),
                        run: async () => ({meta: {changes: 1}}),
                    }
                },
            }
        },
        batch: async () => results,
    } as unknown as D1Database

    return {database, statements}
}

// 個人情報の扱いとユーザーID条件を検証するD1クエリ
describe("security-sensitive D1 queries", () => {
    it("Googleの名前・メール・画像を保存せず、仮の表示名でユーザーを作る", async () => {
        const statements: PreparedStatement[] = []
        const database = {
            // 保存SQLと引数を記録する実行部を返す
            prepare(sql: string) {
                return {
                    // SQLと引数を検証用に記録して実行部を返す
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
            // 更新SQLの有無を調べる実行部を返す
            prepare(sql: string) {
                return {
                    // SQLと引数を記録して実行部を返す
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

    it("保存構成の一覧取得にもユーザーID条件を付ける", async () => {
        const {database, statements} = createDatabaseStub()
        const repository = new D1SavedBuildRepository(database)

        await expect(repository.listAll("user-2")).resolves.toEqual([])

        expect(statements[0]?.sql).toContain("WHERE user_id = ?")
        expect(statements[0]?.parameters).toEqual(["user-2"])
    })

    it("保存構成の件数確認にもユーザーID条件を付ける", async () => {
        const {database, statements} = createDatabaseStub()
        const repository = new D1SavedBuildRepository(database)

        await expect(repository.countAll("user-3")).resolves.toBe(0)

        expect(statements[0]?.sql).toContain("WHERE user_id = ?")
        expect(statements[0]?.parameters).toEqual(["user-3"])
    })

    it("初期構成は0件のときだけ作成するSQLを実行する", async () => {
        const {database, statements} = createDatabaseStub()
        const repository = new D1SavedBuildRepository(database)

        await repository.ensureInitialConfig("user-5")

        expect(statements[0]?.sql).toContain("WHERE NOT EXISTS")
        expect(statements[0]?.sql).toContain("FROM saved_builds")
        // 構成が無い場合だけ作成する条件に、ユーザーIDを渡している
        expect(statements[0]?.parameters).toEqual([
            expect.any(String),
            "user-5",
            "構成1",
            expect.any(String),
            expect.any(String),
            "user-5",
        ])
    })

    it("表示順テーブル未適用時は既定順へフォールバックする", async () => {
        const database = {
            // SQLを受け取るprepare呼び出しを再現
            prepare(sql: string) {
                return {
                    // 表示順テーブルの有無で結果を切り替える実行部を返す
                    bind() {
                        return {
                            all: async () => {
                                // 表示順テーブルが無いD1エラーを再現
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

        // 構成がまだ無い場合は、空の並び順を返す
        await expect(repository.list("user-4")).resolves.toEqual([])
    })

    it("保存時にスロットのカテゴリーと前後位置を検証する", async () => {
        const database = {
            // パーツ検証用の実行部を用意
            prepare() {
                return {
                    // D1のbind呼び出しに合わせて実行部を返す
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
            // SQLの種類でパーツ行と規格行を切り替え
            prepare(sql: string) {
                return {
                    // D1のbind呼び出しに合わせて実行部を返す
                    bind() {
                        return {
                            all: async () => {
                                // パーツの問い合わせならフレームとハンドルを返す
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

                                // 規格の問い合わせならコックピット規格を返す
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

// Googleプロフィールから取得する情報を検証
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

// アカウントIDを秘密鍵付きハッシュへ変換する処理を検証
describe("アカウントIDのハッシュ化", () => {
    // ハッシュ化に使うテスト用の秘密鍵
    const secret = "test-account-id-hash-secret-long-enough"
    // ハッシュ化するGoogleのアカウントID
    const googleId = "108123456789012345678"

    type AccountRow = {
        // アカウントに紐づく利用者ID
        user_id: string
        // 認証プロバイダー（google）
        provider: string
        // プロバイダー側のアカウントID（平文またはハッシュ値）
        provider_account_id: string
    }

    // auth_accountsとusersの行を持ち、SQLの種類に応じて応答する簡易スタブ
    function createAccountDatabase(accountRows: AccountRow[]) {
        const statements: PreparedStatement[] = []
        const database = {
            // SQLを保持して結果を返す実行部を用意
            prepare(sql: string) {
                return {
                    // SQLと引数を記録して結果を返す
                    bind(...parameters: unknown[]) {
                        statements.push({sql, parameters})

                        return {
                            first: async () => {
                                // auth_accountsの問い合わせなら一致するアカウント行を返す
                                if (sql.includes("FROM auth_accounts")) {
                                    const [provider, accountId] = parameters

                                    return accountRows.find((row) =>
                                        row.provider === provider &&
                                        row.provider_account_id === accountId,
                                    ) ?? null
                                }

                                // usersの問い合わせならユーザー行を返す
                                if (sql.includes("FROM users")) {
                                    return {
                                        id: parameters[0],
                                        display_name: "ユーザー",
                                    }
                                }

                                return null
                            },
                            run: async () => {
                                // ハッシュ値への置き換えを、スタブの行にも反映
                                if (sql.includes("UPDATE auth_accounts")) {
                                    const [newId, , provider, oldId] = parameters
                                    const row = accountRows.find((candidate) =>
                                        candidate.provider === provider &&
                                        candidate.provider_account_id === oldId,
                                    )

                                    // 置き換え対象の行があればハッシュ値を反映
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

    // 連携するGoogleアカウントの入力
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

// 保存構成APIのスロット・前後位置・カテゴリー重複の検証
describe("保存構成のスロット検証", () => {
    type SlotValidationPartRow = {
        // パーツID
        id: number
        // パーツのカテゴリーキー
        category_key: string
        // 前後位置の指定（指定なしはnull）
        allowed_position: string | null
    }

    // パーツ行だけを返し、関連テーブルは空にするD1スタブ
    function createSlotValidationDatabase(rows: SlotValidationPartRow[]) {
        return {
            // SQLの種類に応じてパーツ行か空の結果を返す実行部を用意
            prepare(sql: string) {
                return {
                    // D1のbind呼び出しに合わせて実行部を返す
                    bind() {
                        return {
                            all: async () => ({
                                results: sql.includes("FROM parts")
                                    ? rows.map((row) => ({
                                        ...row,
                                        price: 100,
                                        weight: 100,
                                    }))
                                    : [],
                            }),
                        }
                    },
                }
            },
        } as unknown as D1Database
    }

    // 保存検証が投げたエラーを取り出す
    async function captureValidationError(
        database: D1Database,
        parts: {slotKey: string; partId: number}[],
    ) {
        try {
            await loadValidatedPartSnapshots(database, parts)
        } catch (error) {
            return error
        }

        throw new Error("保存検証がエラーになりませんでした")
    }

    it("前後2枠のカテゴリーを位置なしスロットで保存できない", async () => {
        // 位置指定なしでは保存できないタイヤ
        const database = createSlotValidationDatabase([{
            id: 1,
            category_key: "tire",
            allowed_position: null,
        }])
        // 保存検証が返したエラー
        const error = await captureValidationError(database, [
            {slotKey: "tire", partId: 1},
        ])

        expect(error).toBeInstanceOf(InvalidSavedBuildPartsError)
        expect(error).toMatchObject({
            issues: [{
                slotKey: "tire",
                partId: 1,
                reason: "missing-position",
            }],
            partIds: [1],
        } satisfies Partial<InvalidSavedBuildPartsError>)
        expect((error as Error).message).toContain(
            "スロット「tire」は前輪・後輪を指定してください",
        )
    })

    it("前後2枠を持たないカテゴリーに位置付きスロットを保存できない", async () => {
        // 位置指定を持つフレーム
        const database = createSlotValidationDatabase([{
            id: 2,
            category_key: "frame",
            allowed_position: null,
        }])
        // 保存検証が返したエラー
        const error = await captureValidationError(database, [
            {slotKey: "frame:front", partId: 2},
        ])

        expect(error).toBeInstanceOf(InvalidSavedBuildPartsError)
        expect(error).toMatchObject({
            issues: [{
                slotKey: "frame:front",
                partId: 2,
                reason: "unexpected-position",
            }],
            partIds: [2],
        } satisfies Partial<InvalidSavedBuildPartsError>)
        expect((error as Error).message).toContain(
            "スロット「frame:front」は前輪・後輪を指定できません",
        )
    })

    it.each<[string, number, number]>([
        ["frame", 3, 4],
        ["wheel", 5, 6],
    ])(
        "%sカテゴリーの重複スロットを拒否する",
        async (categoryKey, firstPartId, secondPartId) => {
            // 同じカテゴリーのパーツ2件
            const database = createSlotValidationDatabase([
                {
                    id: firstPartId,
                    category_key: categoryKey,
                    allowed_position: null,
                },
                {
                    id: secondPartId,
                    category_key: categoryKey,
                    allowed_position: null,
                },
            ])
            // 位置なしと位置付きの重複スロット
            const error = await captureValidationError(database, [
                {slotKey: categoryKey, partId: firstPartId},
                {slotKey: `${categoryKey}:front`, partId: secondPartId},
            ])

            expect(error).toBeInstanceOf(InvalidSavedBuildPartsError)

            // 重複した両方のスロットをエラーへ含める
            expect((error as InvalidSavedBuildPartsError).issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        slotKey: categoryKey,
                        partId: firstPartId,
                        reason: "duplicate-category",
                    }),
                    expect.objectContaining({
                        slotKey: `${categoryKey}:front`,
                        partId: secondPartId,
                        reason: "duplicate-category",
                    }),
                ]),
            )
            expect((error as Error).message).toContain(
                `カテゴリー「${categoryKey}」が複数のスロットで重複しています`,
            )
        },
    )

    it("前輪と後輪のタイヤを同じ構成に保存できる", async () => {
        // 前輪用と後輪用のタイヤ
        const database = createSlotValidationDatabase([
            {id: 7, category_key: "tire", allowed_position: null},
            {id: 8, category_key: "tire", allowed_position: null},
        ])

        await expect(loadValidatedPartSnapshots(database, [
            {slotKey: "tire:front", partId: 7},
            {slotKey: "tire:rear", partId: 8},
        ])).resolves.toBeInstanceOf(Map)
    })
})
