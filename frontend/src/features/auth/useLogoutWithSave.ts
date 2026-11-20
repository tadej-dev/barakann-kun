import {useCallback, useEffect, useRef, useState} from "react"

import {fetchConfigOrder} from "@/api/configOrder"
import {fetchSavedBuilds} from "@/api/savedBuilds"
import {
    AUTH_LOGOUT_FLUSH_EVENT,
    type LogoutFlushDetail,
} from "@/features/auth/authEvents"
import {useAuth} from "@/features/auth/useAuth"
import {saveServerSnapshotToLocal} from "@/lib/local-config-sync"

// ダイアログ状態（idleは非表示）
export type LogoutSaveStatus = "idle" | "saving" | "failed"

// 確定待ちの上限（3秒）
const FLUSH_TIMEOUT_MS = 3000

// 保留中の自動保存を確定させ、保存できたかを返す
function flushPendingAutoSave(signal: AbortSignal): Promise<boolean> {
    return new Promise((resolve) => {
        let settled = false

        const finish = (ok: boolean) => {
            if (settled) {
                return
            }

            settled = true
            clearTimeout(timeout)
            resolve(ok)
        }

        const timeout = setTimeout(() => finish(false), FLUSH_TIMEOUT_MS)

        // 自動保存がマウントされていない画面では、保留中の保存が無いものとして成功にする
        const detail: LogoutFlushDetail = {handled: false, respond: finish}

        signal.addEventListener("abort", () => finish(false), {once: true})
        window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_FLUSH_EVENT, {detail}))

        queueMicrotask(() => {
            if (!detail.handled) {
                finish(true)
            }
        })
    })
}

// ログアウト前に、アカウントの構成をブラウザへ保存する
export function useLogoutWithSave() {
    const {user, logout} = useAuth()
    const [status, setStatus] = useState<LogoutSaveStatus>("idle")
    const [errorMessage, setErrorMessage] = useState("")
    // 実行番号（古い結果の破棄用）
    const runIdRef = useRef(0)
    const controllerRef = useRef<AbortController | null>(null)

    // 画面を離れるときは進行中の処理を中断する
    useEffect(() => () => {
        controllerRef.current?.abort()
    }, [])

    // 保存できたらログアウトし、失敗したら選択肢を出す
    const saveAndLogout = useCallback(async () => {
        // 二重実行を防ぐ
        if (status === "saving") {
            return
        }

        controllerRef.current?.abort()

        const controller = new AbortController()
        const runId = ++runIdRef.current
        const isCurrent = () =>
            runIdRef.current === runId && !controller.signal.aborted

        controllerRef.current = controller

        // 未ログイン時は、そのままログアウトする
        if (!user) {
            await logout()
            return
        }

        setStatus("saving")
        setErrorMessage("")

        try {
            // 直前の編集を確定できたかを確認する
            const flushed = await flushPendingAutoSave(controller.signal)

            // キャンセル・再実行されていたら、この結果は捨てる
            if (!isCurrent()) {
                return
            }

            // 自動保存を確定できなければ失敗として扱う
            if (!flushed) {
                setStatus("failed")
                setErrorMessage(
                    "自動保存を確定できませんでした。もう一度お試しください。",
                )
                return
            }

            const [builds, order] = await Promise.all([
                fetchSavedBuilds(controller.signal),
                fetchConfigOrder(controller.signal),
            ])

            if (!isCurrent()) {
                return
            }

            const snapshot = {
                configs: builds.map((build) => ({
                    id: build.id,
                    name: build.name,
                    parts: build.parts,
                })),
                order,
            }

            // 保存に失敗した場合は、ログアウトせず再試行できるようにする
            if (!saveServerSnapshotToLocal(user.id, snapshot)) {
                setStatus("failed")
                setErrorMessage("ブラウザに構成を保存できませんでした")
                return
            }

            await logout()
            setStatus("idle")
        } catch (error) {
            if (!isCurrent()) {
                return
            }

            setStatus("failed")
            setErrorMessage(error instanceof Error
                ? error.message
                : "構成の保存に失敗しました")
        }
    }, [status, user, logout])

    // 進行中の処理を中断し、保存をあきらめてダイアログを閉じる
    const cancel = useCallback(() => {
        runIdRef.current += 1
        controllerRef.current?.abort()
        controllerRef.current = null
        setStatus("idle")
        setErrorMessage("")
    }, [])

    // 保存せずにログアウトする
    const skipSaveAndLogout = useCallback(async () => {
        cancel()
        await logout()
    }, [cancel, logout])

    return {
        status,
        errorMessage,
        saveAndLogout,
        retry: saveAndLogout,
        skipSaveAndLogout,
        cancel,
    }
}
