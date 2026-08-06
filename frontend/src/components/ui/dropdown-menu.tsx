import {Menu as MenuPrimitive} from "@base-ui/react/menu"
import type * as React from "react"

import {cn} from "@/lib/utils"

const DropdownMenu = MenuPrimitive.Root

function DropdownMenuTrigger({
    className,
    ...props
}: React.ComponentProps<typeof MenuPrimitive.Trigger>) {
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
    ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup>) {
    return (
        <MenuPrimitive.Portal>
            <MenuPrimitive.Positioner
                side="bottom"
                align="end"
                sideOffset={8}
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
    ...props
}: React.ComponentProps<typeof MenuPrimitive.Item>) {
    return (
        <MenuPrimitive.Item
            data-slot="dropdown-menu-item"
            className={cn(
                "flex w-full cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
                className,
            )}
            {...props}
        />
    )
}

export {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
}
