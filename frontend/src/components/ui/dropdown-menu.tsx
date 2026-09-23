import {Menu as MenuPrimitive} from "@base-ui/react/menu"
import {Check, ChevronRight} from "lucide-react"
import type * as React from "react"

import {cn} from "@/lib/utils"

// メニューの位置計算とPortalを共通化し、操作項目だけを呼び出し側で組み立てる。
const DropdownMenu = MenuPrimitive.Root

// 通常項目とチェック/ラジオ項目で共通の見た目を1か所に集約する。
const menuItemClassName =
    "flex w-full cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"

// 親メニューとサブメニューで共通のポップアップ表面スタイル。
const menuContentClassName =
    "min-w-56 origin-(--transform-origin) overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"

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
                    className={cn(menuContentClassName, className)}
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
                menuItemClassName,
                variant === "destructive" &&
                    "text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive",
                className,
            )}
            {...props}
        />
    )
}

function DropdownMenuSub({
    ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuRoot>) {
    // サブメニューの状態はSubmenuRootが持ち、表示要素は持たない。
    return <MenuPrimitive.SubmenuRoot {...props} />
}

function DropdownMenuSubTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuTrigger>) {
    // 親項目と同じ見た目にし、サブメニューが開くことを右端の矢印で示す。
    return (
        <MenuPrimitive.SubmenuTrigger
            data-slot="dropdown-menu-sub-trigger"
            className={cn(menuItemClassName, className)}
            {...props}
        >
            {children}
            <ChevronRight className="ml-auto size-4" aria-hidden="true"/>
        </MenuPrimitive.SubmenuTrigger>
    )
}

function DropdownMenuSubContent({
    className,
    sideOffset = 8,
    ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup> & {
    sideOffset?: React.ComponentProps<typeof MenuPrimitive.Positioner>["sideOffset"]
}) {
    // サブメニューも独立したPortalへ描画し、親と同じ表面スタイルを適用する。
    return (
        <MenuPrimitive.Portal>
            <MenuPrimitive.Positioner sideOffset={sideOffset} className="z-50">
                <MenuPrimitive.Popup
                    data-slot="dropdown-menu-sub-content"
                    className={cn(menuContentClassName, className)}
                    {...props}
                />
            </MenuPrimitive.Positioner>
        </MenuPrimitive.Portal>
    )
}

function DropdownMenuCheckboxItem({
    className,
    children,
    ...props
}: React.ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
    // 左端に通常のチェックボックスと同じ見た目（枠付きの四角）を常時表示し、
    // checked状態では塗りつぶしとチェック印を出して選択中を明確にする。
    return (
        <MenuPrimitive.CheckboxItem
            data-slot="dropdown-menu-checkbox-item"
            className={cn(menuItemClassName, "group/checkbox-item", className)}
            {...props}
        >
            <span
                className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors group-data-[checked]/checkbox-item:border-sky-500 group-data-[checked]/checkbox-item:bg-sky-500 group-data-[checked]/checkbox-item:text-white"
            >
                <MenuPrimitive.CheckboxItemIndicator>
                    <Check className="size-3.5"/>
                </MenuPrimitive.CheckboxItemIndicator>
            </span>
            {children}
        </MenuPrimitive.CheckboxItem>
    )
}

function DropdownMenuRadioGroup({
    ...props
}: React.ComponentProps<typeof MenuPrimitive.RadioGroup>) {
    // ラジオ項目をまとめるグループ。値の保持は親側で制御する。
    return (
        <MenuPrimitive.RadioGroup
            data-slot="dropdown-menu-radio-group"
            {...props}
        />
    )
}

function DropdownMenuRadioItem({
    className,
    children,
    ...props
}: React.ComponentProps<typeof MenuPrimitive.RadioItem>) {
    // 単一選択の項目は、チェック項目と同じ印レイアウトでラジオ選択を示す。
    return (
        <MenuPrimitive.RadioItem
            data-slot="dropdown-menu-radio-item"
            className={cn(menuItemClassName, className)}
            {...props}
        >
            {/* 未選択でも幅を確保し、ラベルの位置を揃える。 */}
            <span className="flex size-4 shrink-0 items-center justify-center">
                <MenuPrimitive.RadioItemIndicator>
                    <Check className="size-4"/>
                </MenuPrimitive.RadioItemIndicator>
            </span>
            {children}
        </MenuPrimitive.RadioItem>
    )
}

function DropdownMenuGroupLabel({
    className,
    ...props
}: React.ComponentProps<typeof MenuPrimitive.GroupLabel>) {
    // グループ見出しは操作対象ではないため、淡い文字色で項目と区別する。
    return (
        <MenuPrimitive.GroupLabel
            data-slot="dropdown-menu-group-label"
            className={cn(
                "px-2.5 py-1.5 text-xs font-semibold text-muted-foreground",
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
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuGroupLabel,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
}
