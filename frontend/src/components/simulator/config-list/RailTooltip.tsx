import type {ReactElement} from "react"

import {useSidebar} from "@/components/ui/sidebar"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

// 操作ボタンの共通クラス（閉じたレールではアイコンだけの正方形にする）
export const actionButtonClassName =
    "h-8 w-full gap-1 px-2 text-xs group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
// 操作ボタンのラベル（閉じたレールでは隠してツールチップで補う）
export const actionButtonLabelClassName = "group-data-[collapsible=icon]:hidden"

// 閉じたレールのときだけ、ラベルをツールチップとして表示する
// 開いているときやスマホ幅では、ボタン自体にラベルが見えているためそのまま返す。
export function RailTooltip({
    label,
    children,
}: {
    label: string
    children: ReactElement
}) {
    const {isMobile, state} = useSidebar()

    if (state !== "collapsed" || isMobile) {
        return children
    }

    return (
        <Tooltip>
            <TooltipTrigger render={children}/>
            <TooltipContent side="right">
                {label}
            </TooltipContent>
        </Tooltip>
    )
}
