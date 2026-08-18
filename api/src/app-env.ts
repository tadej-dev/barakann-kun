import type {CatalogRepository} from "./db/catalog-repository"
import type {ConfigOrderRepository} from "./db/config-order-repository"
import type {ConfigSlotRepository} from "./db/config-slot-repository"
import type {AccountRepository} from "./db/account-repository"
import type {SavedBuildRepository} from "./db/saved-build-repository"
import type {Bindings} from "./types"

// Honoが扱うCloudflare BindingsとContext Variables
export type AppEnv = {
    Bindings: Bindings
    Variables: {
        accountRepository: AccountRepository
        catalogRepository: CatalogRepository
        configOrderRepository: ConfigOrderRepository
        configSlotRepository: ConfigSlotRepository
        savedBuildRepository: SavedBuildRepository
    }
}
