import {useMemo} from "react"

import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import {diagnoseBuild} from "@/features/simulator/buildDiagnosis"
import {
    createPartSlot,
    getPartSlotCategoryKey,
    getPartSlotPosition,
    type PartSlot,
} from "@/features/simulator/partSlots"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Category} from "@/types/category"

type BuildDiagnosisPanelProps = {
    categories: Category[]
    selectedParts: SelectedParts
    onSlotChange: (slot: PartSlot) => void
}

const STATUS_CONTENT = {
    empty: {
        label: "診断待ち",
        badgeVariant: "secondary" as const,
    },
    incomplete: {
        label: "選択途中",
        badgeVariant: "secondary" as const,
    },
    needs_review: {
        label: "要確認",
        badgeVariant: "destructive" as const,
    },
    compatible: {
        label: "確認済み",
        badgeVariant: "secondary" as const,
    },
}

// 現在選択中のパーツを完成度と規格の両面から表示
export function BuildDiagnosisPanel({
    categories,
    selectedParts,
    onSlotChange,
}: BuildDiagnosisPanelProps) {
    const diagnosis = useMemo(
        () => diagnoseBuild(selectedParts, categories),
        [categories, selectedParts],
    )
    const status = STATUS_CONTENT[diagnosis.status]

    return (
        <Card className="h-full border border-b-0">
            <Accordion multiple={false} defaultValue={[]}>
                <AccordionItem value="build-diagnosis" className="border-0">
                    <CardHeader className="gap-0">
                        <AccordionTrigger
                            className="min-h-8 hover:no-underline"
                            aria-label="構成診断の詳細を開閉"
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                <div className="min-w-0">
                                    <CardTitle className="text-lg font-bold text-zinc-500">
                                        構成診断
                                    </CardTitle>
                                </div>
                                <Badge
                                    variant={status.badgeVariant}
                                    className="ml-auto mr-2"
                                >
                                    {status.label}
                                </Badge>
                            </div>
                        </AccordionTrigger>
                    </CardHeader>

                    <AccordionContent>
                        <CardContent className="space-y-3 pt-4">
                            <div className="flex flex-wrap gap-2 text-xs">
                                <Badge variant="outline">
                                    選択 {diagnosis.selectedCount}点
                                </Badge>
                                <Badge variant="outline">
                                    未選択 {diagnosis.missingCount}件
                                </Badge>
                                <Badge variant="outline">
                                    要確認 {diagnosis.unknownCount}件
                                </Badge>
                                <Badge variant="outline">
                                    不一致 {diagnosis.incompatibleCount}件
                                </Badge>
                            </div>

                            {diagnosis.issues.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    登録済み規格の範囲では問題を検出しませんでした
                                </p>
                            ) : (
                                <ul className="grid gap-2 md:grid-cols-2">
                                    {diagnosis.issues.map((issue) => {
                                        const slotKey = issue.slotKeys[0]

                                        return (
                                            <li key={issue.id}>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-auto w-full justify-start whitespace-normal px-3 py-2 text-left"
                                                    onClick={() => onSlotChange(
                                                        createPartSlot(
                                                            getPartSlotCategoryKey(slotKey),
                                                            getPartSlotPosition(slotKey),
                                                        ),
                                                    )}
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block text-sm font-medium">
                                                            {issue.title}
                                                        </span>
                                                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                                                            {issue.description}
                                                        </span>
                                                    </span>
                                                </Button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </CardContent>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    )
}
