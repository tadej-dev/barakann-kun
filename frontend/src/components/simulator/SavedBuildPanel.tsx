import {
    Cloud,
    Ellipsis,
    FileDown,
    Pencil,
    RefreshCw,
    Save,
    Trash2,
} from "lucide-react"
import {useMemo, useState} from "react"

import {
    MAX_SAVED_BUILDS,
    type SavedBuild,
} from "@/api/savedBuilds"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {
    Card,
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
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {Input} from "@/components/ui/input"
import {useAuth} from "@/features/auth/useAuth"
import {toSavedBuildPartInputs} from "@/features/saved-builds/savedBuildMapper"
import {useSavedBuilds} from "@/features/saved-builds/useSavedBuilds"
import type {ConfigId, SelectedParts} from "@/features/simulator/simulatorTypes"

type SavedBuildPanelProps = {
    activeConfigId: ConfigId
    selectedParts: SelectedParts
    reloadKey?: number
    onRestore: (build: SavedBuild) => Promise<void>
}

type DialogState =
    | {type: "create"; name: string}
    | {type: "rename"; build: SavedBuild; name: string}
    | {type: "restore"; build: SavedBuild}
    | {type: "update"; build: SavedBuild}
    | {type: "delete"; build: SavedBuild}

const DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
})

// APIのISO日時を利用者のローカル日時へ変換
function formatUpdatedAt(value: string): string {
    const date = new Date(value)

    return Number.isNaN(date.getTime())
        ? "更新日時不明"
        : DATE_FORMATTER.format(date)
}

