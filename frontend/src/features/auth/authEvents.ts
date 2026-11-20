// ログアウト完了イベント
export const AUTH_LOGGED_OUT_EVENT = "barakann:auth-logged-out"

// 自動保存の確定依頼イベント
export const AUTH_LOGOUT_FLUSH_EVENT = "barakann:logout-flush-autosave"

// 確定依頼の受け渡し（handled / respond）
export type LogoutFlushDetail = {
    handled: boolean
    respond: (ok: boolean) => void
}
