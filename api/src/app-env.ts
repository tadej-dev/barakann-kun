import type {CatalogRepository} from "./db/catalog-repository"
import type {Bindings} from "./types"

export type AppEnv = {
    Bindings: Bindings
    Variables: {
        catalogRepository: CatalogRepository
    }
}
