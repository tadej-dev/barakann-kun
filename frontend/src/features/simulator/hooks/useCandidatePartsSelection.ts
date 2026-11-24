import {useCallback, useEffect, useMemo, useRef, useState} from "react"

import {
    evaluatePartCompatibility,
    getPartPackageUnit,
} from "@/features/simulator/partCompatibility"
import {getPartDisplayName} from "@/features/simulator/partDisplay"
import {getPartSlots, type PartSlot} from "@/features/simulator/partSlots"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Part} from "@/types/part"

type SelectPart = (
    part: Part,
    slotKeys?: string[],
    removeSlotKeys?: string[],
) => void

// 前後一括選択・非互換パーツの置換状態
export function useCandidatePartsSelection(
    activeSlot: PartSlot,
    selectedParts: SelectedParts,
    onSelect: SelectPart,
) {
    // 置換確認中のパーツと解除対象スロット
    const [pendingSelection, setPendingSelection] = useState<{
        part: Part
        slotKeys: string[]
        removeSlotKeys: string[]
        removedPartNames: string[]
        unknownReasons: string[]
    } | null>(null)
    // フレーム選択で自動解除した内容を短時間だけ伝えるメッセージ。
    const [replacementNotice, setReplacementNotice] = useState<string | null>(null)
    // 置換メッセージを消すタイマー
    const replacementNoticeTimerRef =
        useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    // 選択中カテゴリーの前後スロット
    const categorySlots = useMemo(
        () => getPartSlots(activeSlot.categoryKey),
        [activeSlot.categoryKey],
    )

    // 解除内容を5秒だけ表示し、連続操作時は最新の内容へ差し替える
    const showReplacementNotice = useCallback((removedPartNames: string[]) => {
        // 前回のタイマーが残っていれば先に止める
        if (replacementNoticeTimerRef.current) {
            clearTimeout(replacementNoticeTimerRef.current)
        }

        setReplacementNotice(
            removedPartNames.length > 0
                ? `${removedPartNames.join("、")}は規格が合わないため解除しました`
                : "規格が合わないパーツを解除しました",
        )
        replacementNoticeTimerRef.current = setTimeout(() => {
            setReplacementNotice(null)
            replacementNoticeTimerRef.current = undefined
        }, 5000)
    }, [])

    // アンマウント時に保留中のタイマーを片付ける。
    useEffect(() => () => {
        // 画面破棄時に置換メッセージのタイマーを解放
        if (replacementNoticeTimerRef.current) {
            clearTimeout(replacementNoticeTimerRef.current)
        }
    }, [])

    const requestSelection = useCallback((part: Part, selectBoth = false) => { // パーツ選択の互換判定と置換確認を行う
        const packageUnit = getPartPackageUnit(part) // パーツの販売単位(単品・前後ペア)
        const targetSlots = selectBoth || packageUnit === "pair" // 前後一括・ペア販売なら両スロットへ同じパーツを候補
            ? categorySlots
            : [activeSlot]
        // 選択先スロットごとの適合判定
        const compatibilityResults = targetSlots.map((slot) =>
            evaluatePartCompatibility(part, slot, selectedParts),
        )

        // フレーム指定など保護対象の規格不一致は、確認ダイアログでも上書きさせない。
        if (compatibilityResults.some((result) => result?.selectionBlocked)) {
            return
        }

        // 規格競合で解除するスロット
        const conflictSlotKeys = compatibilityResults.flatMap(
            (result) => result?.conflictingSlotKeys ?? [],
        )
        // 規格を確認できない理由の重複なし一覧
        const unknownReasons = Array.from(
            new Set(
                compatibilityResults.flatMap((result) =>
                    result?.status === "unknown" ? result.reasons : [],
                ),
            ),
        )
        // 前後一括選択で上書きされる既存パーツのスロット
        const overwrittenSlotKeys = selectBoth || packageUnit === "pair"
            ? targetSlots
                .map((slot) => slot.key)
                .filter((slotKey) => {
                    const selectedPart = selectedParts[slotKey]

                    return selectedPart && selectedPart.id !== part.id
                })
            : []
        const removeSlotKeys = Array.from(new Set([
            ...conflictSlotKeys,
            ...overwrittenSlotKeys,
        ]))
        // 解除する既存パーツの表示名
        const removedPartNames = Array.from(new Set(
            removeSlotKeys
                .map((slotKey) => {
                    const selectedPart = selectedParts[slotKey]

                    return selectedPart
                        ? getPartDisplayName(selectedPart)
                        : undefined
                })
                .filter((name): name is string => Boolean(name)),
        ))

        // フレームは基準パーツ。規格が合わない選択済みパーツは確認せず解除して選び直す。
        if (part.categoryKey === "frame" && removeSlotKeys.length > 0) {
            onSelect(
                part,
                targetSlots.map((slot) => slot.key),
                removeSlotKeys,
            )
            showReplacementNotice(removedPartNames)
            return
        }

        // 競合も規格未確認も無い場合は確認なしで選択
        if (removeSlotKeys.length === 0 && unknownReasons.length === 0) {
            // 既存選択との競合も規格未確認もない候補は確認なしで即時反映する
            onSelect(part, targetSlots.map((slot) => slot.key))
            return
        }

        setPendingSelection({
            part,
            slotKeys: targetSlots.map((slot) => slot.key),
            removeSlotKeys,
            removedPartNames,
            unknownReasons,
        })
    }, [
        activeSlot,
        categorySlots,
        onSelect,
        selectedParts,
        showReplacementNotice,
    ])

    // 前後一括選択ボタンへ渡すコールバックを安定化
    const requestSelectionBoth = useCallback((part: Part) => {
        requestSelection(part, true)
    }, [requestSelection])

    // 保留中の選択を確定してダイアログを閉じる
    const confirmPendingSelection = useCallback(() => {
        // 置換確認を開いた後に選択状態が変わっても、保留中の操作だけを確定する。
        // 確認対象が無ければ何もしない
        if (!pendingSelection) {
            return
        }

        onSelect(
            pendingSelection.part,
            pendingSelection.slotKeys,
            pendingSelection.removeSlotKeys,
        )
        setPendingSelection(null)
    }, [onSelect, pendingSelection])

    return {
        // 保留中の選択を破棄
        cancelPendingSelection: useCallback(
            () => setPendingSelection(null),
            [],
        ),
        categorySlots,
        confirmPendingSelection,
        pendingSelection,
        replacementNotice,
        requestSelection,
        requestSelectionBoth,
    }
}
