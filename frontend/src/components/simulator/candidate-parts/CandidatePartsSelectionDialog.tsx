import {AlertDialog} from "@base-ui/react/alert-dialog"

import {buttonVariants} from "@/components/ui/button"
import {getPartDisplayName} from "@/features/simulator/partDisplay"
import type {Part} from "@/types/part"

type PendingSelection = {
    part: Part
    removedPartNames: string[]
}

type CandidatePartsSelectionDialogProps = {
    selection: PendingSelection | null
    onConfirm: () => void
    onCancel: () => void
}

// 前後一括選択・非互換パーツの置換確認
export function CandidatePartsSelectionDialog({
    selection,
    onConfirm,
    onCancel,
}: CandidatePartsSelectionDialogProps) {
    // selectionがnullの間は閉じ、置換対象がある場合だけ確認操作を受け付ける。
    return (
        <AlertDialog.Root
            open={selection !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onCancel()
                }
            }}
        >
            <AlertDialog.Portal>
                <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"/>
                <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 text-foreground shadow-xl transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                    <AlertDialog.Title className="text-base font-bold">
                        選択中のパーツを置き換えますか？
                    </AlertDialog.Title>
                    <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                        {selection?.removedPartNames.join("、")}を解除して、
                        {selection && getPartDisplayName(selection.part)}を選択します。
                    </AlertDialog.Description>

                    <div className="mt-5 flex justify-center gap-2">
                        <AlertDialog.Close
                            className={buttonVariants({variant: "destructive"})}
                            onClick={onConfirm}
                        >
                            置き換える
                        </AlertDialog.Close>
                        <AlertDialog.Close
                            className={buttonVariants({variant: "outline"})}
                            onClick={onCancel}
                        >
                            キャンセル
                        </AlertDialog.Close>
                    </div>
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    )
}
