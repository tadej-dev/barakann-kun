import {useContext} from "react"

import {AuthContext} from "@/features/auth/authContext"

// 認証状態取得用フック
export function useAuth() {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error("useAuthはAuthProvider内で使用してください")
    }

    return context
}
