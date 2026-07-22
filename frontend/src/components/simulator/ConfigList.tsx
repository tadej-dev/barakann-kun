import {GripVertical} from "lucide-react"
import {AlertDialog} from "@base-ui/react/alert-dialog"

import {SortableItemHandle} from "@/components/reui/sortable"
import {buttonVariants} from "@/components/ui/button"
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    CONFIG_IDS,
    type ConfigId,
} from "@/features/simulator/simulatorTypes"

// 構成一覧のプロパティ
type ConfigListProps = {
    activeConfigId: ConfigId // 選択中の構成ID
    onConfigChange: (configId: ConfigId) => void // 構成変更処理
    onClearActiveConfig: () => void // 選択中構成の初期化処理
}

// 構成選択欄
export function ConfigList({
                               activeConfigId,
                           onConfigChange,
                           onClearActiveConfig,
                           }: ConfigListProps) {
    return (
        <Card className="h-full border border-b-0">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-zinc-500">
                    構成選択
                </CardTitle>

                <CardAction className="flex items-center gap-1">
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

                    <SortableItemHandle
                        render={
                            <button
                                type="button"
                                aria-label="構成選択カードを移動"
                            />
                        }
                        className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <GripVertical className="size-4"/>
                    </SortableItemHandle>
                </CardAction>
            </CardHeader>

            <CardContent>
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
            </CardContent>
        </Card>
    )
}
