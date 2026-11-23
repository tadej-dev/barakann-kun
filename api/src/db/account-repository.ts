// アカウント削除処理の結果
export type DeleteAccountResult =
    // HTTP層で削除成功と対象なしを区別するための結果種別
    | {kind: "deleted"}
    | {kind: "not_found"}

// 表示名の変更結果
export type UpdateDisplayNameResult =
    | {kind: "updated", displayName: string}
    | {kind: "not_found"}

// 認証ユーザーの削除と表示名変更を扱うRepository契約
export interface AccountRepository {
    // userIdに紐づく認証情報と保存データをまとめて削除
    deleteUser(userId: string): Promise<DeleteAccountResult>
    // ログイン中のユーザーの表示名を変更(整形・検証済みの値を呼び出し側から受け取る)
    updateDisplayName(userId: string, displayName: string): Promise<UpdateDisplayNameResult>
}
