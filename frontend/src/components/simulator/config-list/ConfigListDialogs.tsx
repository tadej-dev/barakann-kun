import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {
    MAX_CONFIG_NAME_LENGTH,
    type ConfigListController,
} from "@/features/simulator/useConfigListController"

type ConfigListDialogsProps = {
    controller: ConfigListController
}

// 構成一覧のダイアログ(追加・名前変更・クリア・削除)
export function ConfigListDialogs({controller}: ConfigListDialogsProps) {
    const {
        closeDialog,
        dialog,
        dialogContent,
        dialogName,
        changeDialogName,
        isNameValid,
        isOperating,
        submitDialog,
    } = controller

    return (
        <Dialog
            open={dialog !== null}
            onOpenChange={(open) => {
                // 保存中でなければ閉じる操作を受け付ける
                if (!open && !isOperating) {
                    closeDialog()
                }
            }}
        >
            {dialogContent && (
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialogContent.title}</DialogTitle>
                        <DialogDescription>
                            {dialogContent.description}
                        </DialogDescription>
                    </DialogHeader>

                    {dialogContent.needsName && (
                        <label className="mt-5 block space-y-2 text-sm font-medium text-slate-800">
                            構成名
                            <Input
                                autoFocus
                                value={dialogName}
                                maxLength={MAX_CONFIG_NAME_LENGTH}
                                aria-invalid={!isNameValid}
                                onChange={(event) =>
                                    changeDialogName(event.target.value)}
                                onKeyDown={(event) => {
                                    // 構成名が有効な状態でEnterキーが押されたとき
                                    if (event.key === "Enter" && isNameValid) {
                                        event.preventDefault()
                                        void submitDialog()
                                    }
                                }}
                            />
                            <span className="block text-xs font-normal text-slate-500">
                                {dialogName.trim().length} / {MAX_CONFIG_NAME_LENGTH}文字
                            </span>
                        </label>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isOperating}
                            onClick={closeDialog}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="button"
                            variant={dialogContent.destructive
                                ? "destructive"
                                : "default"}
                            disabled={isOperating ||
                                (dialogContent.needsName && !isNameValid)}
                            onClick={() => void submitDialog()}
                        >
                            {dialogContent.confirmLabel}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            )}
        </Dialog>
    )
}
