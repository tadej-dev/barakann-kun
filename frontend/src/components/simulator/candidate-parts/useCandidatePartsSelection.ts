import {useState} from "react"

import {
    evaluatePartCompatibility,
    getPartPackageUnit,
} from "@/features/simulator/partCompatibility"
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
    } | null>(null)
    const categorySlots = getPartSlots(activeSlot.categoryKey)

    function requestSelection(part: Part, selectBoth = false) {
        const packageUnit = getPartPackageUnit(part)
        const targetSlots = selectBoth || packageUnit === "pair"
            ? categorySlots
            : [activeSlot]
        const compatibilityResults = targetSlots.map((slot) =>
            evaluatePartCompatibility(part, slot, selectedParts),
        )

        if (compatibilityResults.some((result) => result?.positionMismatch)) {
            return
        }

        const conflictSlotKeys = compatibilityResults.flatMap(
            (result) => result?.conflictingSlotKeys ?? [],
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

        if (removeSlotKeys.length === 0) {
            onSelect(part, targetSlots.map((slot) => slot.key))
            return
        }

        setPendingSelection({
            part,
            slotKeys: targetSlots.map((slot) => slot.key),
            removeSlotKeys,
            removedPartNames: Array.from(new Set(
                removeSlotKeys
                    .map((slotKey) => selectedParts[slotKey]?.name)
                    .filter((name): name is string => Boolean(name)),
            )),
        })
    }

    function confirmPendingSelection() {
        if (!pendingSelection) {
            return
        }

        onSelect(
            pendingSelection.part,
            pendingSelection.slotKeys,
            pendingSelection.removeSlotKeys,
        )
        setPendingSelection(null)
    }

    return {
        cancelPendingSelection: () => setPendingSelection(null),
        categorySlots,
        confirmPendingSelection,
        pendingSelection,
        requestSelection,
    }
}
