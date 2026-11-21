// 使い方画面
// 未ログインとログインの保存先、構成の引き継ぎとログアウト時の保存を説明する。
export function GuidePage() {
    return (
        <div className="bg-slate-50 text-slate-900">
            <main className="mx-auto max-w-4xl px-6 py-12">
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                        使い方
                    </h1>

                    <p className="mt-4 text-sm leading-7 text-slate-600">
                        barakann-kunで構成を保存するときの動きをまとめています。
                        ログインしていなくても、構成の作成・編集・並び替えは同じように使えます。
                    </p>
                </div>

                <article className="space-y-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                    {/* 共有端末を想定しない前提を、最初に明示する。 */}
                    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <h2 className="text-lg font-bold text-amber-950">
                            1台の端末を1人で使う前提です
                        </h2>

                        <p className="mt-2 text-sm leading-7 text-amber-950/80">
                            このサービスは、1台の端末を1人で使うことを想定しています。
                            複数の人が同じ端末を共有して使うことは想定していません。
                        </p>
                    </section>

                    {/* 保存先の違い */}
                    <section>
                        <h2 className="mb-3 border-l-4 border-sky-500 pl-3 text-xl font-bold text-slate-900">
                            構成の保存先
                        </h2>

                        <div className="overflow-hidden rounded-lg border border-slate-200">
                            <table className="w-full text-left text-sm">
                                <caption className="sr-only">
                                    状態ごとの構成の保存先
                                </caption>
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 font-semibold">
                                            状態
                                        </th>
                                        <th scope="col" className="px-4 py-3 font-semibold">
                                            保存先
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr>
                                        <td className="px-4 py-3">
                                            未ログイン
                                        </td>
                                        <td className="px-4 py-3">
                                            ブラウザ（localStorage）
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-3">
                                            ログイン中
                                        </td>
                                        <td className="px-4 py-3">
                                            アカウント（サーバー）
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* ログイン時の引き継ぎ */}
                    <section>
                        <h2 className="mb-3 border-l-4 border-sky-500 pl-3 text-xl font-bold text-slate-900">
                            ログインすると、ブラウザの構成を引き継げます
                        </h2>

                        <p className="leading-8 text-slate-700">
                            未ログインで作った構成は、ログイン時にアカウントへ保存できます。
                            ブラウザとアカウントの構成に差があるときだけ確認ダイアログが表示されます。
                        </p>

                        <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-slate-700">
                            <li>
                                保存する構成をチェックボックスで選べます（既定では、新規の構成（残り枠に収まる構成）が選ばれています）。
                            </li>
                            <li>
                                すでに同じ構成がある場合は「移行済み」と表示され、二重には保存されません。
                            </li>
                            <li>
                                保存枠が足りない場合は「残り枠を超えています」と表示されます。
                                アカウントの構成を削除すると、保存できるようになります。
                            </li>
                            <li>
                                引き継がない場合は「保存しない」を選べます。
                            </li>
                        </ul>
                    </section>

                    {/* ログアウト時の保存 */}
                    <section>
                        <h2 className="mb-3 border-l-4 border-sky-500 pl-3 text-xl font-bold text-slate-900">
                            ログアウトすると、構成をブラウザへ保存します
                        </h2>

                        <p className="leading-8 text-slate-700">
                            ログアウトするときは、アカウントの構成と並び順をブラウザへ保存してからログアウトします。
                            「構成を保存しました」と表示されたら「閉じる」を押してください。
                            保存に失敗した場合は、再試行するか、保存せずにログアウトするかを選べます。
                            なお、ログアウト時の保存は、ブラウザにあった構成をアカウントの構成で置き換えます。
                            残したい構成がある場合は、ログイン時に引き継いでください。
                        </p>
                    </section>

                    {/* 上限と自動保存 */}
                    <section>
                        <h2 className="mb-3 border-l-4 border-sky-500 pl-3 text-xl font-bold text-slate-900">
                            構成の数と自動保存
                        </h2>

                        <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-slate-700">
                            <li>
                                構成は最大20件まで保存できます。
                            </li>
                            <li>
                                すべての構成を削除すると、「構成1」が自動で作られます。
                            </li>
                            <li>
                                パーツの変更は約0.8秒後に自動で保存されます。
                            </li>
                            <li>
                                自動保存に失敗したときは、自動で再試行されます。
                                画面にエラーが表示された場合は、再読み込みしてください。
                            </li>
                        </ul>
                    </section>
                </article>
            </main>
        </div>
    )
}
