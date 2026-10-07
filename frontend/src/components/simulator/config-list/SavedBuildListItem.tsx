import {
    Copy,
    Ellipsis,
    GripVertical,
    Link,
    Pencil,
    Save,
    Trash2,
    Unlink,
} from "lucide-react"

import type {SavedBuild} from "@/api/savedBuilds"
import type {ShareActions} from "@/components/simulator/config-list/useShareActions"
import {
    SortableItem,
    SortableItemHandle,
} from "@/components/reui/sortable"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {Checkbox} from "@/components/ui/checkbox"
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

type SavedBuildListItemProps = {
    itemKey: string // 並べ替えのキー
    build: SavedBuild // 表示する追加構成
    index: number // 並び順(閉じたレールで番号として表示)
    isActive: boolean // 選択中か
    isOperating: boolean // 通信中は選択・保存を止める
    isChecked: boolean // 一括削除の対象として選ばれているか
    share: ShareActions // 共有URLの作成・コピー・停止
    onSelect: () => void // 行の選択
    onPrefetch: () => void // ホバー・フォーカス時の先読み
    onSave: () => void // 現在の選択を保存
    onRename: () => void // 名前変更ダイアログを開く
    onDelete: () => void // 削除確認を開く
    onCheckedChange: (checked: boolean | "indeterminate") => void // 一括削除の選択
}

// 構成一覧の追加構成の1行
// 固定枠と違い、保存・名前変更・削除・一括削除の選択ができる。
export function SavedBuildListItem({
    itemKey,
    build,
    index,
    isActive,
    isOperating,
    isChecked,
    share,
    onSelect,
    onPrefetch,
    onSave,
    onRename,
    onDelete,
    onCheckedChange,
}: SavedBuildListItemProps) {
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
                onMouseEnter={onPrefetch}
                onFocusCapture={onPrefetch}
                onClick={onSelect}
            >
                <SortableItemHandle
                    render={
                        <button
                            type="button"
                            aria-label={`${build.name}を並び替え`}
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
                                aria-label={`${build.name}を選択`}
                                aria-selected={isActive}
                                disabled={isOperating}
                            />
                        }
                    >
                        {index + 1}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="[overflow-wrap:anywhere]">
                        {build.name}
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger
                        render={
                            <button
                                type="button"
                                className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden"
                                aria-label={`${build.name}を選択`}
                                aria-selected={isActive}
                                disabled={isOperating}
                            />
                        }
                    >
                        <span className="line-clamp-2 min-w-0 text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">
                            {build.name}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent className="[overflow-wrap:anywhere]">
                        {build.name}
                    </TooltipContent>
                </Tooltip>

                {/* 操作メニューや選択のクリックで行が選択されないようにする */}
                <div
                    className="flex shrink-0 items-center gap-2 group-data-[collapsible=icon]:hidden"
                    onClick={(event) => event.stopPropagation()}
                >
                    <Badge
                        variant="outline"
                        className="border-violet-200 bg-violet-50 text-violet-700"
                    >
                        追加
                    </Badge>
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-slate-500 hover:text-slate-900"
                                    aria-label={`${build.name}の操作メニュー`}
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
                                    onClick={onSave}
                                >
                                    <Save />
                                    現在の選択を保存
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onRename}>
                                    <Pencil />
                                    名前変更
                                </DropdownMenuItem>
                                {build.shareToken ? (
                                    <>
                                        <DropdownMenuItem
                                            onClick={() => void share.copyShareUrl(build.shareToken!)}
                                        >
                                            <Copy />
                                            共有URLをコピー
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => void share.stopSavedBuildSharing(build)}
                                        >
                                            <Unlink />
                                            共有を停止
                                        </DropdownMenuItem>
                                    </>
                                ) : (
                                    <DropdownMenuItem
                                        onClick={() => void share.startSavedBuildSharing(build)}
                                    >
                                        <Link />
                                        共有URLを作成
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    variant="destructive"
                                    onClick={onDelete}
                                >
                                    <Trash2 />
                                    削除
                                    <Badge
                                        variant="outline"
                                        className="ml-auto border-red-200 bg-red-50 text-red-700"
                                    >
                                        追加
                                    </Badge>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Checkbox
                        checked={isChecked}
                        disabled={isOperating}
                        className="ms-1 me-1"
                        aria-label={`${build.name}を削除対象に選択`}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={onCheckedChange}
                    />
                </div>
            </div>
        </SortableItem>
    )
}
