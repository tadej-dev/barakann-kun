// ドラッグの移動軸を1方向に固定する
export function lockDragAxis(
    transform: {x: number; y: number; scaleX: number; scaleY: number},
    isWide: boolean,
) {
    // 3列表示では横、1列表示では縦にだけ動かす
    return isWide
        ? {...transform, y: 0}
        : {...transform, x: 0}
}
