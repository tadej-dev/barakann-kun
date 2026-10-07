import {
    Copy,
    Ellipsis,
    GripVertical,
    Link,
    Pencil,
    Trash2,
    Unlink,
} from "lucide-react"

import type {ConfigSlot} from "@/api/configSlots"
import type {ShareActions} from "@/components/simulator/config-list/useShareActions"
import {
    SortableItem,
    SortableItemHandle,
} from "@/components/reui/sortable"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

type ConfigSlotListItemProps = {
    itemKey: string // 並べ替えのキー
    slot: ConfigSlot // 表示する固定枠
    index: number // 並び順(閉じたレールで番号として表示)
    isActive: boolean // 選択中か
    isOperating: boolean // 通信中は操作メニューを止める
    share: ShareActions // 共有URLの作成・コピー・停止
    onSelect: () => void // 行の選択
    onRename: () => void // 名前変更ダイアログを開く
    onClear: () => void // クリア確認を開く
}

// 構成一覧の固定枠(構成1〜4)の1行
export function ConfigSlotListItem({
    itemKey,
    slot,
    index,
    isActive,
    isOperating,
    share,
    onSelect,
    onRename,
    onClear,
}: ConfigSlotListItemProps) {
    return (
        <SortableItem
            value={itemKey}
            render={
                <li
                    className={
                        "flex min-h-16 min-w-0 items-center gap-2 rounded-lg border border-sidebar-border p-0 transition-colors group-data-[collapsible=icon]:min-h-8 group-data-[collapsible=icon]:border-0 " +
                        (isActive
                            ? "bg-sky-50/80"
                            : "bg-white hover:bg-slate-50")
                    }
                />
            }
        >
            <div
                className="flex min-w-0 flex-1 items-center gap-2 self-stretch p-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                onClick={onSelect}
            >
                <SortableItemHandle
                    render={
                        <button
                            type="button"
                            aria-label={`${slot.name}を並び替え`}
                        />
                    }
                    className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:hidden"
                    onClick={(event) => event.stopPropagation()}
                >
                    <GripVertical
                        className="size-4 shrink-0"
                        aria-hidden="true"
                    />
                </SortableItemHandle>

                {/* 閉じたレールでの表示(番号＋ツールチップ) */}
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <button
                                type="button"
                                className="hidden size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold group-data-[collapsible=icon]:flex"
                                aria-label={`${slot.name}を選択`}
                                aria-selected={isActive}
                            />
                        }
                    >
                        {index + 1}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="[overflow-wrap:anywhere]">
                        {slot.name}
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger
                        render={
                            <button
                                type="button"
                                className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden"
                                aria-label={`${slot.name}を選択`}
                                aria-selected={isActive}
                            />
                        }
                    >
                        <span className="line-clamp-2 min-w-0 text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">
                            {slot.name}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent className="[overflow-wrap:anywhere]">
                        {slot.name}
                    </TooltipContent>
                </Tooltip>

                {/* 操作メニューのクリックで行が選択されないようにする */}
                <div
                    className="flex shrink-0 items-center gap-2 group-data-[collapsible=icon]:hidden"
                    onClick={(event) => event.stopPropagation()}
                >
                    <Badge
                        variant="outline"
                        className="border-sky-200 bg-sky-50 text-sky-700"
                    >
                        標準枠
                    </Badge>
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="-me-2 text-slate-500 hover:text-slate-900"
                                    aria-label={`${slot.name}の操作メニュー`}
                                />
                            }
                            disabled={isOperating}
                        >
                            <Ellipsis className="size-4" />
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                            align="start"
                            className="w-40"
                        >
                            <DropdownMenuGroup>
                                <DropdownMenuItem
                                    disabled={isOperating}
                                    onClick={onRename}
                                >
                                    <Pencil />
                                    名前変更
                                </DropdownMenuItem>
                                {slot.shareToken ? (
                                    <>
                                        <DropdownMenuItem
                                            disabled={isOperating}
                                            onClick={() => void share.copyShareUrl(slot.shareToken!)}
                                        >
                                            <Copy />
                                            共有URLをコピー
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            disabled={isOperating}
                                            onClick={() => void share.stopConfigSlotSharing(slot)}
                                        >
                                            <Unlink />
                                            共有を停止
                                        </DropdownMenuItem>
                                    </>
                                ) : (
                                    <DropdownMenuItem
                                        disabled={isOperating}
                                        onClick={() => void share.startConfigSlotSharing(slot)}
                                    >
                                        <Link />
                                        共有URLを作成
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    variant="destructive"
                                    disabled={isOperating}
                                    onClick={onClear}
                                >
                                    <Trash2 className="text-amber-600" />
                                    クリア
                                    <Badge
                                        variant="outline"
                                        className="ml-auto border-amber-200 bg-amber-50 text-amber-700"
                                    >
                                        標準枠
                                    </Badge>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </SortableItem>
    )
}
