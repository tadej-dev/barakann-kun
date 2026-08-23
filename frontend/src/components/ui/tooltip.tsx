import {Tooltip as TooltipPrimitive} from "@base-ui/react/tooltip"
import type * as React from "react"

import {cn} from "@/lib/utils"

// 各ツールチップで共通の表示遅延を利用できるようProviderまで内包する
function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
    return (
        <TooltipPrimitive.Provider delay={300}>
            <TooltipPrimitive.Root {...props} />
        </TooltipPrimitive.Provider>
    )
}

const TooltipTrigger = TooltipPrimitive.Trigger

function TooltipContent({
    className,
    sideOffset = 6,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Popup> & {
    sideOffset?: number
}) {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Positioner
                sideOffset={sideOffset}
                className="z-50"
            >
                <TooltipPrimitive.Popup
                    className={cn(
                        "max-w-xs rounded-md bg-slate-900 px-3 py-2 text-xs leading-relaxed text-white shadow-md transition-[opacity,transform] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
                        className,
                    )}
                    {...props}
                />
            </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
    )
}

export {Tooltip, TooltipContent, TooltipTrigger}
