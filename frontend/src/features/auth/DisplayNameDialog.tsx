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

// 表示名変更ダイアログが受け取るプロパティ
type DisplayNameDialogProps = {
    open: boolean // ダイアログを開いているか
    currentName: string // 入力欄の初期値
    onSubmit: (displayName: string) => Promise<void> // 保存処理。失敗時はエラーを投げる
    onDismiss: () => void // 入力を取り消して閉じる処理
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
    const [name, setName] = useState(currentName) // 入力中の表示名
    const [isSaving, setIsSaving] = useState(false) // 保存処理の実行中フラグ
    const [errorMessage, setErrorMessage] = useState<string | null>(null) // 保存に失敗した理由
    const length = countCharacters(name) // 入力中の表示名の文字数
    const isValid = length >= 1 && length <= MAX_DISPLAY_NAME_LENGTH // 1〜100文字の範囲に収まっているか

    // 保存に成功したら閉じ、失敗したらダイアログに理由を表示したまま残す
    async function handleSubmit() {
        // 入力不正または保存中は二重送信しない
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
                            // Enterキーで入力が有効なときだけ保存を実行
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
