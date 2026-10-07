-- 認証情報とユーザーごとの構成保存に使用するテーブル。
PRAGMA foreign_keys = ON;

-- Googleなどの認証プロバイダーに依存しないアプリ内ユーザー。
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL
        CHECK (length(trim(display_name)) BETWEEN 1 AND 100),
    email TEXT NOT NULL UNIQUE,
    image_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- プロバイダーのユーザー識別子とアプリ内ユーザーの対応。
-- Googleのメールアドレスではなく、変更されないsubをprovider_account_idへ保存する。
CREATE TABLE auth_accounts (
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (provider, provider_account_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ブラウザへ発行するトークンのハッシュだけを保存するセッション。
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ユーザーがクラウドへ保存した自転車構成。
CREATE TABLE saved_builds (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL
        CHECK (length(trim(name)) BETWEEN 1 AND 100),
    version INTEGER NOT NULL DEFAULT 1
        CHECK (version > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 構成に含まれるスロットごとのパーツ。
-- priceとweightは保存時点の値を保持し、マスター更新で過去の構成が変わらないようにする。
CREATE TABLE saved_build_parts (
    saved_build_id TEXT NOT NULL,
    slot_key TEXT NOT NULL
        CHECK (length(trim(slot_key)) BETWEEN 1 AND 100),
    part_id INTEGER NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    weight INTEGER NOT NULL CHECK (weight >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (saved_build_id, slot_key),
    FOREIGN KEY (saved_build_id) REFERENCES saved_builds(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT
);

-- ユーザー・セッション・構成の検索に使用するインデックス。
CREATE INDEX idx_auth_accounts_user_id
    ON auth_accounts(user_id);

CREATE INDEX idx_sessions_user_id
    ON sessions(user_id);

CREATE INDEX idx_sessions_expires_at
    ON sessions(expires_at);

CREATE INDEX idx_saved_builds_user_id_updated_at
    ON saved_builds(user_id, updated_at DESC);

CREATE INDEX idx_saved_build_parts_part_id
    ON saved_build_parts(part_id);
