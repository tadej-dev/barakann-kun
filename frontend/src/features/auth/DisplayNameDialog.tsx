import {useState} from "react"

import {Button} from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {Input} from "@/components/ui/input"

// 表示名の上限(サーバーのusers.display_nameの制約と同じ)
export const MAX_DISPLAY_NAME_LENGTH = 100

type DisplayNameDialogProps = {
    open: boolean
    currentName: string // 入力欄の初期値
    onSubmit: (displayName: string) => Promise<void> // 保存処理。失敗時はエラーを投げる
    onDismiss: () => void
}

// 表示名の文字数(絵文字なども1文字として数える。サーバーと同じ数え方)
function countCharacters(value: string): number {
    return Array.from(value.trim()).length
}

// 表示名の変更ダイアログ
// 開くたびに入力内容を初期化するため、呼び出し側で開くごとにkeyを変える。
export function DisplayNameDialog({
    open,
    currentName,
    onSubmit,
    onDismiss,
}: DisplayNameDialogProps) {
    const [name, setName] = useState(currentName)
    const [isSaving, setIsSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const length = countCharacters(name)
    const isValid = length >= 1 && length <= MAX_DISPLAY_NAME_LENGTH

    // 保存に成功したら閉じ、失敗したらダイアログに理由を表示したまま残す
    async function handleSubmit() {
        if (!isValid || isSaving) {
            return
        }

        setIsSaving(true)
        setErrorMessage(null)

        try {
            await onSubmit(name.trim())
            onDismiss()
        } catch (error) {
            setErrorMessage(
                error instanceof Error && error.message
                    ? error.message
                    : "表示名の変更に失敗しました",
            )
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                // 通信中は閉じさせず、保存結果を確認できるようにする。
                if (!nextOpen && !isSaving) {
                    onDismiss()
                }
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>表示名を変更</DialogTitle>
                    <DialogDescription>
                        画面右上に表示される名前です。本名は入れないでください。
                    </DialogDescription>
                </DialogHeader>

                <label className="mt-5 block space-y-2 text-sm font-medium text-slate-800">
                    表示名
                    <Input
                        autoFocus
                        value={name}
                        maxLength={MAX_DISPLAY_NAME_LENGTH}
                        aria-invalid={!isValid}
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && isValid) {
                                event.preventDefault()
                                void handleSubmit()
                            }
                        }}
                    />
                    <span className="block text-xs font-normal text-slate-500">
                        {length} / {MAX_DISPLAY_NAME_LENGTH}文字
                    </span>
                </label>

                {errorMessage && (
                    <p className="text-sm text-red-700" role="alert">
                        {errorMessage}
                    </p>
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isSaving}
                        onClick={onDismiss}
                    >
                        キャンセル
                    </Button>
                    <Button
                        type="button"
                        disabled={isSaving || !isValid}
                        onClick={() => void handleSubmit()}
                    >
                        {isSaving ? "保存中…" : "変更する"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
