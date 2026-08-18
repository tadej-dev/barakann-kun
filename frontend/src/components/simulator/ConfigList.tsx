import {
    Ellipsis,
    GripVertical,
    Pencil,
    Plus,
    Save,
    Trash2,
} from "lucide-react"
import {AlertDialog} from "@base-ui/react/alert-dialog"

import {
    Sortable,
    SortableItem,
    SortableItemHandle,
} from "@/components/reui/sortable"
import {buttonVariants, Button} from "@/components/ui/button"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {Input} from "@/components/ui/input"
import {Checkbox} from "@/components/ui/checkbox"
import {Badge} from "@/components/ui/badge"
import {
    MAX_SAVED_BUILDS,
    type SavedBuild,
} from "@/api/savedBuilds"
import type {ConfigSlot} from "@/api/configSlots"
import {
    CONFIG_IDS,
    type ConfigId,
    type ConfigStates,
    type SelectedParts,
} from "@/features/simulator/simulatorTypes"
import {
    MAX_CONFIG_NAME_LENGTH,
    useConfigListController,
} from "@/features/simulator/useConfigListController"

// 構成一覧のプロパティ
type ConfigListProps = {
    activeConfigId: ConfigId // 選択中の構成ID
    activeSavedBuildId: string | null // 選択中の追加構成ID
    configStates: ConfigStates // 構成1〜4の選択パーツ
    selectedParts: SelectedParts // 現在選択中の構成のパーツ
    isSavedBuildLoading: boolean // 追加構成の読み込み状態
    savedBuildErrorMessage: string // 追加構成の読み込みエラー
    savedBuildsReloadKey?: number // 保存済み構成件数の再取得キー
    autoSaveEnabled?: boolean // 初期復元・移行完了後の自動保存許可
    onConfigChange: (configId: ConfigId) => void // 構成変更処理
    onRestoreSavedBuild: (build: SavedBuild) => Promise<void> // 最新の保存構成を復元
    onSavedBuildPrefetch: (build: SavedBuild) => void // 構成カードの先読み処理
    onSavedBuildSelect: (build: SavedBuild) => void | Promise<void> // 追加構成の選択処理
    onClearActiveConfig: () => void // 未ログイン時の選択中構成初期化
    onClearConfig: (configId: ConfigId) => Promise<void> // 構成初期化処理
    onRestoreConfigSlot: (slot: ConfigSlot) => Promise<void> // 最新の固定構成を復元
}

