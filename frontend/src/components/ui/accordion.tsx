import {Accordion as AccordionPrimitive} from "@base-ui/react/accordion"
import type * as React from "react"
import {ChevronDown} from "lucide-react"

import {cn} from "@/lib/utils"

// Base UI Accordionの構造と開閉アニメーションを共通化し、各画面は項目内容だけを指定する。
const Accordion = AccordionPrimitive.Root

function AccordionItem({
    className,
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
    // 項目単位の幅を揃え、カード内で余計な区切り線を追加しない。
    return (
        <AccordionPrimitive.Item
            data-slot="accordion-item"
            className={cn("w-full", className)}
            {...props}
        />
    )
}

function AccordionTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
    // Headerを内包し、呼び出し側がタイトルと開閉ボタンの関係を意識せず使えるようにする。
    return (
        <AccordionPrimitive.Header className="m-0 min-w-0">
            <AccordionPrimitive.Trigger
                data-slot="accordion-trigger"
                className={cn(
                    "group flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-lg bg-transparent px-0 py-0 text-left text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                    className,
                )}
                {...props}
            >
                {children}
                <ChevronDown
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-data-panel-open:rotate-180"
                />
            </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
    )
}

function AccordionContent({
    className,
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Panel>) {
    // パネルの実測高さをBase UIのCSS変数へ委ね、開閉時のレイアウト跳ねを抑える。
    return (
        <AccordionPrimitive.Panel
            data-slot="accordion-content"
            className={cn(
                "h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-150 ease-out data-ending-style:h-0 data-starting-style:h-0",
                className,
            )}
            {...props}
        />
    )
}

export {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
}
