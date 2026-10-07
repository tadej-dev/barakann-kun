import {useState} from "react"

import type {ConfigSlot} from "@/api/configSlots"
import type {SavedBuild} from "@/api/savedBuilds"
import type {ConfigCollection} from "@/features/simulator/useConfigCollection"

// 構成の共有URLの作成・コピー・停止と、その結果の通知文を管理する
export function useShareActions(collection: ConfigCollection) {
    const {setConfigSlotSharing, setSavedBuildSharing} = collection
    const [shareNotice, setShareNotice] = useState("")

    // 共有URLをクリップボードへコピーする
    async function copyShareUrl(shareToken: string) {
        const shareUrl = `${window.location.origin}/shared/${shareToken}`

        try {
            await navigator.clipboard.writeText(shareUrl)
            setShareNotice("共有URLをコピーしました")
        } catch {
            // Clipboard APIを利用できない環境ではURLを画面に表示して手動コピーを可能にする
            setShareNotice(`共有URL: ${shareUrl}`)
        }
    }

    // 追加構成の共有を開始し、URLをコピーする
    async function startSavedBuildSharing(build: SavedBuild) {
        try {
            const updated = await setSavedBuildSharing(build, true)

            if (updated.shareToken) {
                await copyShareUrl(updated.shareToken)
            }
        } catch {
            // APIエラーは構成一覧下部の共通エラーへ表示する
        }
    }

    // 固定枠の共有を開始し、URLをコピーする
    async function startConfigSlotSharing(slot: ConfigSlot) {
        try {
            const updated = await setConfigSlotSharing(slot, true)

            if (updated.shareToken) {
                await copyShareUrl(updated.shareToken)
            }
        } catch {
            // APIエラーは構成一覧下部の共通エラーへ表示する
        }
    }

    // 固定枠の共有を停止する
    async function stopConfigSlotSharing(slot: ConfigSlot) {
        try {
            await setConfigSlotSharing(slot, false)
            setShareNotice("共有を停止しました")
        } catch {
            // APIエラーは構成一覧下部の共通エラーへ表示する
        }
    }

    // 追加構成の共有を停止する
    async function stopSavedBuildSharing(build: SavedBuild) {
        try {
            await setSavedBuildSharing(build, false)
            setShareNotice("共有を停止しました")
        } catch {
            // APIエラーは構成一覧下部の共通エラーへ表示する
        }
    }

    return {
        shareNotice,
        dismissShareNotice: () => setShareNotice(""),
        copyShareUrl,
        startConfigSlotSharing,
        stopConfigSlotSharing,
        startSavedBuildSharing,
        stopSavedBuildSharing,
    }
}

// 共有操作のまとまり。各構成の行へ、このまとまりのまま渡す。
export type ShareActions = ReturnType<typeof useShareActions>
