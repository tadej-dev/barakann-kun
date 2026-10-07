// プライバシーポリシー画面
export function PrivacyPage() {
    // 規約本文はAPIから取得せず、ビルド済みの静的コンテンツとして提供する。
    return (
        <div className="bg-slate-50 text-slate-900">
            <main className="mx-auto max-w-4xl px-6 py-12">
                <div className="mb-8">
                    <p className="mb-3 text-sm font-bold text-sky-600">
                        Privacy Policy
                    </p>

                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                        プライバシーポリシー
                    </h1>

                    <p className="mt-4 text-sm leading-7 text-slate-600">
                        本プライバシーポリシーは、barakann-kunにおけるユーザー情報の取り扱いについて定めるものです。
                    </p>
                </div>

                <article className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                    {/* 認証とサービス提供で取り扱う情報の概要 */}
                    <div className="mb-8 rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                        <p className="mt-1">
                            本サービスでは、Googleアカウントによるログイン機能を提供しています。
                            ログイン機能やサービス提供のため、必要な範囲でユーザー情報を取り扱います。
                        </p>
                    </div>

                    {/* Googleログインや利用状況から取得する情報 */}
                    <section className="mb-10">
                        <h2 className="mb-3 border-l-4 border-sky-500 pl-3 text-xl font-bold text-slate-900">
                            第1条（取得する情報）
                        </h2>

                        <p className="leading-8 text-slate-700">
                            Googleアカウントでログインした場合、表示名、メールアドレス、プロフィール画像、
                            Googleアカウントを識別するための情報を取得します。
                        </p>

                        <p className="mt-3 leading-8 text-slate-700">
                            また、サービス提供、問い合わせ対応、サービス改善等を行う場合には、利用状況、アクセス日時、ブラウザ情報、
                            端末情報、IPアドレス等の情報を取得する場合があります。
                        </p>
                    </section>

                    {/* ブラウザ内に保持する構成データと移行時の扱い */}
                    <section className="mb-10">
                        <h2 className="mb-3 border-l-4 border-sky-500 pl-3 text-xl font-bold text-slate-900">
                            第2条（localStorageの利用）
                        </h2>

                        <p className="leading-8 text-slate-700">
                            本サービスでは、ユーザーが選択したパーツ構成を保存するため、ブラウザのlocalStorageを利用する場合があります。
                        </p>

                        <p className="mt-3 leading-8 text-slate-700">
                            localStorageに保存される情報は、ユーザーが利用しているブラウザ内に保存されます。
                            ログイン後にユーザーが確認して移行を選択した場合は、選択した構成のパーツIDが
                            ユーザーのアカウントに紐づく保存構成としてサーバーへ送信されます。
                        </p>

                        <p className="mt-3 leading-8 text-slate-700">
                            ブラウザや端末を変更した場合、保存された構成データは引き継がれません。
                            また、ブラウザの設定変更、キャッシュ削除、ストレージ削除等により、保存されたデータが失われる場合があります。
                        </p>
                    </section>

                    {/* 取得情報を利用する目的 */}
                    <section className="mb-10">
                        <h2 className="mb-3 border-l-4 border-sky-500 pl-3 text-xl font-bold text-slate-900">
                            第3条（利用目的）
                        </h2>

                        <p className="mb-3 leading-8 text-slate-700">
                            本サービスで取得した情報は、以下の目的で利用します。
                        </p>

                        <ul className="list-disc space-y-2 pl-6 leading-8 text-slate-700">
                            <li>本サービスの提供、運営、改善のため</li>
                            <li>不具合や障害の調査、対応のため</li>
                            <li>利用状況の分析、機能改善の検討のため</li>
                            <li>お問い合わせへの対応のため</li>
                            <li>不正利用や規約違反への対応のため</li>
                        </ul>
                    </section>

                    {/* 法令に基づく場合を除く第三者提供の制限 */}
                    <section className="mb-10">
                        <h2 className="mb-3 border-l-4 border-sky-500 pl-3 text-xl font-bold text-slate-900">
                            第4条（第三者提供）
                        </h2>

                        <p className="leading-8 text-slate-700">
                            運営者は、法令に基づく場合を除き、ユーザーの個人情報を本人の同意なく第三者に提供しません。
                        </p>
                    </section>

                    {/* Google認証やホスティング等の外部サービス */}
                    <section className="mb-10">
                        <h2 className="mb-3 border-l-4 border-sky-500 pl-3 text-xl font-bold text-slate-900">
                            第5条（外部サービスの利用）
                        </h2>

                        <p className="leading-8 text-slate-700">
                            本サービスでは、Googleアカウントによる認証やホスティング等のために外部サービスを利用します。
                        </p>

                        <p className="mt-3 leading-8 text-slate-700">
                            Googleログインを利用する場合、Googleのプライバシーポリシー等に従って情報が取り扱われます。
                            その他の外部サービスについても、各サービスのプライバシーポリシーに従って情報が取り扱われる場合があります。
                        </p>
                    </section>

                    {/* ログイン状態の維持等に使うCookie類 */}
                    <section className="mb-10">
                        <h2 className="mb-3 border-l-4 border-sky-500 pl-3 text-xl font-bold text-slate-900">
                            第6条（Cookie等の利用）
                        </h2>

                        <p className="leading-8 text-slate-700">
                            本サービスでは、ログイン状態の維持、サービスの利便性向上、利用状況の分析、機能改善等のために
                            Cookieまたは類似の技術を利用する場合があります。
                        </p>

                        <p className="mt-3 leading-8 text-slate-700">
                            ユーザーは、ブラウザの設定によりCookieの利用を制限または無効にすることができます。
                            ただし、その場合、本サービスの一部機能が正常に利用できない場合があります。
                        </p>
                    </section>

                    {/* 取得情報の安全管理とアカウント削除時の消去 */}
                    <section className="mb-10">
                        <h2 className="mb-3 border-l-4 border-sky-500 pl-3 text-xl font-bold text-slate-900">
                            第7条（情報の管理）
                        </h2>

                        <p className="leading-8 text-slate-700">
                            運営者は、取得した情報について、漏えい、滅失、き損、不正アクセス等を防止するため、
                            必要かつ適切な範囲で安全管理に努めます。
                        </p>

                        <p className="mt-3 leading-8 text-slate-700">
                            ユーザーがアカウント削除を実行した場合、アカウント情報、認証情報、
                            保存構成および関連するセッション情報を削除します。
                        </p>
                    </section>

                    {/* ポリシーを変更する場合の扱い */}
                    <section className="mb-10">
                        <h2 className="mb-3 border-l-4 border-sky-500 pl-3 text-xl font-bold text-slate-900">
                            第8条（プライバシーポリシーの変更）
                        </h2>

                        <p className="leading-8 text-slate-700">
                            運営者は、必要に応じて本プライバシーポリシーを変更できるものとします。
                            変更後のプライバシーポリシーは、本サービス上に掲載された時点で効力を生じるものとします。
                        </p>
                    </section>

                    {/* 問い合わせ窓口に関する案内 */}
                    <section>
                        <h2 className="mb-3 border-l-4 border-sky-500 pl-3 text-xl font-bold text-slate-900">
                            第9条（お問い合わせ）
                        </h2>

                        <p className="leading-8 text-slate-700">
                            本プライバシーポリシーに関するお問い合わせは、運営者が指定する方法により行うものとします。
                        </p>
                    </section>
                </article>
            </main>
        </div>
    )
}
