import { NavLink } from "react-router"

// ヘッダー
export function Header() {
    return (
        <header className="flex items-center justify-between bg-[#0b0f12] px-10 py-5 text-white">
            <NavLink
                to="/"
                className="flex items-center gap-3 font-bold"
            >
                <span className="text-sky-400">
                    🚲
                </span>

                <span>
                    barakann-kun
                </span>
            </NavLink>
        </header>
    )
}