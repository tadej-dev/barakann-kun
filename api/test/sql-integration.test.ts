import {readFileSync} from "node:fs"

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

import {D1ConfigOrderRepository} from "../src/db/config-order-repository"
import {D1SavedBuildRepository} from "../src/db/d1-saved-build-repository"
import {SavedBuildLimitExceededError} from "../src/db/saved-build-repository"
import {applyMigrations, createSqliteD1} from "./support/sqlite-d1"

// テストで使うログイン済みユーザーのID
const USER_ID = "user-integration"

// フロントとAPIで共有する契約フィクスチャ
const fixture = JSON.parse(readFileSync(
    new URL("../../frontend/test/fixtures/saved-build-list.json", import.meta.url),
    "utf8",
)) as {parts: Record<string, unknown>[]}[]

// マイグレーション適用済みのSQLiteとD1互換のデータベース、テストユーザーを用意
function createDatabase() {
    const {database, sqlite} = createSqliteD1()

    applyMigrations(sqlite)
    sqlite.prepare(
        `INSERT INTO users (id, display_name, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
    ).run(
        USER_ID,
        "テスト",
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z",
    )

    return {database, sqlite}
}

// フレームのカテゴリー・ブランド・パーツを1件ずつ用意
function seedFramePart(sqlite: ReturnType<typeof createDatabase>["sqlite"]) {
    const now = "2026-01-01T00:00:00.000Z"

    sqlite.prepare(
        "INSERT OR IGNORE INTO categories (key, display_name) VALUES ('frame', 'フレーム')",
    ).run()
    sqlite.prepare(
        "INSERT OR IGNORE INTO brands (name, created_at, updated_at) VALUES (?, ?, ?)",
    ).run("テストブランド", now, now)

    const category = sqlite.prepare(
        "SELECT id FROM categories WHERE key = 'frame'",
    ).get() as {id: number}
    const brand = sqlite.prepare(
        "SELECT id FROM brands WHERE name = 'テストブランド'",
    ).get() as {id: number}

    const result = sqlite.prepare(
        `INSERT INTO parts (
             category_id, brand_id, name, price, weight, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(category.id, brand.id, "テストフレーム", 100000, 1000, now, now)

    return Number(result.lastInsertRowid)
}

// マイグレーション後のSQLiteで保存構成・表示順リポジトリのSQLを検証
describe("SQL結合テスト", () => {
    // テストごとに作り直すデータベースと接続
    let context: ReturnType<typeof createDatabase>

    beforeEach(() => {
        context = createDatabase()
    })

    afterEach(() => {
        // 失敗しても次のテストへ時刻固定を持ち越さない
        vi.useRealTimers()
        context?.sqlite.close()
    })

    // マイグレーション後のスキーマが最新の形になっている
    it("マイグレーション後のスキーマに旧列が無い", () => {
        const columns = context.sqlite
            .prepare("SELECT name FROM pragma_table_info('saved_builds')")
            .all() as {name: string}[]
        const names = columns.map((column) => column.name)

        expect(names).not.toContain("config_slot")
        expect(names).not.toContain("is_default")
        expect(names).toContain("user_id")
        expect(names).toContain("update_token")

        // 子テーブル2件も存在
        const tables = context.sqlite
            .prepare(
                `SELECT name FROM sqlite_master
                 WHERE type = 'table' AND name IN (?, ?)`,
            )
            .all("saved_build_parts", "saved_build_orders") as {name: string}[]

        expect(tables.map((table) => table.name).sort()).toEqual([
            "saved_build_orders",
            "saved_build_parts",
        ])
    })

    // 初期構成は構成が0件のときだけ作られる
    it("初期構成は0件のときだけ作成される", async () => {
        const repository = new D1SavedBuildRepository(context.database)

        await repository.ensureInitialConfig(USER_ID)

        const first = await repository.listAll(USER_ID)

        expect(first).toHaveLength(1)
        expect(first[0]?.name).toBe("構成1")

        // 2回目は作成されない
        await repository.ensureInitialConfig(USER_ID)

        expect(await repository.listAll(USER_ID)).toHaveLength(1)
    })

    // 作成・一覧・名前変更・削除が実SQLで成立
    it("構成の作成・名前変更・削除が実SQLで成立する", async () => {
        const repository = new D1SavedBuildRepository(context.database)

        await repository.ensureInitialConfig(USER_ID)

        const created = await repository.create(USER_ID, "通勤用", [])

        expect(created.name).toBe("通勤用")
        expect(await repository.listAll(USER_ID)).toHaveLength(2)

        const renamed = await repository.rename(
            USER_ID,
            created.id,
            created.version,
            "レース用",
        )

        expect(renamed.kind).toBe("updated")

        // 名前変更結果がupdated以外なら例外を投げる
        if (renamed.kind !== "updated") {
            throw new Error("名前変更に失敗しました")
        }

        expect(renamed.build.version).toBe(created.version + 1)
        expect((await repository.findById(USER_ID, created.id))?.name)
            .toBe("レース用")

        // 最後の1件まで削除できる
        const removed = await repository.delete(
            USER_ID,
            renamed.build.id,
            renamed.build.version,
        )

        expect(removed.kind).toBe("deleted")
        expect(await repository.listAll(USER_ID)).toHaveLength(1)

        const initial = (await repository.listAll(USER_ID))[0]!
        const removedInitial = await repository.delete(
            USER_ID,
            initial.id,
            initial.version,
        )

        expect(removedInitial.kind).toBe("deleted")
        expect(await repository.listAll(USER_ID)).toHaveLength(0)
    })

    // 表示順の保存と取得が実SQLで成立
    it("表示順の保存と取得が実SQLで成立する", async () => {
        const builds = new D1SavedBuildRepository(context.database)
        const order = new D1ConfigOrderRepository(context.database)

        await builds.ensureInitialConfig(USER_ID)
        await builds.create(USER_ID, "通勤用", [])

        const current = await order.list(USER_ID)

        expect(current).toHaveLength(2)

        const reversed = [...current].reverse()

        expect(await order.save(USER_ID, reversed)).toEqual(reversed)
        expect(await order.list(USER_ID)).toEqual(reversed)
    })

    // パーツ付きの作成では、保存時点の価格・重量を保存
    it("パーツ付きの作成でスナップショットを保存する", async () => {
        const repository = new D1SavedBuildRepository(context.database)
        const partId = seedFramePart(context.sqlite)

        await repository.ensureInitialConfig(USER_ID)
        const created = await repository.create(USER_ID, "パーツ付き", [
            {slotKey: "frame", partId},
        ])

        // 実リポジトリの出力キーが、共有フィクスチャの契約と一致
        expect(Object.keys(created).sort())
            .toEqual(Object.keys(fixture[0]!).sort())
        expect(Object.keys(created.parts[0]!).sort())
            .toEqual(Object.keys(fixture[0]!.parts[0]!).sort())
        expect(created.parts).toEqual([{
            slotKey: "frame",
            partId,
            price: 100000,
            weight: 1000,
        }])

        const listed = await repository.findById(USER_ID, created.id)

        expect(listed?.parts).toHaveLength(1)

        // パーツを外す更新も実SQLで反映される
        const updated = await repository.update(
            USER_ID,
            created.id,
            created.version,
            "更新後",
            [],
        )

        expect(updated.kind).toBe("updated")

        // パーツを外す更新がupdated以外なら例外を投げる
        if (updated.kind !== "updated") {
            throw new Error("更新に失敗しました")
        }

        expect(updated.build.name).toBe("更新後")
        expect(updated.build.parts).toEqual([])
    })

    // 更新でパーツを追加でき、スナップショットとversion加算が反映される
    it("更新でパーツを追加できる", async () => {
        const repository = new D1SavedBuildRepository(context.database)
        const partId = seedFramePart(context.sqlite)

        await repository.ensureInitialConfig(USER_ID)
        const created = await repository.create(USER_ID, "パーツなし", [])

        expect(created.parts).toEqual([])

        const updated = await repository.update(
            USER_ID,
            created.id,
            created.version,
            "パーツあり",
            [{slotKey: "frame", partId}],
        )

        expect(updated.kind).toBe("updated")

        // パーツを追加する更新がupdated以外なら例外を投げる
        if (updated.kind !== "updated") {
            throw new Error("更新に失敗しました")
        }

        // パーツのINSERT経路とスナップショット、version加算を確認
        expect(updated.build.version).toBe(created.version + 1)
        expect(updated.build.parts).toEqual([{
            slotKey: "frame",
            partId,
            price: 100000,
            weight: 1000,
        }])

        const current = await repository.findById(USER_ID, created.id)

        expect(current?.name).toBe("パーツあり")
        expect(current?.parts).toHaveLength(1)
    })

    // 同じミリ秒に競合した更新があっても、保存済みのパーツを消さない
    it("同じミリ秒の競合した更新でもパーツを保持する", async () => {
        const repository = new D1SavedBuildRepository(context.database)
        const partId = seedFramePart(context.sqlite)

        await repository.ensureInitialConfig(USER_ID)
        const created = await repository.create(USER_ID, "パーツ付き", [
            {slotKey: "frame", partId},
        ])

        // 更新時刻を固定し、同一ミリ秒の競合を再現
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-08-05T00:00:00.000Z"))

        const updated = await repository.update(
            USER_ID,
            created.id,
            created.version,
            "更新後",
            [{slotKey: "frame", partId}],
        )

        expect(updated.kind).toBe("updated")

        // 古いversionの更新は競合し、パーツは変わらない
        const conflicted = await repository.update(
            USER_ID,
            created.id,
            created.version,
            "競合する更新",
            [],
        )

        expect(conflicted.kind).toBe("conflict")

        const current = await repository.findById(USER_ID, created.id)

        expect(current?.name).toBe("更新後")
        expect(current?.parts).toHaveLength(1)
    })

    // 競合した更新では、パーツの追加も行われない
    it("競合した更新ではパーツを追加しない", async () => {
        const repository = new D1SavedBuildRepository(context.database)
        const partId = seedFramePart(context.sqlite)

        await repository.ensureInitialConfig(USER_ID)
        const created = await repository.create(USER_ID, "パーツ付き", [
            {slotKey: "frame", partId},
        ])

        // パーツを空にして更新
        const cleared = await repository.update(
            USER_ID,
            created.id,
            created.version,
            "パーツなし",
            [],
        )

        expect(cleared.kind).toBe("updated")

        // 古いversionでパーツを追加しようとしても、競合して追加されない
        const conflicted = await repository.update(
            USER_ID,
            created.id,
            created.version,
            "競合する追加",
            [{slotKey: "frame", partId}],
        )

        expect(conflicted.kind).toBe("conflict")

        const current = await repository.findById(USER_ID, created.id)

        expect(current?.name).toBe("パーツなし")
        expect(current?.parts).toEqual([])
    })

    // 重複スロットの作成は、構成本体も含めて取り消される(バッチのトランザクション)
    it("重複スロットの作成は全体を取り消す", async () => {
        const repository = new D1SavedBuildRepository(context.database)
        const partId = seedFramePart(context.sqlite)

        await repository.ensureInitialConfig(USER_ID)

        await expect(repository.create(USER_ID, "重複", [
            {slotKey: "frame", partId},
            {slotKey: "frame", partId},
        ])).rejects.toThrow()

        // 構成本体も残っていない
        expect(await repository.listAll(USER_ID)).toHaveLength(1)

        const parts = context.sqlite
            .prepare("SELECT count(*) AS count FROM saved_build_parts")
            .get() as {count: number}

        expect(parts.count).toBe(0)
    })

    // 上限(20件)を超える作成は拒否される
    it("上限を超える作成を拒否する", async () => {
        const repository = new D1SavedBuildRepository(context.database)

        await repository.ensureInitialConfig(USER_ID)

        for (let index = 0; index < 19; index += 1) {
            await repository.create(USER_ID, `構成${index + 2}`, [])
        }

        await expect(repository.create(USER_ID, "超過", []))
            .rejects.toBeInstanceOf(SavedBuildLimitExceededError)
    })

    // 古いversionの変更・削除は競合として拒否される
    it("古いversionの変更と削除は競合になる", async () => {
        const repository = new D1SavedBuildRepository(context.database)

        await repository.ensureInitialConfig(USER_ID)
        const created = await repository.create(USER_ID, "通勤用", [])

        await expect(repository.rename(USER_ID, created.id, 999, "改名"))
            .resolves.toEqual({kind: "conflict"})
        await expect(repository.delete(USER_ID, created.id, 999))
            .resolves.toEqual({kind: "conflict"})
        await expect(repository.rename(USER_ID, "missing-id", 1, "改名"))
            .resolves.toEqual({kind: "not_found"})
    })

    // 外部キー違反はSQLite側で拒否される
    it("存在しないユーザーの構成は作成できない", () => {
        expect(() => context.sqlite.prepare(
            `INSERT INTO saved_builds (
                 id, user_id, name, version, created_at, updated_at
             ) VALUES (?, ?, ?, 1, ?, ?)`,
        ).run(
            "11111111-1111-4111-8111-111111111111",
            "missing-user",
            "構成1",
            "2026-01-01T00:00:00.000Z",
            "2026-01-01T00:00:00.000Z",
        )).toThrow()
    })

    // 外部キーの整合性が保たれている
    it("外部キーの整合性が保たれている", async () => {
        const repository = new D1SavedBuildRepository(context.database)

        await repository.ensureInitialConfig(USER_ID)
        await repository.create(USER_ID, "通勤用", [])

        const violations = context.sqlite
            .prepare("SELECT count(*) AS count FROM pragma_foreign_key_check")
            .get() as {count: number}

        expect(violations.count).toBe(0)
    })
})
