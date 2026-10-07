PRAGMA foreign_keys = ON;

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL
);

CREATE TABLE brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    brand_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    model_name TEXT,
    variant_name TEXT,
    price INTEGER NOT NULL CHECK (price >= 0),
    price_updated_at TEXT,
    weight INTEGER NOT NULL CHECK (weight >= 0),
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (brand_id) REFERENCES brands(id)
);

CREATE TABLE part_specifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,
    spec_key TEXT NOT NULL,
    spec_value TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
    UNIQUE (part_id, spec_key)
);

CREATE TABLE part_included_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    included_category_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
    FOREIGN KEY (included_category_id) REFERENCES categories(id)
);

CREATE TABLE part_blocked_categories (
    part_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (part_id, category_id),
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX idx_parts_category_id ON parts(category_id);
CREATE INDEX idx_parts_brand_id ON parts(brand_id);
CREATE INDEX idx_part_specifications_part_id ON part_specifications(part_id);
CREATE INDEX idx_part_included_items_part_id ON part_included_items(part_id);
CREATE INDEX idx_part_blocked_categories_category_id
    ON part_blocked_categories(category_id);
