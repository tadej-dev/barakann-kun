import type {ConfigSlot} from "@/api/configSlots"
import type {ConfigId} from "@/features/simulator/simulatorTypes"

// 並び順のIDに従って構成を並べ替える。未知のIDや欠落は無視する。
export function orderSlotsByIds(
    slots: ConfigSlot[],
    orderedIds: ConfigId[],
): ConfigSlot[] {
    return orderedIds
        .map((configId) => slots.find((slot) => slot.configId === configId))
        .filter((slot): slot is ConfigSlot => Boolean(slot))
}
