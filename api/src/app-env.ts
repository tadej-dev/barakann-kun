import type {CatalogRepository} from "./db/catalog-repository"
import type {ConfigOrderRepository} from "./db/config-order-repository"
import type {ConfigSlotRepository} from "./db/config-slot-repository"
import type {AccountRepository} from "./db/account-repository"
import type {SavedBuildRepository} from "./db/saved-build-repository"
import type {Bindings} from "./types"

// Honoが扱うCloudflare BindingsとContext Variables
export type AppEnv = {
    // Cloudflareから渡されるD1や認証設定を型付きで参照する領域
    Bindings: Bindings
    Variables: {
        // 各リクエストのミドルウェアで登録するRepository
        // テストではD1実装を使わず差し替えられる
        accountRepository: AccountRepository
        catalogRepository: CatalogRepository
        configOrderRepository: ConfigOrderRepository
        configSlotRepository: ConfigSlotRepository
        savedBuildRepository: SavedBuildRepository
    }
}
