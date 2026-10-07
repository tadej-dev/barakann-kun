-- BBの重量0を補完する(単一値の更新・バリアント分割・重量非公表分の削除)
-- 理由:
--   既存BBのweightが0(未登録)のものがあるため、メーカー公表値を登録する。
--   素材/ベアリング違いで重量が異なる製品は、バリアントごとに別パーツとして登録する。
--   どの出典でも重量が確認できない製品は登録を削除する。
-- 出典(いずれもメーカー/正規の公表値・取得日 2026-10-01):
--   White Industries: https://www.whiteind.com/product/external-bsa-bottom-brackets/ (30mm: 83g)
--   Cane Creek: https://www.canecreek.com/products/hellbender-70-bottom-bracket (BSA 30mm: 92g)
--   CeramicSpeed: https://www.cog.inc/ceramicspeed/product/<slug> (製品仕様表)
--   Wolf Tooth: https://www.wolftoothcomponents.com/products/bsa-bottom-bracket (24mm:83g / 30mm:82g)
--   TOKEN: https://shop.tokenproducts.com/products/<slug> (Details表。TBT/Premium別)
--   Wishbone: https://wishbone.bike/products/<slug> (Specification Chart)
--   Praxis Works: https://praxiscycles.com/product/t47-i-b-shimano/ (AVG. WEIGHT 104g)
--   ROTOR: https://rotorbike.com/en-us/rotor-pf4630-bb.html (Ceramic 76g / Steel 106g)
--   Shimano: BB-RS501(イタリアン)は同型番BSA(299=92g)と同一設計のため92g
-- 登録方針:
--   - バリアント分割時は weight を各バリアントの値にし、price は既存の円価格を両バリアントへ適用する
--     (国内のバリアント別円価格が単一の正規出典で確認できないため。判明した時点で別途更新する)。
--   - 重量の公表が無い製品は推測で埋めず削除する。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、追加するバリアント行を先に消す。
DELETE FROM parts WHERE id BETWEEN 749 AND 755;

-- ===== 1) 単一重量の更新 =====
UPDATE parts SET weight = 92, updated_at = CURRENT_TIMESTAMP WHERE id = 632; -- Shimano BB-RS501 Italian
UPDATE parts SET weight = 94, updated_at = CURRENT_TIMESTAMP WHERE id = 633; -- TOKEN TK877EX ITA
UPDATE parts SET weight = 104, updated_at = CURRENT_TIMESTAMP WHERE id = 638; -- TOKEN BB47A29-TBT
UPDATE parts SET weight = 82, updated_at = CURRENT_TIMESTAMP WHERE id = 641; -- TOKEN NINJA LITE BB4124PS
UPDATE parts SET weight = 80, updated_at = CURRENT_TIMESTAMP WHERE id = 642; -- TOKEN TK-BB86R386
UPDATE parts SET weight = 99, updated_at = CURRENT_TIMESTAMP WHERE id = 643; -- TOKEN NINJA LITE BB38624PS
UPDATE parts SET weight = 110, updated_at = CURRENT_TIMESTAMP WHERE id = 644; -- TOKEN TK-BB386PS
UPDATE parts SET weight = 83, updated_at = CURRENT_TIMESTAMP WHERE id = 646; -- Wolf Tooth BSA 24mm
UPDATE parts SET weight = 82, updated_at = CURRENT_TIMESTAMP WHERE id = 647; -- Wolf Tooth BSA 30mm
UPDATE parts SET weight = 112, updated_at = CURRENT_TIMESTAMP WHERE id = 648; -- Wishbone T47855-24
UPDATE parts SET weight = 114, updated_at = CURRENT_TIMESTAMP WHERE id = 649; -- Wishbone T47855-DUB
UPDATE parts SET weight = 108, updated_at = CURRENT_TIMESTAMP WHERE id = 650; -- Wishbone BSA68GXP
UPDATE parts SET weight = 94, updated_at = CURRENT_TIMESTAMP WHERE id = 651; -- Wishbone BSA30386(30mm)
UPDATE parts SET weight = 121, updated_at = CURRENT_TIMESTAMP WHERE id = 652; -- Wishbone BB38624
UPDATE parts SET weight = 130, updated_at = CURRENT_TIMESTAMP WHERE id = 653; -- Wishbone PF3024
UPDATE parts SET weight = 127, updated_at = CURRENT_TIMESTAMP WHERE id = 655; -- Wishbone BB30A24
UPDATE parts SET weight = 119, updated_at = CURRENT_TIMESTAMP WHERE id = 656; -- Wishbone BB3024
UPDATE parts SET weight = 104, updated_at = CURRENT_TIMESTAMP WHERE id = 660; -- Praxis Works T47 Integrated Trek
UPDATE parts SET weight = 83, updated_at = CURRENT_TIMESTAMP WHERE id = 663; -- White Industries BSA 30mm
UPDATE parts SET weight = 92, updated_at = CURRENT_TIMESTAMP WHERE id = 664; -- Cane Creek Hellbender 70 BSA30
UPDATE parts SET weight = 78, updated_at = CURRENT_TIMESTAMP WHERE id = 665; -- CeramicSpeed BB ALPHA BB86 (Shimano)
UPDATE parts SET weight = 97, updated_at = CURRENT_TIMESTAMP WHERE id = 670; -- CeramicSpeed BB EVO386 (Shimano)
UPDATE parts SET weight = 50, updated_at = CURRENT_TIMESTAMP WHERE id = 671; -- FSA BB-PF6000 (メーカー公表50g)

-- ===== 2) バリアント分割(重量差あり) =====
-- TOKEN: TBTベアリングとPremiumベアリングで重量が異なるため2件に分ける。
-- 既存行をPremium(標準)、追加行をTBT(セラミック)とする。

