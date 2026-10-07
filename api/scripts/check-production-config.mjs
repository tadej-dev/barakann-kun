import {readFileSync} from "node:fs"
import {fileURLToPath} from "node:url"

const configPath = fileURLToPath(new URL("../wrangler.jsonc", import.meta.url))
const configText = readFileSync(configPath, "utf8")
const databaseId = configText.match(
    /"database_id"\s*:\s*"([^"]+)"/,
)
    ?.[1]

if (
    !databaseId ||
    databaseId === "00000000-0000-0000-0000-000000000000"
) {
    console.error(
        "wrangler.jsoncのdatabase_idを本番D1のIDへ置き換えてください。",
    )
    process.exitCode = 1
}

if (process.exitCode === 1) {
    process.exit()
}

console.log("本番D1設定を確認しました。")
