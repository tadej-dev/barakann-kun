// アカウント削除処理の結果
export type DeleteAccountResult =
    // HTTP層で削除成功と対象なしを区別するための結果種別
    | {kind: "deleted"}
    | {kind: "not_found"}

// 表示名の変更結果
export type UpdateDisplayNameResult =
    | {kind: "updated", displayName: string}
    | {kind: "not_found"}

// 認証ユーザーと関連データを削除するRepository契約
export interface AccountRepository {
    // userIdに紐づく認証情報と保存データをまとめて削除する
    deleteUser(userId: string): Promise<DeleteAccountResult>
    // ログイン中のユーザーの表示名を変更する(呼び出し側で整形・検証済みの値を渡す)
    updateDisplayName(userId: string, displayName: string): Promise<UpdateDisplayNameResult>
}
