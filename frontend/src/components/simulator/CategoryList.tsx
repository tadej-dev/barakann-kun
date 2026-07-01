import type { Category } from "@/types/category"

// カテゴリー一覧のプロパティ
type CategoryListProps = {
    categories: Category[] // APIから取得したカテゴリー一覧
    activeCategory: string // 選択中のカテゴリーキー
    onCategoryChange: (category: string) => void // カテゴリー変更処理
}

// カテゴリー選択欄
export function CategoryList({
                                 categories,
                                 activeCategory,
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

                    return (
                        <button
                            key={category.id}
                            type="button"
                            aria-selected={isActive}
                            className="group flex w-full items-center rounded border border-slate-800 bg-[#101518] px-3 py-3 text-left text-xs text-slate-300 hover:border-sky-500 hover:bg-sky-500 hover:text-white aria-selected:border-sky-500 aria-selected:bg-sky-500 aria-selected:text-white"
                            onClick={() =>
                                onCategoryChange(category.key)
                            }
                        >
                            <span
                                className={
                                    isActive
                                        ? "mr-2 h-2.5 w-2.5 rounded-full bg-white ring-2 ring-sky-200"
                                        : "mr-2 h-2.5 w-2.5 rounded-full bg-slate-500 group-hover:bg-white"
                                }
                            />

                            <span>
                                {category.displayName}
                            </span>
                        </button>
                    )
                })}
            </div>
        </section>
    )
}