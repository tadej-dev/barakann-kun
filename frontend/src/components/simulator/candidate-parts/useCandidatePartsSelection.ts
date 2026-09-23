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
    const [pendingSelection, setPendingSelection] = useState<{
        part: Part
        slotKeys: string[]
        removeSlotKeys: string[]
        removedPartNames: string[]
        unknownReasons: string[]
    } | null>(null)
    // フレーム選択で自動解除した内容を短時間だけ伝えるメッセージ。
    const [replacementNotice, setReplacementNotice] = useState<string | null>(null)
    const replacementNoticeTimerRef =
        useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const categorySlots = useMemo(
        () => getPartSlots(activeSlot.categoryKey),
        [activeSlot.categoryKey],
    )

    // 解除内容を数秒だけ表示し、連続操作時は最新の内容へ差し替える。
    const showReplacementNotice = useCallback((removedPartNames: string[]) => {
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
        if (replacementNoticeTimerRef.current) {
            clearTimeout(replacementNoticeTimerRef.current)
        }
    }, [])

    const requestSelection = useCallback((part: Part, selectBoth = false) => {
        const packageUnit = getPartPackageUnit(part)
        // 前後一括ボタン、またはペア販売情報がある場合は同じパーツを両スロットへ候補にする。
        const targetSlots = selectBoth || packageUnit === "pair"
            ? categorySlots
            : [activeSlot]
        const compatibilityResults = targetSlots.map((slot) =>
            evaluatePartCompatibility(part, slot, selectedParts),
        )

        // フレーム指定など保護対象の規格不一致は、確認ダイアログでも上書きさせない。
        if (compatibilityResults.some((result) => result?.selectionBlocked)) {
            return
        }

        const conflictSlotKeys = compatibilityResults.flatMap(
            (result) => result?.conflictingSlotKeys ?? [],
        )
        const unknownReasons = Array.from(
            new Set(
                compatibilityResults.flatMap((result) =>
                    result?.status === "unknown" ? result.reasons : [],
                ),
            ),
        )
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

    const confirmPendingSelection = useCallback(() => {
        // 置換確認を開いた後に選択状態が変わっても、保留中の操作だけを確定する。
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
