import { NavLink } from "react-router"

// フッターリンク一覧
const footerLinks = [
    {
        label: "利用規約", // 表示名
        to: "/terms", // 遷移先
    },
    {
        label: "プライバシーポリシー", // 表示名
        to: "/privacy", // 遷移先
    },
]

// フッター
export function Footer() {
    return (
        <footer className="shrink-0 border-t border-slate-800 bg-[#0b0f12] px-10 py-6 text-sm text-slate-400">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                    © 2026 barakann-kun
                </p>

                <nav
                    className="flex gap-6"
                    aria-label="フッターナビゲーション"
                >
                    {footerLinks.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className="hover:text-sky-400"
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </footer>
    )
}