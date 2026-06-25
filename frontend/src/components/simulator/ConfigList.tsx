import {Button} from "@/components/ui/button"
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
        <section className="space-y-3">
            <h2 className="text-sm font-semibold">
                構成
            </h2>

            <div className="grid grid-cols-2 gap-2">
                {CONFIG_IDS.map((configId) => {
                    // 構成の選択状態
                    const isActive = configId === activeConfigId

                    return (
                        <Button
                            key={configId}
                            type="button"
                            variant={isActive ? "default" : "outline"}
                            aria-pressed={isActive}
                            onClick={() => onConfigChange(configId)}
                        >
                            構成{configId}
                        </Button>
                    )
                })}
            </div>

            <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={onClearActiveConfig}
            >
                現在の構成をクリア
            </Button>
        </section>
    )
}