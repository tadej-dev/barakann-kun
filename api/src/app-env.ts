import type {CatalogRepository} from "./db/catalog-repository"
import type {Bindings} from "./types"

// Honoが扱うCloudflare BindingsとContext Variables
export type AppEnv = {
    Bindings: Bindings
    Variables: {
        catalogRepository: CatalogRepository
    }
}
