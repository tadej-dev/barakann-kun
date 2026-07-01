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
        <section>
            <h2 className="mb-4 text-sm font-bold">
                構成選択
            </h2>

            <div className="space-y-3">
                {CONFIG_IDS.map((configId) => {
                    const isActive = configId === activeConfigId

                    return (
                        <button
                            key={configId}
                            type="button"
                            aria-selected={isActive}
                            className="group w-full rounded-lg border border-slate-700 bg-slate-800 p-4 text-left text-white hover:border-sky-500 hover:bg-sky-500 aria-selected:border-sky-500 aria-selected:bg-sky-500"
                            onClick={() => onConfigChange(configId)}
                        >
                            <p className="text-sm font-bold">
                                構成{configId}
                            </p>

                            <p className="mt-1 text-xs text-white/70 group-hover:text-white group-aria-selected:text-white">
                                保存済み構成
                            </p>
                        </button>
                    )
                })}
            </div>

            <button
                type="button"
                className="mt-4 w-full rounded-md border border-slate-700 px-3 py-2 text-sm font-bold text-slate-200 hover:border-red-400 hover:bg-red-500 hover:text-white"
                onClick={onClearActiveConfig}
            >
                この構成をクリア
            </button>
        </section>
    )
}