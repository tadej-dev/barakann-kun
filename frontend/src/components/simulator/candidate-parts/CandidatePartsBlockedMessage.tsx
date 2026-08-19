import {AlertDialog} from "@base-ui/react/alert-dialog"

import {CandidatePartsTableMessage} from "./CandidatePartsTableMessage"
import {buttonVariants} from "@/components/ui/button"

type CandidatePartsBlockedMessageProps = {
    message: string
    showVariantColumn: boolean
    blockingCategoryNames: string[]
    blockingPartNames: string[]
    onRemove: () => void
}

// 選択不可カテゴリーの解除案内
export function CandidatePartsBlockedMessage({
    message,
    showVariantColumn,
    blockingCategoryNames,
    blockingPartNames,
    onRemove,
}: CandidatePartsBlockedMessageProps) {
    // 排他中のカテゴリー名と原因パーツを、解除前に利用者へ具体的に知らせる。
    const categoryLabel = blockingCategoryNames.join("・")
    const partLabel = blockingPartNames.join("、")

    return (
        <CandidatePartsTableMessage
            message={message}
            showVariantColumn={showVariantColumn}
        >
            <AlertDialog.Root>
                <AlertDialog.Trigger
                    className={buttonVariants({size: "sm"})}
                >
                    {categoryLabel}を解除して選択
                </AlertDialog.Trigger>

                <AlertDialog.Portal>
                    <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"/>
                    <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 text-foreground shadow-xl transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                        <AlertDialog.Title className="text-base font-bold">
                            {categoryLabel}を解除しますか？
                        </AlertDialog.Title>
                        <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                            {partLabel}を解除すると、このカテゴリーを選択できるようになります。
                        </AlertDialog.Description>

                        <div className="mt-5 flex justify-center gap-2">
                            <AlertDialog.Close
                                className={buttonVariants({
                                    variant: "destructive",
                                })}
                                onClick={onRemove}
                            >
                                解除する
                            </AlertDialog.Close>
                            <AlertDialog.Close
                                className={buttonVariants({
                                    variant: "outline",
                                })}
                            >
                                キャンセル
                            </AlertDialog.Close>
                        </div>
                    </AlertDialog.Popup>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </CandidatePartsTableMessage>
    )
}
