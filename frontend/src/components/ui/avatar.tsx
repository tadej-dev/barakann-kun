import {Avatar as AvatarPrimitive} from "@base-ui/react/avatar"

import {cn} from "@/lib/utils"

// Base UIのアバター部品を共通サイズ・画像切り抜きでラップする。
function Avatar({className, ...props}: AvatarPrimitive.Root.Props) {
    // Rootで画像とFallbackを同じ円形領域に収める。
    return (
        <AvatarPrimitive.Root
            data-slot="avatar"
            className={cn(
                "relative flex size-8 shrink-0 overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground",
                className,
            )}
            {...props}
        />
    )
}

function AvatarImage({className, ...props}: AvatarPrimitive.Image.Props) {
    // 画像は正方形・coverで切り抜き、レイアウトを崩さずに表示する。
    return (
        <AvatarPrimitive.Image
            data-slot="avatar-image"
            className={cn("aspect-square size-full object-cover", className)}
            {...props}
        />
    )
}

function AvatarFallback({className, ...props}: AvatarPrimitive.Fallback.Props) {
    // 画像が未設定・読み込み失敗のときは、親で生成した頭文字を表示する。
    return (
        <AvatarPrimitive.Fallback
            data-slot="avatar-fallback"
            className={cn(
                "flex size-full items-center justify-center bg-sky-100 text-sky-800",
                className,
            )}
            {...props}
        />
    )
}

export {Avatar, AvatarImage, AvatarFallback}
