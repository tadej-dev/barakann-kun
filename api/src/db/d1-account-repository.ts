import type {
    AccountRepository,
    DeleteAccountResult,
} from "./account-repository"

// D1上のユーザー関連データを削除するRepository
export class D1AccountRepository implements AccountRepository {
    constructor(private readonly database: D1Database) {}

    async deleteUser(userId: string): Promise<DeleteAccountResult> {
        // 外部キーの設定に依存せず、保存構成・セッション・OAuth紐付けを先に削除する。
        // 同じD1バッチへまとめることで、途中まで削除された状態を残さない。
        const results = await this.database.batch([
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
                "DELETE FROM sessions WHERE user_id = ?",
            ).bind(userId),
            this.database.prepare(
                "DELETE FROM auth_accounts WHERE user_id = ?",
            ).bind(userId),
            this.database.prepare(
                "DELETE FROM users WHERE id = ?",
            ).bind(userId),
        ])
        const userDelete = results[4]

        if (!userDelete) {
            throw new Error("アカウント削除の結果を取得できませんでした")
        }

        return userDelete.meta.changes > 0
            ? {kind: "deleted"}
            : {kind: "not_found"}
    }
}

