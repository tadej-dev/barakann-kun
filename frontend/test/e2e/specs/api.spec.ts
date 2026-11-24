import { expect, test } from "../fixtures/test"

// カテゴリーAPIが返すカテゴリーの最小項目
type CategoryResponse = {
    id: number // カテゴリーID
    displayName: string // 画面表示名
    key: string // カテゴリーキー
}

// パーツAPIが返すパーツの最小項目
type PartResponse = {
    id: number // パーツID
    name: string // パーツ名
    price: number // 価格（円）
    weight: number // 重量（g）
    categoryKey: string // 所属カテゴリーキー
}

// APIのエラー本文
type ApiErrorResponse = {
    error: {
        code: string // 画面側の分岐に使うエラーコード
        message: string // 利用者へ表示するメッセージ
    }
}

// 公開APIの応答と認証・入力検証を確認
test.describe("API", () => {
    // ヘルスチェックが稼働中の応答を返すことを保証
    test("ヘルスチェックが成功を返す", async ({ request }) => {
        // ヘルスチェックの応答
        const response = await request.get("/api/health")

        expect(response.status()).toBe(200)
        expect(await response.json()).toEqual({ status: "ok" })
    })

    // 初期投入済みのカテゴリー一覧を認証なしで取得できることを保証
    test("カテゴリー一覧を取得できる", async ({ request }) => {
        // カテゴリー一覧の応答
        const response = await request.get("/api/categories")
        expect(response.status()).toBe(200)

        // 検証対象のカテゴリー一覧
        const categories = await response.json() as CategoryResponse[]

        expect(categories.length).toBeGreaterThan(0)
        // フレームのカテゴリーが初期データに含まれる
        expect(categories.some((category) => category.key === "frame")).toBe(
            true,
        )

        for (const category of categories) {
            // 画面表示に必要な項目がそろっている
            expect(Number.isSafeInteger(category.id)).toBe(true)
            expect(category.displayName.length).toBeGreaterThan(0)
            expect(category.key.length).toBeGreaterThan(0)
        }
    })

    // カテゴリーを指定してフレームの候補を取得できることを保証
    test("カテゴリーのパーツ一覧を取得できる", async ({ request }) => {
        // フレーム候補の応答
        const response = await request.get("/api/parts?category=frame")
        expect(response.status()).toBe(200)

        // 検証対象のフレーム候補
        const parts = await response.json() as PartResponse[]

        expect(parts.length).toBeGreaterThan(0)

        for (const part of parts) {
            // 候補表示に必要な項目がそろっている
            expect(part.categoryKey).toBe("frame")
            expect(Number.isSafeInteger(part.id)).toBe(true)
            expect(part.id).toBeGreaterThan(0)
            expect(part.name.length).toBeGreaterThan(0)
            expect(part.price).toBeGreaterThanOrEqual(0)
            expect(part.weight).toBeGreaterThanOrEqual(0)
        }
    })

    // 複数のパーツIDをまとめて取得できることを保証
    test("パーツIDを指定してパーツを取得できる", async ({ request }) => {
        // フレーム候補の応答
        const listResponse = await request.get("/api/parts?category=frame")
        // 取得済みのフレーム候補
        const parts = await listResponse.json() as PartResponse[]
        // 先頭のパーツID
        const firstPart = parts[0]
        expect(firstPart).toBeDefined()

        // パーツIDを指定した取得の応答
        const response = await request.get(
            `/api/parts/by-ids?ids=${firstPart.id}`,
        )
        expect(response.status()).toBe(200)

        // 指定したIDのパーツ
        const found = await response.json() as PartResponse[]
        expect(found.map((part) => part.id)).toEqual([firstPart.id])
    })

    // 未ログインではユーザー固有APIが401を返すことを保証
    test("未ログインのユーザーAPIは401を返す", async ({ request }) => {
        // 保存構成一覧の応答
        const buildsResponse = await request.get("/api/builds")
        expect(buildsResponse.status()).toBe(401)
        // 保存構成一覧のエラー本文
        const buildsError = await buildsResponse.json() as ApiErrorResponse
        expect(buildsError.error.code).toBe("UNAUTHENTICATED")

        // 構成の表示順の応答
        const orderResponse = await request.get("/api/config-order")
        expect(orderResponse.status()).toBe(401)
        // 構成の表示順のエラー本文
        const orderError = await orderResponse.json() as ApiErrorResponse
        expect(orderError.error.code).toBe("UNAUTHENTICATED")

        // 未ログインの変更操作も認証確認で止まる
        const createResponse = await request.post("/api/builds", {
            data: { name: "未ログイン構成", parts: [] },
        })
        expect(createResponse.status()).toBe(401)
    })

    // 不正なクエリをデータベースへ渡さず400を返すことを保証
    test("不正な入力を400で拒否する", async ({ request }) => {
        // 許可されないカテゴリーキーの応答
        const categoryResponse = await request.get(
            "/api/parts?category=FRAME!",
        )
        expect(categoryResponse.status()).toBe(400)
        // カテゴリーのエラー本文
        const categoryError = await categoryResponse.json() as ApiErrorResponse
        expect(categoryError.error.code).toBe("INVALID_CATEGORY")

        // 数値でないパーツIDの応答
        const idsResponse = await request.get("/api/parts/by-ids?ids=abc")
        expect(idsResponse.status()).toBe(400)
        // パーツIDのエラー本文
        const idsError = await idsResponse.json() as ApiErrorResponse
        expect(idsError.error.code).toBe("INVALID_PART_IDS")

        // パーツIDを省略した応答
        const emptyIdsResponse = await request.get("/api/parts/by-ids")
        expect(emptyIdsResponse.status()).toBe(400)
    })
})
