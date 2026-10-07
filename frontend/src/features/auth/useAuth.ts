import {useContext} from "react"

import {AuthContext} from "@/features/auth/authContext"

// 認証状態取得用フック
export function useAuth() {
    // Provider外の利用を早期に検出し、認証状態が常にContextから供給されることを保証する。
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error("useAuthはAuthProvider内で使用してください")
    }

    return context
}
