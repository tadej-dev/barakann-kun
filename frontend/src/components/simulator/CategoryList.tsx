import { Button } from "@/components/ui/button"
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
        <aside className="rounded-xl bg-zinc-950 p-4 text-white">
            <h2 className="mb-4 text-sm font-semibold">
                パーツ選択
            </h2>

            <div className="space-y-2">
                {categories.map((category) => {
                    // カテゴリーの選択状態
                    const isActive =
                        category.key === activeCategory

                    return (
                        <Button
                            key={category.id}
                            type="button"
                            variant={isActive ? "default" : "ghost"}
                            className="w-full justify-start"
                            aria-pressed={isActive}
                            onClick={() =>
                                onCategoryChange(category.key)
                            }
                        >
                            {category.displayName}
                        </Button>
                    )
                })}
            </div>
        </aside>
    )
}