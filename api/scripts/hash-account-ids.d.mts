// hash-account-ids.mjs の型定義
// アプリと同じハッシュ値になることを、テストから確かめるために使う。
export function hashProviderAccountId(
    secret: string,
    provider: string,
    providerAccountId: string,
): string
