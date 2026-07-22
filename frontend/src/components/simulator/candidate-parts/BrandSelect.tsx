import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type BrandSelectProps = {
    brands: string[]
    selectedBrand: string
    onBrandChange: (brand: string) => void
}

const ALL_BRANDS = "all"

// ブランドメーカーの選択欄
export function BrandSelect({
                                brands,
                            selectedBrand,
                            onBrandChange,
                            }: BrandSelectProps) {
    const items = [
        {
            label: "メーカーを選択",
            value: null,
        },
        ...brands.map((brand) => ({
            label: brand,
            value: brand,
        })),
    ]

    return (
        <Select
            items={items}
            value={selectedBrand === ALL_BRANDS ? null : selectedBrand}
            onValueChange={(value) =>
                onBrandChange(value ?? ALL_BRANDS)
            }
        >
            <SelectTrigger
                aria-label="メーカーで絞り込み"
                className="w-full sm:max-w-xs"
            >
                <SelectValue/>
            </SelectTrigger>

            <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                    {items.map((item) => (
                        <SelectItem
                            key={item.value ?? ALL_BRANDS}
                            value={item.value}
                        >
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}
