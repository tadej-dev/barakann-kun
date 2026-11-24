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
        // 確定済みか（タイムアウトと応答の二重確定を防ぐ）
        let settled = false

        // 確定処理（成功値を1回だけ返す）
        const finish = (ok: boolean) => {
            // 確定済みなら二重に応答しない
            if (settled) {
                return
            }

            settled = true
            clearTimeout(timeout)
            resolve(ok)
        }

        // 3秒で確定できなかった場合のタイムアウト
        const timeout = setTimeout(() => finish(false), FLUSH_TIMEOUT_MS)

        // 自動保存がマウントされていない画面では、保留中の保存が無いものとして成功にする
        // 自動保存フックへ渡す確定依頼
        const detail: LogoutFlushDetail = {handled: false, respond: finish}

        signal.addEventListener("abort", () => finish(false), {once: true})
        window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_FLUSH_EVENT, {detail}))

        queueMicrotask(() => {
            // 依頼を処理するフックが無ければ保存不要として成功
            if (!detail.handled) {
                finish(true)
            }
        })
    })
}

// ログアウト前に、アカウントの構成をブラウザへ保存する
export function useLogoutWithSave() {
    // ログイン中のユーザーとログアウト処理
    const {user, logout} = useAuth()
    const [status, setStatus] = useState<LogoutSaveStatus>("idle") // ダイアログの状態
    const [errorMessage, setErrorMessage] = useState("") // 失敗時に表示するメッセージ
    const [failureKind, setFailureKind] = useState<LogoutFailureKind>(null) // 失敗の種類
    const runIdRef = useRef(0) // 実行番号（古い結果の破棄用）
    const controllerRef = useRef<AbortController | null>(null) // 進行中の保存処理を中断する制御

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

        const controller = new AbortController() // 保存処理を中断する制御
        const runId = ++runIdRef.current // 保存処理の実行番号
        const isCurrent = () => // 中断・再実行されていないか判定する関数
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

            // サーバーに保存済みの構成と表示順
            const [builds, order] = await Promise.all([
                fetchSavedBuilds(controller.signal),
                fetchConfigOrder(controller.signal),
            ])

            // 中断・再実行されていたら取得結果を反映しない
            if (!isCurrent()) {
                return
            }

            // ブラウザへ保存する構成一覧と表示順
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

            // ログアウトに成功したか
            const loggedOut = await logout()

            // ログアウト中にキャンセルされていたら、結果を反映しない
            if (!isCurrent()) {
                return
            }

            // ログアウトに失敗したら再試行できる失敗状態を表示
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
            // 中断・再実行されていたらエラーを表示しない
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
        // ログアウトに成功したか
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
        // ログアウトに成功したか
        const loggedOut = await logout()

        // ログアウトに失敗したら失敗状態を表示
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
        // ログアウトだけ失敗した場合はログアウトをやり直す
        if (failureKind === "logout") {
            await logoutOnly()
            return
        }

        // 保存せずログアウトして失敗した場合は同じ操作をやり直す
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
