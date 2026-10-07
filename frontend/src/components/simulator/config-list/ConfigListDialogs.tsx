import {AlertDialog} from "@base-ui/react/alert-dialog"

import {buttonVariants, Button} from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {Input} from "@/components/ui/input"
import {
    MAX_CONFIG_NAME_LENGTH,
    type ConfigListController,
} from "@/features/simulator/useConfigListController"

type ConfigListDialogsProps = {
    controller: ConfigListController // ダイアログの開閉状態と確定処理
}

// 構成一覧のダイアログ(固定枠の名前変更・追加構成の操作・固定枠のクリア確認)
// どのダイアログも開閉状態と確定処理を構成一覧の操作から受け取るため、まとまりのまま渡す。
export function ConfigListDialogs({controller}: ConfigListDialogsProps) {
    const {
        isOperating,
        nameDialog,
        isNameValid,
        changeName,
        submitName,
        closeNameDialog,
        confirmation,
        closeConfirmation,
        clearConfig,
        savedBuildDialog,
        savedBuildDialogContent,
        savedBuildDialogName,
        isSavedBuildNameDialog,
        isSavedBuildNameValid,
        changeSavedBuildName,
        submitSavedBuildDialog,
        closeSavedBuildDialog,
    } = controller

    return (
        <>
            {/* 固定枠の名前変更 */}
            <Dialog
                open={nameDialog !== null}
                onOpenChange={(open) => {
                    // 通信中は閉じさせず、保存結果を確認できるようにする。
                    if (!open && !isOperating) {
                        closeNameDialog()
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>構成名を変更</DialogTitle>
                        <DialogDescription>
                            構成の選択パーツは変更されません。
                        </DialogDescription>
                    </DialogHeader>

                    <label className="mt-5 block space-y-2 text-sm font-medium text-slate-800">
                        構成名
                        <Input
                            autoFocus
                            value={nameDialog?.name ?? ""}
                            maxLength={MAX_CONFIG_NAME_LENGTH}
                            aria-invalid={!isNameValid}
                            onChange={(event) => changeName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && isNameValid) {
                                    event.preventDefault()
                                    void submitName()
                                }
                            }}
                        />
                        <span className="block text-xs font-normal text-slate-500">
                            {nameDialog?.name.trim().length ?? 0} / {MAX_CONFIG_NAME_LENGTH}文字
                        </span>
                    </label>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isOperating}
                            onClick={closeNameDialog}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="button"
                            disabled={isOperating || !isNameValid}
                            onClick={() => void submitName()}
                        >
                            {isOperating ? "処理中…" : "変更する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 追加構成の追加・名前変更・削除・一括削除 */}
            <Dialog
                open={savedBuildDialog !== null}
                onOpenChange={(open) => {
                    if (!open && !isOperating) {
                        closeSavedBuildDialog()
                    }
                }}
            >
                {savedBuildDialogContent && (
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {savedBuildDialogContent.title}
                            </DialogTitle>
                            <DialogDescription>
                                {savedBuildDialogContent.description}
                            </DialogDescription>
                        </DialogHeader>

                        {isSavedBuildNameDialog && (
                            <label className="mt-5 block space-y-2 text-sm font-medium text-slate-800">
                                構成名
                                <Input
                                    autoFocus
                                    value={savedBuildDialogName}
                                    maxLength={MAX_CONFIG_NAME_LENGTH}
                                    aria-invalid={!isSavedBuildNameValid}
                                    onChange={(event) => changeSavedBuildName(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && isSavedBuildNameValid) {
                                            event.preventDefault()
                                            void submitSavedBuildDialog()
                                        }
                                    }}
                                />
                                <span className="block text-xs font-normal text-slate-500">
                                    {savedBuildDialogName.trim().length} / {MAX_CONFIG_NAME_LENGTH}文字
                                </span>
                            </label>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isOperating}
                                onClick={closeSavedBuildDialog}
                            >
                                キャンセル
                            </Button>
                            <Button
                                type="button"
                                variant={savedBuildDialogContent.destructive
                                    ? "destructive"
                                    : "default"}
                                disabled={
                                    isOperating ||
                                    (isSavedBuildNameDialog && !isSavedBuildNameValid)
                                }
                                onClick={() => void submitSavedBuildDialog()}
                            >
                                {isOperating
                                    ? "処理中…"
                                    : savedBuildDialogContent.confirmLabel}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            {/* 固定枠のクリア確認 */}
            <AlertDialog.Root
                open={confirmation !== null}
                onOpenChange={(open) => {
                    if (!open && !isOperating) {
                        closeConfirmation()
                    }
                }}
            >
                <AlertDialog.Portal>
                    <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"/>
                    <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 text-foreground shadow-xl transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                        <AlertDialog.Title className="text-base font-bold">
                            構成{confirmation?.slot.configId ?? ""}をクリアしますか？
                        </AlertDialog.Title>
                        <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                            保存済み・選択中のパーツが解除されます。
                        </AlertDialog.Description>

                        <div className="mt-5 flex justify-center gap-2">
                            <AlertDialog.Close
                                className={buttonVariants({
                                    variant: "destructive",
                                })}
                                disabled={isOperating}
                                onClick={() => {
                                    if (confirmation) {
                                        void clearConfig(confirmation.slot)
                                    }
                                }}
                            >
                                クリアする
                            </AlertDialog.Close>
                            <AlertDialog.Close
                                className={buttonVariants({
                                    variant: "outline",
                                })}
                                disabled={isOperating}
                            >
                                キャンセル
                            </AlertDialog.Close>
                        </div>
                    </AlertDialog.Popup>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </>
    )
}