// 構成選択欄
export function ConfigList({
                               activeConfigId,
                               activeSavedBuildId,
                               configStates,
                               selectedParts,
                               isSavedBuildLoading,
                               savedBuildErrorMessage,
                               savedBuildsReloadKey = 0,
                               autoSaveEnabled = true,
                               onConfigChange,
                               onRestoreSavedBuild,
                               onSavedBuildPrefetch,
                               onSavedBuildSelect,
                               onClearActiveConfig,
                               onClearConfig,
                               onRestoreConfigSlot,
                           }: ConfigListProps) {
    const {
        changeConfigOrder,
        changeName,
        changeSavedBuildName,
        clearConfig,
        autoSaveConflict,
        configOrderErrorMessage,
        confirmation,
        errorMessage,
        isAuthenticated,
        isLoading,
        isLoadingConfigOrder,
        isNameValid,
        isOperating,
        isSavedBuildNameDialog,
        isSavedBuildNameValid,
        isSavedBuildsLoading,
        nameDialog,
        openCreateSavedBuildDialog,
        openDeleteSelectedBuildsDialog,
        openNameDialog,
        orderedItems,
        reloadConfigOrder,
        reloadSavedBuilds,
        saveToSavedBuild,
        savedBuildDialog,
        savedBuildDialogContent,
        savedBuildDialogName,
        savedBuildsErrorMessage,
        savedBuildsOperation,
        selectedSavedBuildIds,
        selectedSavedBuilds,
        setConfirmation,
        setNameDialog,
        setSavedBuildDialog,
        submitName,
        submitSavedBuildDialog,
        toggleSavedBuildSelection,
        totalSavedCount,
        resolveAutoSaveConflict,
    } = useConfigListController({
        activeConfigId,
        activeSavedBuildId,
        configStates,
        selectedParts,
        isSavedBuildLoading,
        savedBuildsReloadKey,
        autoSaveEnabled,
        onConfigChange,
        onRestoreSavedBuild,
        onClearConfig,
        onRestoreConfigSlot,
    })

    // 未ログイン時の既存レイアウト
    const compactConfigButtons = (
        <div className="grid grid-cols-2 gap-2">
            {CONFIG_IDS.map((configId) => {
                const isActive = configId === activeConfigId

                return (
                    <button
                        key={configId}
                        type="button"
                        aria-selected={isActive}
                        className="flex h-9 w-full items-center rounded-lg border bg-background px-3 text-left text-sm font-bold text-foreground transition-colors hover:bg-muted aria-selected:border-sky-500 aria-selected:bg-sky-50 aria-selected:text-sky-950"
                        onClick={() => onConfigChange(configId)}
                    >
                        構成{configId}
                    </button>
                )
            })}
        </div>
    )
    return (
        <Card className="h-full border border-b-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-zinc-500">
                    構成選択
                    {isAuthenticated && (
                        <Badge
                            variant="secondary"
                            aria-label="保存枠使用数"
                            title="構成1〜4を含むアカウントの保存枠使用数"
                        >
                            {isLoading || isSavedBuildsLoading
                                ? `… / ${MAX_SAVED_BUILDS}`
                                : `${totalSavedCount} / ${MAX_SAVED_BUILDS}`}
                        </Badge>
                    )}
                </CardTitle>

                <CardAction className="flex items-center gap-1 self-center">
                    {isAuthenticated && (
                        <>
                            <Button
                                type="button"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs"
                                disabled={
                                    savedBuildsOperation !== null ||
                                    totalSavedCount >= MAX_SAVED_BUILDS
                                }
                                title="現在の選択パーツを新しい構成として保存"
                                aria-label="新しい構成を追加"
                                onClick={openCreateSavedBuildDialog}
                            >
                                <Plus />
                                追加
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="h-7 gap-1 px-2 text-xs"
                                disabled={
                                    isOperating || selectedSavedBuilds.length === 0
                                }
                                title={
                                    selectedSavedBuilds.length > 0
                                        ? `選択した${selectedSavedBuilds.length}件の追加構成を削除`
                                        : "削除する追加構成を選択してください"
                                }
                                aria-label={`選択した追加構成を一括削除（${selectedSavedBuilds.length}件）`}
                                onClick={openDeleteSelectedBuildsDialog}
                            >
                                <Trash2 />
                                一括削除
                            </Button>
                        </>
                    )}
                    {!isAuthenticated && (
                        <AlertDialog.Root>
                            <AlertDialog.Trigger
                                className={buttonVariants({
                                    variant: "destructive",
                                    size: "sm",
                                })}
                            >
                                構成{activeConfigId}をクリア
                            </AlertDialog.Trigger>

                            <AlertDialog.Portal>
                                <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"/>
                                <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 text-foreground shadow-xl transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                                    <AlertDialog.Title className="text-base font-bold">
                                        構成{activeConfigId}をクリアしますか？
                                    </AlertDialog.Title>
                                    <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                                        選択中のパーツがすべて解除されます。
                                        <br/>
                                        この操作は元に戻せません。
                                    </AlertDialog.Description>

                                    <div className="mt-5 flex justify-center gap-2">
                                        <AlertDialog.Close
                                            className={buttonVariants({
                                                variant: "destructive",
                                            })}
                                            onClick={onClearActiveConfig}
                                        >
                                            クリアする
                                        </AlertDialog.Close>
                                        <AlertDialog.Close
                                            className={buttonVariants({
                                                variant: "outline",
                                            })}
                                        >
                                            キャンセル
                                        </AlertDialog.Close>
                                    </div>
                                </AlertDialog.Popup>
                            </AlertDialog.Portal>
                        </AlertDialog.Root>
                    )}

                </CardAction>
            </CardHeader>

            <CardContent className="space-y-3">
                {!isAuthenticated && compactConfigButtons}

                {isAuthenticated && (
                    <>
                        <CardDescription>
                            構成名と選択パーツをアカウントへ保存できます。
                        </CardDescription>

                        {(isLoading ||
                            isLoadingConfigOrder ||
                            isSavedBuildLoading) && (
                            <p className="text-sm text-muted-foreground" role="status">
                                構成を読み込んでいます…
                            </p>
                        )}

                        <div className="w-full overflow-hidden rounded-lg">
                            <Sortable
                                value={orderedItems}
                                onValueChange={changeConfigOrder}
                                getItemValue={(item) => item.key}
                                strategy="grid"
                                render={<ul className="grid grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />}
                            >
                                {orderedItems.map((item) => {
                                    if (item.kind === "slot") {
                                        const slot = item.slot
                                        const isActive = activeSavedBuildId === null &&
                                            slot.configId === activeConfigId

                                        return (
                                            <SortableItem
                                                key={item.key}
                                                value={item.key}
                                                render={
                                                    <li
                                                        className={
                                                            "flex min-h-16 min-w-0 items-center gap-2 rounded-lg border p-0 transition-colors " +
                                                            (isActive
                                                                ? "bg-sky-50/80"
                                                                : "bg-white hover:bg-slate-50")
                                                        }
                                                    />
                                                }
                                            >
                                                <div
                                                    className="flex min-w-0 flex-1 items-center gap-2 self-stretch p-3"
                                                    onClick={() => onConfigChange(slot.configId)}
                                                >
                                                    <SortableItemHandle
                                                        render={
                                                            <button
                                                                type="button"
                                                                aria-label={`${slot.name}を並び替え`}
                                                            />
                                                        }
                                                        className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        onClick={(event) => event.stopPropagation()}
                                                    >
                                                    <GripVertical
                                                        className="size-4 shrink-0 text-slate-400"
                                                        aria-hidden="true"
                                                    />
                                                    </SortableItemHandle>

                                                    <button
                                                        type="button"
                                                        className="min-w-0 flex-1 text-left"
                                                        aria-label={`${slot.name}を選択`}
                                                        aria-selected={isActive}
                                                    >
                                                        <span className="block min-w-0 whitespace-normal break-words text-sm font-semibold text-slate-900">
                                                            {slot.name}
                                                        </span>
                                                    </button>

                                                    <div
                                                        className="flex shrink-0 items-center gap-2"
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
                                                                        onClick={() => openNameDialog(slot)}
                                                                    >
                                                                        <Pencil />
                                                                        名前変更
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        variant="destructive"
                                                                        disabled={isOperating}
                                                                        onClick={() => setConfirmation({
                                                                            type: "clear",
                                                                            slot,
                                                                        })}
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

                                    const build = item.build
                                    const isActive = build.id === activeSavedBuildId

                                    return (
                                        <SortableItem
                                            key={item.key}
                                            value={item.key}
                                                render={
                                                    <li
                                                        className={
                                                            "flex min-h-16 min-w-0 items-center gap-2 rounded-lg border p-0 transition-colors " +
                                                            (isActive
                                                                ? "bg-sky-50/80"
                                                                : "bg-white hover:bg-slate-50")
                                                        }
                                                    />
                                                }
                                        >
                                            <div
                                                className="flex min-w-0 flex-1 items-center gap-2 self-stretch p-3"
                                                onMouseEnter={() => onSavedBuildPrefetch(build)}
                                                onFocusCapture={() => onSavedBuildPrefetch(build)}
                                                onClick={() => void onSavedBuildSelect(build)}
                                            >
                                                <SortableItemHandle
                                                    render={
                                                        <button
                                                            type="button"
                                                            aria-label={`${build.name}を並び替え`}
                                                        />
                                                    }
                                                    className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    onClick={(event) => event.stopPropagation()}
                                                >
                                                <GripVertical
                                                    className="size-4 shrink-0 text-slate-400"
                                                    aria-hidden="true"
                                                />
                                                </SortableItemHandle>

                                                <button
                                                    type="button"
                                                    className="min-w-0 flex-1 text-left"
                                                    aria-label={`${build.name}を選択`}
                                                    aria-selected={isActive}
                                                    disabled={isOperating}
                                                >
                                                    <span className="block min-w-0 whitespace-normal break-words text-sm font-semibold text-slate-900">
                                                        {build.name}
                                                    </span>
                                                </button>

                                                <div
                                                    className="flex shrink-0 items-center gap-2"
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
                                                                    onClick={() => void saveToSavedBuild(build)}
                                                                >
                                                                    <Save />
                                                                    現在の選択を保存
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => setSavedBuildDialog({
                                                                        type: "rename",
                                                                        build,
                                                                        name: build.name,
                                                                    })}
                                                                >
                                                                    <Pencil />
                                                                    名前変更
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    variant="destructive"
                                                                    onClick={() => setSavedBuildDialog({
                                                                        type: "delete",
                                                                        build,
                                                                    })}
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
                                                            checked={selectedSavedBuildIds.includes(build.id)}
                                                            disabled={isOperating}
                                                            className="ms-1 me-1"
                                                            aria-label={`${build.name}を削除対象に選択`}
                                                            onClick={(event) => event.stopPropagation()}
                                                            onCheckedChange={(checked) =>
                                                                toggleSavedBuildSelection(build.id, checked)}
                                                        />
                                                    </div>
                                            </div>
                                        </SortableItem>
                                    )
                                })}
                            </Sortable>
                        </div>

                        {(errorMessage ||
                            savedBuildsErrorMessage ||
                            savedBuildErrorMessage ||
                            configOrderErrorMessage) && (
                            <div
                                className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                                role="alert"
                            >
                                <span>
                                    {errorMessage ||
                                        savedBuildsErrorMessage ||
                                        savedBuildErrorMessage ||
                                        configOrderErrorMessage}
                                </span>
                                {(savedBuildsErrorMessage || configOrderErrorMessage) && (
                                    <Button
                                        type="button"
                                        size="xs"
                                        variant="outline"
                                        onClick={() => {
                                            if (savedBuildsErrorMessage) {
                                                void reloadSavedBuilds()
                                            }

                                            if (configOrderErrorMessage) {
                                                void reloadConfigOrder()
                                            }
                                        }}
                                    >
                                        再読み込み
                                    </Button>
                                )}
                            </div>
                        )}

                        {autoSaveConflict && (
                            <div
                                className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
                                role="alert"
                            >
                                <span>
                                    別の端末で構成が更新されています。保存方法を選択してください。
                                </span>
                                <div className="flex shrink-0 gap-2">
                                    <Button
                                        type="button"
                                        size="xs"
                                        variant="outline"
                                        onClick={() => void resolveAutoSaveConflict("reload")}
                                    >
                                        最新を読み込む
                                    </Button>
                                    <Button
                                        type="button"
                                        size="xs"
                                        variant="destructive"
                                        onClick={() => void resolveAutoSaveConflict("overwrite")}
                                    >
                                        この端末で上書き
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>

            <Dialog
                open={nameDialog !== null}
                onOpenChange={(open) => {
                    if (!open && !isOperating) {
                        setNameDialog(null)
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>構成名を変更</DialogTitle>
                        <DialogDescription>
                            構成の選択パーツは変更されません。
                        </DialogDescription>
                    </DialogHeader>

                    <label className="mt-5 block space-y-2 text-sm font-medium text-slate-800">
                        構成名
                        <Input
                            autoFocus
                            value={nameDialog?.name ?? ""}
                            maxLength={MAX_CONFIG_NAME_LENGTH}
                            aria-invalid={!isNameValid}
                            onChange={(event) => changeName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && isNameValid) {
                                    event.preventDefault()
                                    void submitName()
                                }
                            }}
                        />
                        <span className="block text-xs font-normal text-slate-500">
                            {nameDialog?.name.trim().length ?? 0} / {MAX_CONFIG_NAME_LENGTH}文字
                        </span>
                    </label>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isOperating}
                            onClick={() => setNameDialog(null)}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="button"
                            disabled={isOperating || !isNameValid}
                            onClick={() => void submitName()}
                        >
                            {isOperating ? "処理中…" : "変更する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={savedBuildDialog !== null}
                onOpenChange={(open) => {
                    if (!open && !isOperating) {
                        setSavedBuildDialog(null)
                    }
                }}
            >
                {savedBuildDialogContent && (
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {savedBuildDialogContent.title}
                            </DialogTitle>
                            <DialogDescription>
                                {savedBuildDialogContent.description}
                            </DialogDescription>
                        </DialogHeader>

                        {isSavedBuildNameDialog && (
                            <label className="mt-5 block space-y-2 text-sm font-medium text-slate-800">
                                構成名
                                <Input
                                    autoFocus
                                    value={savedBuildDialogName}
                                    maxLength={MAX_CONFIG_NAME_LENGTH}
                                    aria-invalid={!isSavedBuildNameValid}
                                    onChange={(event) => changeSavedBuildName(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && isSavedBuildNameValid) {
                                            event.preventDefault()
                                            void submitSavedBuildDialog()
                                        }
                                    }}
                                />
                                <span className="block text-xs font-normal text-slate-500">
                                    {savedBuildDialogName.trim().length} / {MAX_CONFIG_NAME_LENGTH}文字
                                </span>
                            </label>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isOperating}
                                onClick={() => setSavedBuildDialog(null)}
                            >
                                キャンセル
                            </Button>
                            <Button
                                type="button"
                                variant={savedBuildDialogContent.destructive
                                    ? "destructive"
                                    : "default"}
                                disabled={
                                    isOperating ||
                                    (isSavedBuildNameDialog && !isSavedBuildNameValid)
                                }
                                onClick={() => void submitSavedBuildDialog()}
                            >
                                {isOperating
                                    ? "処理中…"
                                    : savedBuildDialogContent.confirmLabel}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            <AlertDialog.Root
                open={confirmation !== null}
                onOpenChange={(open) => {
                    if (!open && !isOperating) {
                        setConfirmation(null)
                    }
                }}
            >
                <AlertDialog.Portal>
                    <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"/>
                    <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 text-foreground shadow-xl transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                        <AlertDialog.Title className="text-base font-bold">
                            構成{confirmation?.slot.configId ?? ""}をクリアしますか？
                        </AlertDialog.Title>
                        <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                            保存済み・選択中のパーツが解除されます。
                        </AlertDialog.Description>

                        <div className="mt-5 flex justify-center gap-2">
                            <AlertDialog.Close
                                className={buttonVariants({
                                    variant: "destructive",
                                })}
                                disabled={isOperating}
                                onClick={() => {
                                    if (confirmation) {
                                        void clearConfig(confirmation.slot)
                                    }
                                }}
                            >
                                クリアする
                            </AlertDialog.Close>
                            <AlertDialog.Close
                                className={buttonVariants({
                                    variant: "outline",
                                })}
                                disabled={isOperating}
                            >
                                キャンセル
                            </AlertDialog.Close>
                        </div>
                    </AlertDialog.Popup>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </Card>
    )
}
