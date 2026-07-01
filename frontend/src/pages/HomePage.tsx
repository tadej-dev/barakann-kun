import { NavLink } from "react-router"

// ホーム画面
export function HomePage() {
    return (
        <div className="bg-white">
            <section className="flex min-h-[calc(100vh-64px)] w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_34%)] px-8 py-20 text-center lg:px-16">
                <div className="w-full max-w-5xl">
                    <p className="mb-5 text-xs font-extrabold uppercase tracking-widest text-sky-500">
                        Road bike build simulator
                    </p>

                    <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                        <span className="block">
                            理想の一台を、
                        </span>

                        <span className="block whitespace-nowrap">
                            パーツから組み上げる。
                        </span>
                    </h1>

                    <p className="mx-auto mt-8 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                        <span className="block">
                            フレーム、コンポ、ホイールを選びながら、
                        </span>

                        <span className="block">
                            総額と重量をすぐに確認できる
                            ロードバイクのバラ完シミュレータです。
                        </span>
                    </p>

                    <div className="mt-10 flex justify-center">
                        <NavLink
                            to="/simulator"
                            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-sky-500 px-7 text-sm font-extrabold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-600"
                        >
                            シミュレーションを始める
                        </NavLink>
                    </div>
                </div>
            </section>
        </div>
    )
}