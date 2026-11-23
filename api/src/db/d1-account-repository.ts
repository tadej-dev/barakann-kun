import type {
    AccountRepository,
    DeleteAccountResult,
    UpdateDisplayNameResult,
} from "./account-repository"

// 表示順マイグレーション前のD1でもアカウント削除を止めないための判定
function isMissingConfigOrderTableError(error: unknown): boolean {
    // Error以外はテーブル不足の判定対象外
    if (!(error instanceof Error)) {
        return false
    }

    // 表示順テーブルの不足を検出
    if (/no such table:\s*saved_build_orders/i.test(error.message)) {
        return true
    }

    // D1がSQLiteエラーをcauseへ包む場合もあるため原因を再帰的に確認
    return isMissingConfigOrderTableError(
        (error as Error & {cause?: unknown}).cause,
    )
}

// D1上のユーザー削除・表示名変更を扱うRepository
export class D1AccountRepository implements AccountRepository {
    // アカウントと関連データを同じD1データベースから削除
    constructor(private readonly database: D1Database) {}

    // ユーザーと保存データ・セッション・OAuth紐付けを一括削除
    async deleteUser(userId: string): Promise<DeleteAccountResult> {
        // 外部キーの設定に依存せず、保存構成・表示順・セッション・OAuth紐付けを先に削除
        // 同じD1バッチへまとめることで、途中まで削除された状態を残さない
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
        // 一括削除の実行結果
        let results: D1Result[]

        try {
            // 関連データからusersまでを一括実行して途中状態を残さない
            results = await this.database.batch(statements)
        } catch (error) {
            // 表示順テーブル以外の失敗は呼び出し元へ伝える
            if (!isMissingConfigOrderTableError(error)) {
                throw error
            }

            // 0005未適用の旧D1では存在しない表示順テーブルだけを外して再実行
            // D1のbatchは失敗時にロールバックされるため、途中削除は残らない
            results = await this.database.batch(
                statements.filter((_, index) => index !== 2),
            )
        }
        // 最後に実行したユーザー削除の結果
        const userDelete = results[results.length - 1]

        // 削除結果を取得できない場合は異常として扱う
        if (!userDelete) {
            throw new Error("アカウント削除の結果を取得できませんでした")
        }

        return userDelete.meta.changes > 0
            ? {kind: "deleted"}
            : {kind: "not_found"}
    }

    // ユーザーの表示名を更新し、対象なしを区別して返す
    async updateDisplayName(
        userId: string,
        displayName: string,
    ): Promise<UpdateDisplayNameResult> {
        // 本人の行だけを更新し、対象がなければアカウント削除済みと判断
        const result = await this.database.prepare(
            `UPDATE users
             SET display_name = ?, updated_at = ?
             WHERE id = ?`,
        ).bind(displayName, new Date().toISOString(), userId).run()

        return result.meta.changes > 0
            ? {kind: "updated", displayName}
            : {kind: "not_found"}
    }
}
