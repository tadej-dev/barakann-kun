import {Dialog as DialogPrimitive} from "@base-ui/react/dialog"
import {X} from "lucide-react"
import type * as React from "react"

import {cn} from "@/lib/utils"

// Portal・Backdrop・閉じるボタンを標準化し、各画面は内容と状態だけを指定する。
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

function DialogContent({
    className,
    children,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup>) {
    // Portalに描画するため、親のoverflowやz-indexに影響されず画面中央へ表示できる。
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-slate-950/55 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
            <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <DialogPrimitive.Popup
                    className={cn(
                        "relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl outline-none transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
                        className,
                    )}
                    {...props}
                >
                    {children}
                    <DialogPrimitive.Close
                        aria-label="ダイアログを閉じる"
                        className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                        <X className="size-4" />
                    </DialogPrimitive.Close>
                </DialogPrimitive.Popup>
            </DialogPrimitive.Viewport>
        </DialogPrimitive.Portal>
    )
}

function DialogHeader({className, ...props}: React.ComponentProps<"div">) {
    // 閉じるボタンと見出しが重ならないよう、右側に余白を確保する。
    return (
        <div
            className={cn("space-y-1.5 pr-10", className)}
            {...props}
        />
    )
}

function DialogTitle({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
    // Base UIのTitleを使い、aria-labelledbyでダイアログ名を関連付ける。
    return (
        <DialogPrimitive.Title
            className={cn("text-base font-semibold text-slate-950", className)}
            {...props}
        />
    )
}

function DialogDescription({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
    // 入力条件や削除範囲など、操作前に伝える補足を統一する。
    return (
        <DialogPrimitive.Description
            className={cn("text-sm leading-6 text-slate-600", className)}
            {...props}
        />
    )
}

function DialogFooter({className, ...props}: React.ComponentProps<"div">) {
    // 狭い画面ではボタンを縦積みにし、広い画面では右寄せに戻す。
    return (
        <div
            className={cn(
                "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
                className,
            )}
            {...props}
        />
    )
}

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
}
