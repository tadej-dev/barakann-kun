type SimulatorNoticesProps = {
    restoreError: string // 復元のエラーメッセージ
    restoreWarning: string // 復元した構成に残る非互換の警告
}

// 復元結果の通知
// エラーだけ再読み込みを案内し、非互換の警告は保持した構成の確認を促す
export function SimulatorNotices({
    restoreError,
    restoreWarning,
}: SimulatorNoticesProps) {
    return (
        <>
            {restoreError && (
                <p className="mt-3 text-sm font-medium text-destructive">
                    {restoreError}。ページを再読み込みしてください。
                </p>
            )}

            {restoreWarning && (
                <p className="mt-3 text-sm font-medium text-amber-800">
                    {restoreWarning}
                </p>
            )}
        </>
    )
}
