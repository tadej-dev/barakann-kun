import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"

import { cn } from "@/lib/utils"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

// Base UI Comboboxをshadcn(ReUI)のスタイルで薄くラップする。
// 候補（ハンドルのサイズなど）を一覧から1つ選ぶ用途に使う。
// 入力は不可とし、選択のみできるようにする。
const Combobox = ComboboxPrimitive.Root

function ComboboxInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      className="relative flex h-8 w-full items-center rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
    >
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        // 直接入力は受け付けず、一覧からの選択だけを行う。
        readOnly
        className={cn(
          "h-full min-w-0 flex-1 cursor-pointer truncate bg-transparent px-2 text-sm outline-none select-none placeholder:text-muted-foreground",
          className
        )}
        {...props}
      />
      <ComboboxPrimitive.Trigger
        data-slot="combobox-trigger"
        aria-label="開く"
        className="flex h-full w-6 shrink-0 items-center justify-center text-muted-foreground"
      >
        <ChevronDownIcon className="size-4" />
      </ComboboxPrimitive.Trigger>
    </ComboboxPrimitive.InputGroup>
  )
}

function ComboboxContent({
  className,
  emptyMessage = "該当なし",
  children,
  ...props
}: ComboboxPrimitive.Popup.Props & {
  emptyMessage?: string
}) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        sideOffset={4}
        align="start"
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "relative max-h-[min(var(--available-height),16rem)] w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {/* Emptyは常時マウントが必要なため、内容だけを差し替えて余白が出ないようにする。 */}
          <ComboboxPrimitive.Empty>
            <span className="block px-2 py-1.5 text-sm text-muted-foreground">
              {emptyMessage}
            </span>
          </ComboboxPrimitive.Empty>
          <ComboboxPrimitive.List>{children}</ComboboxPrimitive.List>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className
      )}
      {...props}
    >
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
      {children}
    </ComboboxPrimitive.Item>
  )
}

export { Combobox, ComboboxContent, ComboboxInput, ComboboxItem }
