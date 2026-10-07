import {readFileSync} from "node:fs"
import {fileURLToPath} from "node:url"

const devVarsPath = fileURLToPath(new URL("../.dev.vars", import.meta.url))
const expectedAuthUrl = "http://localhost:5173"
const requiredKeys = [
    "AUTH_SECRET",
    "AUTH_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
]
const placeholderValues = new Set([
    "",
    "replace-with-a-random-secret",
    "replace-with-google-client-id",
    "replace-with-google-client-secret",
])

// .dev.varsはKEY=VALUE形式なので、値だけを読み取り秘密情報を出力しない。
function readDevVars() {
    let source

    try {
        source = readFileSync(devVarsPath, "utf8")
    } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
            throw new Error("api/.dev.varsがありません。api/.dev.vars.exampleをコピーして作成してください。")
        }

        throw error
    }

    const values = new Map()

    for (const rawLine of source.split(/\r?\n/u)) {
        const line = rawLine.trim()

        if (!line || line.startsWith("#")) {
            continue
        }

        const separatorIndex = line.indexOf("=")

        if (separatorIndex <= 0) {
            continue
        }

        const key = line.slice(0, separatorIndex).trim()
        let value = line.slice(separatorIndex + 1).trim()

        if (
            value.length >= 2 &&
            ((value.startsWith("\"") && value.endsWith("\"")) ||
                (value.startsWith("'") && value.endsWith("'")))
        ) {
            value = value.slice(1, -1)
        }

        values.set(key, value)
    }

    return values
}

function validate(values) {
    const errors = []

    for (const key of requiredKeys) {
        const value = values.get(key)

        if (!value || placeholderValues.has(value)) {
            errors.push(`${key}が未設定です。`)
        }
    }

    const authSecret = values.get("AUTH_SECRET") ?? ""

    if (authSecret && !placeholderValues.has(authSecret) && authSecret.length < 32) {
        errors.push("AUTH_SECRETは32文字以上にしてください。")
    }

    const authUrl = values.get("AUTH_URL")

    if (authUrl && authUrl !== expectedAuthUrl) {
        errors.push(`AUTH_URLはローカル確認時に${expectedAuthUrl}へ設定してください。`)
    }

    return errors
}

try {
    const values = readDevVars()
    const errors = validate(values)

    if (errors.length > 0) {
        console.error("ローカルGoogle認証の設定に問題があります。")

        for (const error of errors) {
            console.error(`- ${error}`)
        }

        process.exitCode = 1
    } else {
        console.log("ローカルGoogle認証の設定を確認しました。")
        console.log(`- 認証URL: ${expectedAuthUrl}`)
        console.log(`- コールバックURL: ${expectedAuthUrl}/api/auth/callback/google`)
        console.log("- 認証情報の値は表示していません。")
    }
} catch (error) {
    console.error(error instanceof Error ? error.message : "ローカル認証設定を確認できませんでした。")
    process.exitCode = 1
}
