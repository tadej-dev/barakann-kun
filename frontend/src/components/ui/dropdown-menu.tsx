import {Menu as MenuPrimitive} from "@base-ui/react/menu"
import type * as React from "react"

import {cn} from "@/lib/utils"

// メニューの位置計算とPortalを共通化し、操作項目だけを呼び出し側で組み立てる。
const DropdownMenu = MenuPrimitive.Root

function DropdownMenuTrigger({
    className,
    ...props
}: React.ComponentProps<typeof MenuPrimitive.Trigger>) {
    // メニューを開くトリガーは、呼び出し側のボタン形状をそのまま受け取る。
    return (
        <MenuPrimitive.Trigger
            data-slot="dropdown-menu-trigger"
            className={className}
            {...props}
        />
    )
}

function DropdownMenuContent({
    className,
    align = "end",
    side = "bottom",
    sideOffset = 8,
    ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup> & {
    align?: React.ComponentProps<typeof MenuPrimitive.Positioner>["align"]
    side?: React.ComponentProps<typeof MenuPrimitive.Positioner>["side"]
    sideOffset?: React.ComponentProps<typeof MenuPrimitive.Positioner>["sideOffset"]
}) {
    // Positionerへ配置条件を渡し、メニュー本体をPortalで最前面に描画する。
    return (
        <MenuPrimitive.Portal>
            <MenuPrimitive.Positioner
                side={side}
                align={align}
                sideOffset={sideOffset}
                className="z-50"
            >
                <MenuPrimitive.Popup
                    data-slot="dropdown-menu-content"
                    className={cn(
                        "min-w-56 origin-(--transform-origin) overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                        className,
                    )}
                    {...props}
                />
            </MenuPrimitive.Positioner>
        </MenuPrimitive.Portal>
    )
}

function DropdownMenuItem({
    className,
    variant = "default",
    ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & {
    variant?: "default" | "destructive"
}) {
    // destructive項目だけ警告色を追加し、無効項目はBase UIの状態属性で抑制する。
    return (
        <MenuPrimitive.Item
            data-slot="dropdown-menu-item"
            className={cn(
                "flex w-full cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
                variant === "destructive" &&
                    "text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive",
                className,
            )}
            {...props}
        />
    )
}

function DropdownMenuGroup({
    className,
    ...props
}: React.ComponentProps<typeof MenuPrimitive.Group>) {
    // 関連するメニュー項目をグループ化し、呼び出し側の構造を明確にする。
    return (
        <MenuPrimitive.Group
            data-slot="dropdown-menu-group"
            className={className}
            {...props}
        />
    )
}

function DropdownMenuSeparator({
    className,
    ...props
}: React.ComponentProps<typeof MenuPrimitive.Separator>) {
    // 設定系と破壊的操作の境界を視覚的に示す。
    return (
        <MenuPrimitive.Separator
            data-slot="dropdown-menu-separator"
            className={cn("my-1 h-px bg-border", className)}
            {...props}
        />
    )
}

export {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
}
