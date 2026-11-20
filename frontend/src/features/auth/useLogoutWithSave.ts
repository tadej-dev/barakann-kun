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
export type LogoutSaveStatus = "idle" | "saving" | "failed" | "succeeded"

// 失敗の種類。ダイアログの文言を出し分けるために使う
export type LogoutFailureKind = "save" | "logout" | "skip-logout" | null

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
    const [failureKind, setFailureKind] = useState<LogoutFailureKind>(null)
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
        setFailureKind(null)

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
                setFailureKind("save")
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
                setFailureKind("save")
                setErrorMessage("ブラウザに構成を保存できませんでした")
                return
            }

            const loggedOut = await logout()

            // ログアウト中にキャンセルされていたら、結果を反映しない
            if (!isCurrent()) {
                return
            }

            if (!loggedOut) {
                setStatus("failed")
                setFailureKind("logout")
                setErrorMessage(
                    "ログアウトに失敗しました。もう一度お試しください。",
                )
                return
            }

            // 成功を表示し、利用者が閉じるまで残す
            setStatus("succeeded")
        } catch (error) {
            if (!isCurrent()) {
                return
            }

            setStatus("failed")
            setFailureKind("save")
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
        setFailureKind(null)
    }, [])

    // 保存せずにログアウトする
    const skipSaveAndLogout = useCallback(async () => {
        cancel()
        const loggedOut = await logout()

        // ログアウトに失敗した場合は、ダイアログを開き直して知らせる
        if (!loggedOut) {
            setStatus("failed")
            setFailureKind("skip-logout")
            setErrorMessage(
                "ログアウトに失敗しました。もう一度お試しください。",
            )
        }
    }, [cancel, logout])

    // 保存済みの状態で、ログアウトだけをやり直す
    const logoutOnly = useCallback(async () => {
        cancel()
        const loggedOut = await logout()

        if (!loggedOut) {
            setStatus("failed")
            setFailureKind("logout")
            setErrorMessage(
                "ログアウトに失敗しました。もう一度お試しください。",
            )
        }
    }, [cancel, logout])

    // 失敗の種類に応じて再試行する
    const retry = useCallback(async () => {
        if (failureKind === "logout") {
            await logoutOnly()
            return
        }

        if (failureKind === "skip-logout") {
            await skipSaveAndLogout()
            return
        }

        // 保存に失敗した場合は、保存からやり直す
        await saveAndLogout()
    }, [failureKind, logoutOnly, saveAndLogout, skipSaveAndLogout])

    return {
        status,
        errorMessage,
        failureKind,
        saveAndLogout,
        retry,
        skipSaveAndLogout,
        cancel,
    }
}
