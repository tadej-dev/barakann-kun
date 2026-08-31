import type { Category } from "@/types/category"

// カテゴリー一覧のプロパティ
type CategoryListProps = {
    categories: Category[] // APIから取得したカテゴリー一覧
    activeCategory: string // 選択中のカテゴリーキー
    blockedCategoryKeys: ReadonlySet<string> // 選択済みパーツが占有するカテゴリー
    frameSelected: boolean // 規格の基準となるフレームが選択済みかどうか
    onCategoryChange: (category: string) => void // カテゴリー変更処理
}

// カテゴリー選択欄
export function CategoryList({
                                 categories,
                                 activeCategory,
                                 blockedCategoryKeys,
                                 frameSelected,
                                 onCategoryChange,
                             }: CategoryListProps) {
    return (
        <section>
            <h2 className="mb-6 text-sm font-bold">
                パーツ選択
            </h2>

            <div className="space-y-2">
                {categories.map((category) => {
                    const isActive = category.key === activeCategory
                    const isBlocked = blockedCategoryKeys.has(category.key)
                    const isFrameRequired = !frameSelected && category.key !== "frame"

                    // 占有中のカテゴリーもクリック可能にし、候補表側の解除ダイアログへ誘導する
                    return (
                        <button
                            key={category.id}
                            type="button"
                            disabled={isFrameRequired}
                            aria-selected={isActive}
                            title={
                                isFrameRequired
                                    ? "先にフレームを選択してください"
                                    : isBlocked
                                    ? "クリックして解除方法を確認"
                                    : undefined
                            }
                            className={`group flex w-full items-center rounded border px-3 py-3 text-left text-xs transition-colors aria-selected:border-sky-500 aria-selected:bg-sky-500 aria-selected:text-white ${
                                isFrameRequired
                                    ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600"
                                    : isBlocked
                                    ? "border-slate-800 bg-slate-900 text-slate-500 hover:border-sky-700 hover:bg-slate-800 hover:text-slate-300"
                                    : "border-slate-800 bg-[#101518] text-slate-300 hover:border-sky-500 hover:bg-sky-500 hover:text-white"
                            }`}
                            onClick={() => onCategoryChange(category.key)}
                        >
                            <span
                                className={
                                    isActive
                                        ? "mr-2 h-2.5 w-2.5 rounded-full bg-white ring-2 ring-sky-200"
                                        : "mr-2 h-2.5 w-2.5 rounded-full bg-slate-500 group-hover:bg-white"
                                }
                            />

                            <span className="flex flex-col gap-0.5">
                                {category.displayName}

                                {isFrameRequired ? (
                                    <span className="text-[10px] font-normal">
                                        フレーム選択後に選択できます
                                    </span>
                                ) : isBlocked && (
                                    <span className="text-[10px] font-normal">
                                        解除して選択できます
                                    </span>
                                )}
                            </span>
                        </button>
                    )
                })}
            </div>
        </section>
    )
}
