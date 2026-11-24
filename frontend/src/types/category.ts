// APIから受け取るパーツカテゴリーの表示・検索用情報
export type Category = {
    id: number // カテゴリーID
    key: string // API・保存構成で使うカテゴリーキー
    displayName: string // 画面に表示するカテゴリー名
}
