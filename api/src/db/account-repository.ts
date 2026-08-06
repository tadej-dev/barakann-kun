// アカウント削除処理の結果
export type DeleteAccountResult =
    | {kind: "deleted"}
    | {kind: "not_found"}

// 認証ユーザーと関連データを削除するRepository契約
export interface AccountRepository {
    deleteUser(userId: string): Promise<DeleteAccountResult>
}

