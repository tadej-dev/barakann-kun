import {useEffect, useState} from "react"

import {fetchCategories} from "@/api/categories"
import {Simulator} from "@/components/simulator/Simulator"
import type {Category} from "@/types/category"

// シミュレーター画面
export function SimulatorPage() {
    // カテゴリー一覧
    const [categories, setCategories] = useState<
        Category[] // カテゴリー型の配列
    >([]) // 初期状態（未取得）

    // カテゴリー一覧の読み込み状態
    const [isLoading, setIsLoading] = useState(true)

    // カテゴリー取得時のエラーメッセージ
    const [errorMessage, setErrorMessage] = useState("")

    useEffect(() => {
        // 画面のマウント状態
        let isMounted = true

        // カテゴリー一覧の取得処理
        async function loadCategories() {
            try {
                const data = await fetchCategories()

                // 画面表示中のみカテゴリーを更新
                if (isMounted) {
                    setCategories(data)
                }
            } catch (error) {
                // 画面表示中のみエラーを更新
                if (isMounted) {
                    setErrorMessage(
                        error instanceof Error
                            ? error.message // Error型のメッセージ
                            : "エラーが発生しました", // Error型以外のメッセージ
                    )
                }
            } finally {
                // 画面表示中のみ読み込み状態を解除
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        // 非同期処理の実行
        void loadCategories()

        // 画面破棄時のマウント状態更新
        return () => {
            isMounted = false
        }
    }, []) // 初回表示時のみ実行

    // カテゴリー読み込み中の表示
    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 p-8 text-white">
                読み込み中...
            </div>
        )
    }

    // カテゴリー取得失敗時の表示
    if (errorMessage) {
        return (
            <div className="min-h-screen bg-zinc-950 p-8 text-red-400">
                {errorMessage}
            </div>
        )
    }

    // シミュレーター画面
    return <Simulator categories={categories}/>
}