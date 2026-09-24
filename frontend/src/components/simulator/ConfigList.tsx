import {
    Columns3,
    Ellipsis,
    Copy,
    GripVertical,
    Link,
    Pencil,
    Plus,
    Save,
    Trash2,
    Unlink,
} from "lucide-react"
import {AlertDialog} from "@base-ui/react/alert-dialog"
import {useEffect, useState, type ReactElement} from "react"

import {
    BuildComparisonDialog,
    type ComparisonBuild,
} from "@/components/simulator/BuildComparisonDialog"
import {
    Sortable,
    SortableItem,
    SortableItemHandle,
} from "@/components/reui/sortable"
import {buttonVariants, Button} from "@/components/ui/button"
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar"
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
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    MAX_SAVED_BUILDS,
    type SavedBuild,
} from "@/api/savedBuilds"
import type {ConfigSlot} from "@/api/configSlots"
import type {Category} from "@/types/category"
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

// 操作ボタンの共通クラス（閉じたレールではアイコンだけの正方形にする）
const actionButtonClassName =
    "h-8 w-full gap-1 px-2 text-xs group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
// 操作ボタンのラベル（閉じたレールでは隠してツールチップで補う）
const actionButtonLabelClassName = "group-data-[collapsible=icon]:hidden"

// 閉じたレールのときだけ、ラベルをツールチップとして表示する
// 開いているときやスマホ幅では、ボタン自体にラベルが見えているためそのまま返す。
function RailTooltip({
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

// 構成一覧のプロパティ
type ConfigListProps = {
    categories: Category[] // 比較画面のスロット表示名
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
    onActiveConfigNameChange?: (name: string) => void // 選択中構成名の通知（上部カード表示用）
}

// 構成選択欄
export function ConfigList({
                               categories,
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
                               onActiveConfigNameChange,
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
        isAuthLoading,
        isConfigListReady,
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
        setConfigSlotSharing,
        setSavedBuildSharing,
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

    // 選択中の構成名を求める。
    // 構成名はログイン時だけD1から取得するため、見つからない場合は固定枠の既定名へ戻す。
    const fallbackConfigName = `構成${activeConfigId}`
    const activeItem = isAuthenticated
        ? orderedItems.find((item) => {
            // 追加構成を選択中なら追加構成、そうでなければ固定枠を探す。
            if (activeSavedBuildId !== null) {
                return item.kind === "build" && item.build.id === activeSavedBuildId
            }

            return item.kind === "slot" && item.slot.configId === activeConfigId
        })
        : undefined
    const activeConfigName = activeItem
        ? activeItem.kind === "slot"
            ? activeItem.slot.name
            : activeItem.build.name
        : fallbackConfigName

    // 構成名の取得元はこのコンポーネントにあるため、変化したときだけ親へ通知する。
    useEffect(() => {
        onActiveConfigNameChange?.(activeConfigName)
    }, [activeConfigName, onActiveConfigNameChange])

    // 認証前は4つの固定枠だけを表示し、ログイン後はD1と同期する並び替え一覧へ切り替える。
    // 未ログイン時の既存レイアウト
    // 閉じたレールでも使えるよう、番号アイコンと名前を持つSidebarのメニューボタンで描画する。
    const compactConfigButtons = (
        <SidebarMenu className="gap-1">
            {CONFIG_IDS.map((configId) => {
                // ログイン前は固定スロットだけを選択対象にし、追加構成のUIを出さない。
                const isActive = configId === activeConfigId

                return (
                    <SidebarMenuItem key={configId}>
                        <SidebarMenuButton
                            isActive={isActive}
                            aria-selected={isActive}
                            tooltip={`構成${configId}`}
                            className="font-bold data-active:bg-sky-50 data-active:text-sky-950"
                            onClick={() => onConfigChange(configId)}
                        >
                            <span className="flex size-4 shrink-0 items-center justify-center text-xs">
                                {configId}
                            </span>
                            <span>
                                構成{configId}
                            </span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )
            })}
        </SidebarMenu>
    )
    const comparisonBuilds: ComparisonBuild[] = isAuthenticated
        ? orderedItems.map((item) => item.kind === "slot"
            ? {
                key: item.key,
                name: item.slot.name,
                parts: item.slot.parts,
            }
            : {
                key: item.key,
                name: item.build.name,
                parts: item.build.parts,
            })
        : CONFIG_IDS.map((configId) => ({
            key: `config:${configId}`,
            name: `構成${configId}`,
            parts: Object.entries(configStates[configId]).map(([
                slotKey,
                part,
            ]) => ({
                slotKey,
                partId: part.id,
                price: part.price,
                weight: part.weight,
            })),
        }))
    const [shareNotice, setShareNotice] = useState("")
    // クリア確認ダイアログの開閉状態（トリガーがツールチップ付きのメニューボタンのため制御する）
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)

    async function copyShareUrl(shareToken: string) {
        const shareUrl = `${window.location.origin}/shared/${shareToken}`

        try {
            await navigator.clipboard.writeText(shareUrl)
            setShareNotice("共有URLをコピーしました")
        } catch {
            // Clipboard APIを利用できない環境ではURLを画面に表示して手動コピーを可能にする
            setShareNotice(`共有URL: ${shareUrl}`)
        }
    }

    async function startSharing(build: SavedBuild) {
        try {
            const updated = await setSavedBuildSharing(build, true)

            if (updated.shareToken) {
                await copyShareUrl(updated.shareToken)
            }
        } catch {
            // APIエラーは構成一覧下部の共通エラーへ表示する
        }
    }

    async function startConfigSlotSharing(slot: ConfigSlot) {
        try {
            const updated = await setConfigSlotSharing(slot, true)

            if (updated.shareToken) {
                await copyShareUrl(updated.shareToken)
            }
        } catch {
            // APIエラーは構成一覧下部の共通エラーへ表示する
        }
    }

    async function stopConfigSlotSharing(slot: ConfigSlot) {
        try {
            await setConfigSlotSharing(slot, false)
            setShareNotice("共有を停止しました")
        } catch {
            // APIエラーは構成一覧下部の共通エラーへ表示する
        }
    }

    async function stopSharing(build: SavedBuild) {
        try {
            await setSavedBuildSharing(build, false)
            setShareNotice("共有を停止しました")
        } catch {
            // APIエラーは構成一覧下部の共通エラーへ表示する
        }
    }

    return (
        <Sidebar
            collapsible="icon"
            // 角丸で周囲に余白を取る表示にし、右側のパーツ表のカードと見た目をそろえる。
            variant="floating"
            // 標準のfixedだとフッターの上まで重なるため、stickyに変えてページ本体の範囲内に収める。
            // ヘッダー（h-16）の下に張り付き、フッターが見えたら本体と一緒に上へ流れる。
            // 余白は右側の本体（p-4）とそろえ、上下左を1rem・右を0にしてカードの上端と下端を合わせる。
            // 左右の合計は標準のp-2と同じ1remなので、閉じたレールの幅の計算はそのまま使える。
            className="sticky! top-16! bottom-auto! h-[calc(100svh-4rem)]! py-4! pl-4! pr-0!"
        >
                    <SidebarHeader>
                        {/* 見出しの横に開閉ボタンを置き、閉じたレールでもボタンだけは残して開けるようにする。 */}
                        {/* 見出しと保存枠数は、閉じたレールでは幅が足りないため隠す。 */}
                        <div className="flex min-h-8 items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                            <SidebarTrigger
                                aria-label="構成選択を開閉"
                                className="shrink-0"
                            />
                            <span className="text-sm font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                                構成選択
                            </span>
                            {/* 固定4枠も保存枠として数え、アカウント側の上限を画面上で共有する。 */}
                            {isAuthenticated && (
                                <Badge
                                    variant="secondary"
                                    className="group-data-[collapsible=icon]:hidden"
                                    aria-label="保存枠使用数"
                                    title="構成1〜4を含むアカウントの保存枠使用数"
                                >
                                    {isLoading || isSavedBuildsLoading
                                        ? `… / ${MAX_SAVED_BUILDS}`
                                        : `${totalSavedCount} / ${MAX_SAVED_BUILDS}`}
                                </Badge>
                            )}
                        </div>

                        {/* 操作ボタンは構成一覧と同じ幅で縦に並べ、閉じたレールではアイコンとツールチップにする。 */}
                        <div className="grid grid-cols-1 gap-2 px-2 group-data-[collapsible=icon]:px-0">
                            <BuildComparisonDialog
                                builds={comparisonBuilds}
                                categories={categories}
                                renderTrigger={({disabled, title, onOpen}) => (
                                    <RailTooltip label="比較">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className={actionButtonClassName}
                                            disabled={disabled}
                                            title={title}
                                            onClick={onOpen}
                                        >
                                            <Columns3 />
                                            <span className={actionButtonLabelClassName}>比較</span>
                                        </Button>
                                    </RailTooltip>
                                )}
                            />

                            {isAuthenticated && (
                                <>
                                    {/* 追加ボタンは保存枠の上限、削除ボタンは選択件数に応じて操作可否を決める。 */}
                                    <RailTooltip label="追加">
                                        <Button
                                            type="button"
                                            size="sm"
                                            className={actionButtonClassName}
                                            disabled={
                                                savedBuildsOperation !== null ||
                                                totalSavedCount >= MAX_SAVED_BUILDS
                                            }
                                            title="現在の選択パーツを新しい構成として保存"
                                            aria-label="新しい構成を追加"
                                            onClick={openCreateSavedBuildDialog}
                                        >
                                            <Plus />
                                            <span className={actionButtonLabelClassName}>追加</span>
                                        </Button>
                                    </RailTooltip>
                                    <RailTooltip label="一括削除">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            className={actionButtonClassName}
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
                                            <span className={actionButtonLabelClassName}>一括削除</span>
                                        </Button>
                                    </RailTooltip>
                                </>
                            )}

                            {!isAuthenticated && !isAuthLoading && (
                                // 未ログイン時は現在の固定枠だけを確認ダイアログ付きでクリアできる。
                                <RailTooltip label={`構成${activeConfigId}をクリア`}>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        className={actionButtonClassName}
                                        onClick={() => setIsClearDialogOpen(true)}
                                    >
                                        <Trash2 />
                                        <span className={actionButtonLabelClassName}>
                                            構成{activeConfigId}をクリア
                                        </span>
                                    </Button>
                                </RailTooltip>
                            )}
                        </div>

                        {!isAuthenticated && !isAuthLoading && (
                                <AlertDialog.Root
                                    open={isClearDialogOpen}
                                    onOpenChange={setIsClearDialogOpen}
                                >
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
                    </SidebarHeader>

                        <SidebarContent className="gap-3 px-2 pb-2">
                            {!isAuthenticated && !isAuthLoading && compactConfigButtons}

                            {/* 認証確認中と初回取得中は、既定順の一覧を出さずに枠だけを表示する。 */}
                            {(isAuthLoading || (isAuthenticated && !isConfigListReady)) && (
                                <ul
                                    className="grid grid-cols-1 gap-2 p-0"
                                    role="status"
                                    aria-label="構成を読み込んでいます"
                                >
                                    {CONFIG_IDS.map((configId) => (
                                        <li
                                            key={configId}
                                            className="h-16 animate-pulse rounded-lg border bg-slate-100 group-data-[collapsible=icon]:h-8"
                                        />
                                    ))}
                                </ul>
                            )}

                            {isAuthenticated && (
                                <>
                                    {/* ログイン後の一覧は固定枠と追加構成を同じSortableへ渡し、順序を一元管理する。 */}
                                    {/* 一覧表示後の再取得中であることを伝える。初回は枠の表示で代用する。 */}
                                    {isConfigListReady && (isLoading ||
                                        isLoadingConfigOrder ||
                                        isSavedBuildLoading) && (
                                        <p className="text-sm text-muted-foreground group-data-[collapsible=icon]:hidden" role="status">
                                            構成を読み込んでいます…
                                        </p>
                                    )}

                                    {isConfigListReady && (
                                    <div className="w-full overflow-hidden rounded-lg">
                            <Sortable
                                value={orderedItems}
                                onValueChange={changeConfigOrder}
                                getItemValue={(item) => item.key}
                                strategy="grid"
                                render={<ul className="grid grid-cols-1 gap-2 p-0" />}
                            >
                                {orderedItems.map((item, index) => {
                                    // 固定枠と追加構成では操作メニューの内容が異なるため、種別ごとに描画する。
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
                                                    onClick={() => onConfigChange(slot.configId)}
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

                                                    {/* 閉じたレールでは名前の代わりに並び順の番号を表示し、名前はツールチップで補う。 */}
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
                                                                        onClick={() => openNameDialog(slot)}
                                                                    >
                                                                        <Pencil />
                                                                        名前変更
                                                                    </DropdownMenuItem>
                                                                    {slot.shareToken ? (
                                                                        <>
                                                                            <DropdownMenuItem
                                                                                disabled={isOperating}
                                                                                onClick={() => void copyShareUrl(slot.shareToken!)}
                                                                            >
                                                                                <Copy />
                                                                                共有URLをコピー
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                disabled={isOperating}
                                                                                onClick={() => void stopConfigSlotSharing(slot)}
                                                                            >
                                                                                <Unlink />
                                                                                共有を停止
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    ) : (
                                                                        <DropdownMenuItem
                                                                            disabled={isOperating}
                                                                            onClick={() => void startConfigSlotSharing(slot)}
                                                                        >
                                                                            <Link />
                                                                            共有URLを作成
                                                                        </DropdownMenuItem>
                                                                    )}
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

                                    // 追加構成は固定枠とは異なり、保存・改名・削除・選択対象になる。
                                    const build = item.build
                                    const isActive = build.id === activeSavedBuildId

                                    return (
                                        <SortableItem
                                            key={item.key}
                                            value={item.key}
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
                                                    className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:hidden"
                                                    onClick={(event) => event.stopPropagation()}
                                                >
                                                <GripVertical
                                                    className="size-4 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                </SortableItemHandle>

                                                {/* 閉じたレールでは名前の代わりに並び順の番号を表示し、名前はツールチップで補う。 */}
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
                                                                {build.shareToken ? (
                                                                    <>
                                                                        <DropdownMenuItem
                                                                            onClick={() => void copyShareUrl(build.shareToken!)}
                                                                        >
                                                                            <Copy />
                                                                            共有URLをコピー
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onClick={() => void stopSharing(build)}
                                                                        >
                                                                            <Unlink />
                                                                            共有を停止
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                ) : (
                                                                    <DropdownMenuItem
                                                                        onClick={() => void startSharing(build)}
                                                                    >
                                                                        <Link />
                                                                        共有URLを作成
                                                                    </DropdownMenuItem>
                                                                )}
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
                                    )}

                                    {shareNotice && (
                                        <div
                                            className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 group-data-[collapsible=icon]:hidden bg-emerald-50 p-3 text-sm text-emerald-900"
                                            role="status"
                                        >
                                            <span className="min-w-0 break-all">
                                                {shareNotice}
                                            </span>
                                            <Button
                                                type="button"
                                                size="xs"
                                                variant="ghost"
                                                onClick={() => setShareNotice("")}
                                            >
                                                閉じる
                                            </Button>
                                        </div>
                                    )}

                                    {/* API失敗を一覧の外へ逃がさず、再読み込み可能な状態として表示する。 */}
                                    {(errorMessage ||
                                        savedBuildsErrorMessage ||
                                        savedBuildErrorMessage ||
                                        configOrderErrorMessage) && (
                                        <div
                                            className="flex items-start justify-between gap-3 rounded-lg border border-red-200 group-data-[collapsible=icon]:hidden bg-red-50 p-3 text-sm text-red-800"
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

                                    {/* 別端末の更新を上書きしないため、最新取得か現在端末の上書きを選ばせる。 */}
                                    {autoSaveConflict && (
                                        <div
                                            className="flex flex-col gap-3 rounded-lg border border-amber-300 group-data-[collapsible=icon]:hidden bg-amber-50 p-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
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
                        </SidebarContent>

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
            {/* 端をクリックしても開閉できる細い帯 */}
            <SidebarRail />
        </Sidebar>
    )
}
