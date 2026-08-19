import type {
    AccountRepository,
    DeleteAccountResult,
} from "./account-repository"

// 表示順マイグレーション前のD1でもアカウント削除を止めないための判定
function isMissingConfigOrderTableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false
    }

    if (/no such table:\s*saved_build_orders/i.test(error.message)) {
        return true
    }

    // D1がSQLiteエラーをcauseへ包む場合もあるため原因を再帰的に確認する
    return isMissingConfigOrderTableError(
        (error as Error & {cause?: unknown}).cause,
    )
}

// D1上のユーザー関連データを削除するRepository
export class D1AccountRepository implements AccountRepository {
    // アカウントと関連データを同じD1データベースから削除する
    constructor(private readonly database: D1Database) {}

    async deleteUser(userId: string): Promise<DeleteAccountResult> {
        // 外部キーの設定に依存せず、保存構成・表示順・セッション・OAuth紐付けを先に削除する。
        // 同じD1バッチへまとめることで、途中まで削除された状態を残さない。
        const statements = [
            this.database.prepare(
                `DELETE FROM saved_build_parts
                 WHERE saved_build_id IN (
                     SELECT id FROM saved_builds WHERE user_id = ?
                 )`,
            ).bind(userId),
            this.database.prepare(
                "DELETE FROM saved_builds WHERE user_id = ?",
            ).bind(userId),
            this.database.prepare(
                "DELETE FROM saved_build_orders WHERE user_id = ?",
            ).bind(userId),
            this.database.prepare(
                "DELETE FROM sessions WHERE user_id = ?",
            ).bind(userId),
            this.database.prepare(
                "DELETE FROM auth_accounts WHERE user_id = ?",
            ).bind(userId),
            this.database.prepare(
                "DELETE FROM users WHERE id = ?",
            ).bind(userId),
        ]
        let results: D1Result[]

        try {
            // 関連データからusersまでを一括実行して途中状態を残さない
            results = await this.database.batch(statements)
        } catch (error) {
            if (!isMissingConfigOrderTableError(error)) {
                throw error
            }

            // 0005未適用の旧D1では、存在しない表示順テーブルだけを外して再実行する。
            // D1のbatchは失敗時にロールバックされるため、途中削除は残らない。
            results = await this.database.batch(
                statements.filter((_, index) => index !== 2),
            )
        }
        const userDelete = results[results.length - 1]

        // 最後のusers削除結果からアカウントの存在有無を判断する
        if (!userDelete) {
            throw new Error("アカウント削除の結果を取得できませんでした")
        }

        return userDelete.meta.changes > 0
            ? {kind: "deleted"}
            : {kind: "not_found"}
    }
}
