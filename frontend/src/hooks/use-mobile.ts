import {useSyncExternalStore} from "react"

// この幅未満をスマホ幅として扱い、SidebarをSheet（横から開くパネル）へ切り替える
const MOBILE_BREAKPOINT = 768
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// 画面幅の変化をReactへ通知する購読処理
function subscribe(onChange: () => void) {
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY)

    mql.addEventListener("change", onChange)

    return () => mql.removeEventListener("change", onChange)
}

// 現在の画面幅がスマホ幅かどうか
function getSnapshot() {
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches
}

// スマホ幅かどうかを返す
// useSyncExternalStoreで外部状態として読むことで、Effect内のsetStateを避け、初回描画から正しい値にする。
export function useIsMobile() {
    return useSyncExternalStore(subscribe, getSnapshot)
}