// 名前付き保存構成の一覧と操作をまとめた管理パネル
export function SavedBuildPanel({
    activeConfigId,
    selectedParts,
    reloadKey = 0,
    onRestore,
}: SavedBuildPanelProps) {
    const {status: authStatus} = useAuth()
    const isAuthenticated = authStatus === "authenticated"
    const {
        builds,
        create,
        errorMessage,
        isLoading,
        operation,
        reload,
        remove,
        rename,
        update,
    } = useSavedBuilds({enabled: isAuthenticated, reloadKey})
    const [dialogState, setDialogState] = useState<DialogState | null>(null)
    const [restoreError, setRestoreError] = useState("")
    const selectedPartInputs = useMemo(
        () => toSavedBuildPartInputs(selectedParts),
        [selectedParts],
    )
    const hasSelectedParts = selectedPartInputs.length > 0
    const isOperating = operation !== null
    const isNameDialog = dialogState?.type === "create" ||
        dialogState?.type === "rename"
    const dialogName = isNameDialog ? dialogState.name : ""
    const isValidName = dialogName.trim().length > 0 &&
        dialogName.trim().length <= 100

    function startRestore(build: SavedBuild) {
        if (hasSelectedParts) {
            setDialogState({type: "restore", build})

            return
        }

        void restore(build)
    }

    async function restore(build: SavedBuild) {
        setRestoreError("")

        try {
            await onRestore(build)
            setDialogState(null)
        } catch (error) {
            setRestoreError(
                error instanceof Error
                    ? error.message
                    : "保存構成の復元に失敗しました",
            )
        }
    }

    async function submitDialog() {
        if (!dialogState || isOperating) {
            return
        }

        try {
            if (dialogState.type === "create") {
                await create(dialogState.name.trim(), selectedPartInputs)
            } else if (dialogState.type === "rename") {
                await rename(dialogState.build, dialogState.name.trim())
            } else if (dialogState.type === "restore") {
                await restore(dialogState.build)

                return
            } else if (dialogState.type === "update") {
                await update(dialogState.build, selectedPartInputs)
            } else {
                await remove(dialogState.build)
            }

            setDialogState(null)
        } catch {
            // APIエラーは一覧上部へ集約して表示する
        }
    }

    function changeDialogName(name: string) {
        setDialogState((current) => {
            if (!current || (current.type !== "create" && current.type !== "rename")) {
                return current
            }

            return {...current, name}
        })
    }

    const dialogContent = (() => {
        if (!dialogState) {
            return null
        }

        if (dialogState.type === "create") {
            return {
                title: "現在の構成を保存",
                description: `構成${activeConfigId}の選択内容を、名前付き構成としてアカウントへ保存します。`,
                confirmLabel: "保存する",
                destructive: false,
            }
        }

        if (dialogState.type === "rename") {
            return {
                title: "構成名を変更",
                description: "保存済みのパーツ内容は変更されません。",
                confirmLabel: "変更する",
                destructive: false,
            }
        }

        if (dialogState.type === "restore") {
            return {
                title: "保存構成を復元",
                description: `構成${activeConfigId}の現在の選択内容を「${dialogState.build.name}」で置き換えます。`,
                confirmLabel: "復元する",
                destructive: false,
            }
        }

        if (dialogState.type === "update") {
            return {
                title: "保存構成を上書き",
                description: `「${dialogState.build.name}」を構成${activeConfigId}の現在の選択内容で更新します。`,
                confirmLabel: "上書きする",
                destructive: false,
            }
        }

        return {
            title: "保存構成を削除",
            description: `「${dialogState.build.name}」を削除します。この操作は元に戻せません。`,
            confirmLabel: "削除する",
            destructive: true,
        }
    })()

    // 認証確認中・未ログイン・認証エラー時は保存構成の領域自体を表示しない
    if (!isAuthenticated) {
        return null
    }

    return (
        <Card className="mt-4 border-slate-200 bg-white shadow-none ring-slate-200">
            <CardHeader className="border-b border-slate-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <CardTitle className="flex flex-wrap items-center gap-2 text-slate-900">
                            <Cloud className="size-4 text-sky-700" />
                            保存した構成
                            <Badge variant="secondary" className="font-normal">
                                {builds.length} / {MAX_SAVED_BUILDS}
                            </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                            名前を付けて保存し、構成1〜4の作業枠へいつでも復元できます。
                        </CardDescription>
                    </div>

                    <Button
                        type="button"
                        className="w-full sm:w-auto"
                        disabled={
                            !hasSelectedParts ||
                            builds.length >= MAX_SAVED_BUILDS ||
                            isOperating
                        }
                        onClick={() => setDialogState({
                            type: "create",
                            name: `構成${activeConfigId}`,
                        })}
                    >
                        <Save />
                        現在の構成を保存
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="py-1">
                {isLoading && (
                    <p className="py-5 text-sm text-slate-600" role="status">
                        保存構成を読み込んでいます…
                    </p>
                )}

                {!isLoading && builds.length === 0 && (
                    <div className="my-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                        <Save className="mx-auto size-5 text-slate-400" />
                        <p className="mt-2 font-medium text-slate-900">
                            保存した構成はまだありません
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                            パーツを選び、「現在の構成を保存」から追加できます。
                        </p>
                    </div>
                )}

                {builds.length > 0 && (
                    <ul className="divide-y divide-slate-100">
                        {builds.map((build) => (
                            <li
                                key={build.id}
                                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-slate-900">
                                        {build.name}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                        <span>{build.parts.length}パーツ</span>
                                        <span>更新 {formatUpdatedAt(build.updatedAt)}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={isOperating}
                                        onClick={() => startRestore(build)}
                                    >
                                        <FileDown />
                                        復元
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            className="inline-flex size-7 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                                            aria-label={`${build.name}の操作メニュー`}
                                            disabled={isOperating}
                                        >
                                            <Ellipsis className="size-4" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="min-w-44">
                                            <DropdownMenuItem
                                                onClick={() => setDialogState({
                                                    type: "rename",
                                                    build,
                                                    name: build.name,
                                                })}
                                            >
                                                <Pencil />
                                                名前を変更
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                disabled={!hasSelectedParts}
                                                onClick={() => setDialogState({
                                                    type: "update",
                                                    build,
                                                })}
                                            >
                                                <RefreshCw />
                                                現在の構成で上書き
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
                                                onClick={() => setDialogState({
                                                    type: "delete",
                                                    build,
                                                })}
                                            >
                                                <Trash2 />
                                                削除
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {(errorMessage || restoreError) && (
                    <div
                        className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                        role="alert"
                    >
                        <span>{restoreError || errorMessage}</span>
                        {errorMessage && (
                            <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={() => void reload()}
                            >
                                再読み込み
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>

            <Dialog
                open={dialogState !== null}
                onOpenChange={(open) => {
                    if (!open && !isOperating) {
                        setDialogState(null)
                    }
                }}
            >
                {dialogContent && (
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{dialogContent.title}</DialogTitle>
                            <DialogDescription>
                                {dialogContent.description}
                            </DialogDescription>
                        </DialogHeader>

                        {isNameDialog && (
                            <label className="mt-5 block space-y-2 text-sm font-medium text-slate-800">
                                構成名
                                <Input
                                    autoFocus
                                    value={dialogName}
                                    maxLength={100}
                                    aria-invalid={!isValidName}
                                    onChange={(event) => changeDialogName(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && isValidName) {
                                            event.preventDefault()
                                            void submitDialog()
                                        }
                                    }}
                                />
                                <span className="block text-xs font-normal text-slate-500">
                                    {dialogName.trim().length} / 100文字
                                </span>
                            </label>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isOperating}
                                onClick={() => setDialogState(null)}
                            >
                                キャンセル
                            </Button>
                            <Button
                                type="button"
                                variant={dialogContent.destructive
                                    ? "destructive"
                                    : "default"}
                                disabled={
                                    isOperating ||
                                    (isNameDialog && !isValidName)
                                }
                                onClick={() => void submitDialog()}
                            >
                                {isOperating
                                    ? "処理中…"
                                    : dialogContent.confirmLabel}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>
        </Card>
    )
}