-- 634 TOKEN TK877EX BSA (Premium 98g / TBT 95g)
UPDATE parts SET weight = 98, variant_name = 'Premium',
    name = 'TOKEN TK877EX BB CUP 68/73 Bottom Bracket (Premium)',
    updated_at = CURRENT_TIMESTAMP WHERE id = 634;
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES
    (7150, 95, 72, 9, CURRENT_TIMESTAMP, 749, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN TK877EX BSA', 'TOKEN TK877EX BB CUP 68/73 Bottom Bracket (TBT)', 'TBT', 'BSA(シェル幅68/73mm)ねじ切り用、24mmクランク用。TBTセラミックベアリング。重量はメーカー公表値です');

-- 635 TOKEN BB29BSA (Premium 105g / TBT 100g)
UPDATE parts SET weight = 105, variant_name = 'Premium',
    name = 'TOKEN BB29BSA DUB Bottom Bracket (Premium)',
    updated_at = CURRENT_TIMESTAMP WHERE id = 635;
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES
    (8250, 100, 72, 9, CURRENT_TIMESTAMP, 750, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN BB29BSA', 'TOKEN BB29BSA DUB Bottom Bracket (TBT)', 'TBT', 'BSA(シェル幅68/73mm)ねじ切り用のDUBボトムブラケット。TBTセラミックベアリング。重量はメーカー公表値です');

-- 636 TOKEN BB46BR29 (Premium 118g / TBT 113g)
UPDATE parts SET weight = 118, variant_name = 'Premium',
    name = 'TOKEN BB46BR29 BBRight DUB Bottom Bracket (Premium)',
    updated_at = CURRENT_TIMESTAMP WHERE id = 636;
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES
    (11000, 113, 72, 9, CURRENT_TIMESTAMP, 751, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN BB46BR29', 'TOKEN BB46BR29 BBRight DUB Bottom Bracket (TBT)', 'TBT', 'BBRight(シェル幅79mm)圧入用のDUBボトムブラケット。TBTセラミックベアリング。重量はメーカー公表値です');

-- 637 TOKEN BB46BR24 (Premium 135g / TBT 130g)
UPDATE parts SET weight = 135, variant_name = 'Premium',
    name = 'TOKEN BB46BR24 BBRight Bottom Bracket (Premium)',
    updated_at = CURRENT_TIMESTAMP WHERE id = 637;
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES
    (8800, 130, 72, 9, CURRENT_TIMESTAMP, 752, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN BB46BR24', 'TOKEN BB46BR24 BBRight Bottom Bracket (TBT)', 'TBT', 'BBRight(シェル幅79mm)圧入用、24mmクランク用。TBTセラミックベアリング。重量はメーカー公表値です');

-- 639 TOKEN BB47A24 (Premium 123g / TBT 118g)
UPDATE parts SET weight = 123, variant_name = 'Premium',
    name = 'TOKEN BB47A24 T47A Bottom Bracket (Premium)',
    updated_at = CURRENT_TIMESTAMP WHERE id = 639;
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES
    (7700, 118, 72, 9, CURRENT_TIMESTAMP, 753, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN BB47A24', 'TOKEN BB47A24 T47A Bottom Bracket (TBT)', 'TBT', 'T47A(非対称シェル)ねじ切り用、24mmクランク用。TBTセラミックベアリング。重量はメーカー公表値です');

-- 645 TOKEN BB841T-46 (Premium 138g / TBT 135g)
UPDATE parts SET weight = 138, variant_name = 'Premium',
    name = 'TOKEN BB841T-46 PF30 Bottom Bracket (Premium)',
    updated_at = CURRENT_TIMESTAMP WHERE id = 645;
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES
    (8800, 135, 72, 9, CURRENT_TIMESTAMP, 754, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN BB841T-46', 'TOKEN BB841T-46 PF30 Bottom Bracket (TBT)', 'TBT', 'PF30(シェル幅68/73mm)圧入用、24mmクランク用。TBTセラミックベアリング。重量はメーカー公表値です');

-- 661 ROTOR PF4630 (Steel 106g / Ceramic 76g)
UPDATE parts SET weight = 106, variant_name = 'Steel', updated_at = CURRENT_TIMESTAMP WHERE id = 661;
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES
    (21780, 76, 52, 9, CURRENT_TIMESTAMP, 755, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'ROTOR PF4630 Ceramic', 'Rotor PF4630 Ceramic Bottom Bracket', 'Ceramic', 'PF30(68x46)圧入用、30mmクランク用。セラミックベアリング。重量はメーカー公表値です');

-- ===== 3) 重量が確認できないため削除 =====
-- CeramicSpeed(旧ライン/可変商品で重量非公表)、SRAM DUB(代理店非公表)、
-- Sugino(公式に重量記載無し)、Chris King(重量記載無し)、
-- Easton(重量記載無し)、Wishbone PF30A(製品に存在しない)、TOKEN BB47A386(公式カタログ外)
DELETE FROM parts WHERE id IN (
    588,                 -- CeramicSpeed T45 SHIMANO
    619, 620, 621, 622,  -- SRAM DUB Italian/PF30A/BBRight/T47
    631,                 -- Chris King ThreadFit T47A 30
    640,                 -- TOKEN BB47A386
    654,                 -- Wishbone PF30A24
    657, 658, 659,       -- Sugino PF30A-IDS24 / BB386EVO-IDS24 / BB30A-IDS24
    662,                 -- Rotor BSA30
    666, 667, 668, 669,  -- CeramicSpeed BB86 DUB / PF4630 / ITA30 / BSA30
    672,                 -- FSA BB-AL86
    673                  -- Easton BB386/BBRight 30mm
);
