-- ボトムブラケットの拡充: CeramicSpeed の実在製品を追加し、未登録のBB規格を登録する
-- 出典: CeramicSpeed 日本公式 (https://www.cog.inc/ceramicspeed/)
--   BB ALPHA BB30 ROAD / T47/68 ROAD / ROAD BEARING KIT BB90、T45 SHIMANO
-- 価格は税込、重量はメーカー公表値（T45は公表が無いため0）
PRAGMA foreign_keys = ON;

-- CeramicSpeed は未登録ブランドのため追加する
INSERT INTO brands (id, name, created_at, updated_at) VALUES (94, 'CeramicSpeed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 新規BB製品 (id 585-588)。すべてシマノ24mmクランク用
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES
    (74800, 109, 94, 9, CURRENT_TIMESTAMP, 585, '2026-09-15 00:00:00', CURRENT_TIMESTAMP, 'CeramicSpeed BB ALPHA BB30 ROAD', 'CeramicSpeed BB ALPHA BB30 ROAD (Shimano 24mm)', NULL, 'BB30(φ42mm・シェル幅68mm)用のボトムブラケット。重量はメーカー公表値です'),
    (74800, 115, 94, 9, CURRENT_TIMESTAMP, 586, '2026-09-15 00:00:00', CURRENT_TIMESTAMP, 'CeramicSpeed BB ALPHA T47/68 ROAD', 'CeramicSpeed BB ALPHA T47/68 ROAD (Shimano 24mm)', NULL, 'T47/68(シェル幅68mm)用のボトムブラケット。重量はメーカー公表値です'),
    (66990, 46, 94, 9, CURRENT_TIMESTAMP, 587, '2026-09-15 00:00:00', CURRENT_TIMESTAMP, 'CeramicSpeed BB ALPHA ROAD BEARING KIT BB90', 'CeramicSpeed BB ALPHA ROAD BEARING KIT BB90 (Shimano 24mm)', NULL, 'BB90(φ37mm・シェル幅90.5mm)用のベアリングキット。重量はメーカー公表値です'),
    (59950, 0, 94, 9, CURRENT_TIMESTAMP, 588, '2026-09-15 00:00:00', CURRENT_TIMESTAMP, 'CeramicSpeed T45 SHIMANO', 'CeramicSpeed T45 SHIMANO (24mm)', NULL, 'T45(ThreadFit 82.5・φ45mm)用のボトムブラケット。価格は標準仕様(COATEDは別価格)、重量は未公表です');

-- 各製品へBB規格とクランク軸規格を付与する
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES
    (585, 'bb_standard', 'bb30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (585, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (586, 'bb_standard', 't47_68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (586, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (587, 'bb_standard', 'bb90', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (587, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (588, 'bb_standard', 't45', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (588, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
