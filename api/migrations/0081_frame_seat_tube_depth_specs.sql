-- フレームのシートチューブ長(seat_tube_depth_mm)を登録する
-- 目的:
--   シートチューブ長(BB中心〜シートクランプ上端)を登録し、
--   シートポストの最小挿入長(seatpost_min_insert_mm)と比較して
--   シートポストを十分に差し込めない組み合わせを判定できるようにする
-- 対象:
--   フレーム31件(登録31件、未登録0件)
-- 登録方針:
--   - サイズ別に値が異なるため、各モデルの最小サイズの値を代表値として登録する
--   - 各値のコメントに最小サイズを明記する
--   - メーカー公式のジオメトリ表・技術資料に記載された数値だけを登録する
--   - 「Seat tube length」以外の表記でも、BB中心からシートチューブ上端までの
--     長さを表す項目(CE、TST、C-T、Seat tube Heightなど)は同じ規格として扱う
--   - cm表記の表は10倍してmmで登録する
--   - 統合シートポスト(ISP)のフレームは、公式表のシートチューブ長が
--     切断前のマスト長のため、その値を登録する(Giant Propel Advanced SL)
--   - 既存値を壊さないよう INSERT OR IGNORE にする
--   - 公式値が確認できないフレームは推測で埋めず、未登録のまま残す
-- 確認日: 2026-11-26
-- 出典(公式。原文の引用は各項目の下に記載):
--   Cervelo S5 製品ページ(ジオメトリ表、単位mm)
--     https://www.cervelo.com/en-US/bikes/s5
--     "Seat tube length 438"(Size 48)
--   Cannondale SuperSix EVO オーナーズマニュアル補足(2023)
--     https://www.cannondale.com/-/media/files/manual-uploads/cy23/151901-rev1-cd-oms-supersix-evo-0223-eng.ashx
--     "A Seat Tube Length 40.0"(Size 44、単位cm)
--     * Gen4(2023)の値。Gen5の3件(762/763/764)は次のジオメトリ表を参照
--   Cannondale SuperSix EVO Gen 5 ジオメトリ表
--     https://www.cannondale.com/-/media/images/my26/bikes/road/race/s6-evo/pdps/c26_supersixevo_geotable.ashx
--     "A Seat Tube Length (cm) 40.0"(Size 44)
--   Trek 製品データAPI(ジオメトリ、単位cm)
--     Madone SLR Gen7 https://api.trekbikes.com/occ/v2/us/products/37307/sizing
--       "A Seat tube 42.4"(47cm)
--     Madone SLR Gen8 https://api.trekbikes.com/occ/v2/us/products/46775/sizing
--       "A Seat tube 40.4"(XS)
--     Emonda SLR Disc https://api.trekbikes.com/occ/v2/us/products/32772/sizing
--       "A Seat tube 42.4"(47cm)
--   Specialized 製品ページ(ジオメトリ表、単位mm)
--     Tarmac SL8 https://www.specialized.com/us/en/s-works-tarmac-sl8-frameset-fact-12r-carbon/p/216956
--       "Seat Tube Length 433"(44)
--     Tarmac SL9 https://www.specialized.com/us/en/s-works-tarmac-sl9-frameset-fact-12r-carbon/p/4293537
--       "Seat Tube Length 433"(44)
--     Aethos https://www.specialized.com/us/en/s-works-aethos-frameset-fact-12r-carbon/p/199445
--       "Seat Tube Length 431"(49)
--   Giant Propel Advanced SL Frameset 製品ページ(ジオメトリ表)
--     https://www.giant-bicycles.com/us/propel-advanced-sl-frameset
--     "A Seat Tube Length 680"(XS、ISPのマスト長)
--   Scott 2022 FOIL RC 取扱説明書(ジオメトリ表)
--     https://asset-misc.scott-sports.com/Foi/Foil_RC_Manual_A4_2022_Scott-Sports_EN.pdf
--     "I BB center to TST 451.8"(47 XXS)
--   Scott 2025 ADDICT RC 取扱説明書(ジオメトリ表)
--     https://asset-misc.scott-sports.com/Add/Addict_RC_Manual_A4_2025_Scott-Sports_EN_2194728.pdf
--     "I BB center to TST 420"(47)
--   Wilier Filante SLR 技術資料(WILIERPEDIA 2025)
--     https://api.wilier.com/media/2775/INTRO_TECNICA_FILANTESLR_ENG.pdf
--     "H 45"(XS、単位cm。Hはシートチューブ長)
--   Wilier Verticale SLR 技術資料(WILIERPEDIA 2025)
--     https://api.wilier.com/media/2634/INTRO_TECNICA_VERTICALE_ENG.pdf
--     "H 45"(XS、単位cm。Hはシートチューブ長)
--   Pinarello Dogma F 製品ページ(ジオメトリ表)
--     https://pinarello.com/usa/en/bikes/road/competition/new-dogma-f/dogma-f
--     "CE 430"(425、CE=Seat tube center-end)
--   BMC 製品ページ(ジオメトリ表)
--     Teammachine R 01 Frameset
--       https://bmc-switzerland.com/products/teammachine-r-01-frameset-frames-bmc-27a-000045
--       "Seat Tube 418"(47)
--     Teammachine R 01 FRS VAR1(2026)
--       https://e-ftb.co.jp/bmc/lineup/12113/
--       "Seat Tube MM 418"(47)
--     Teammachine R 01 FRS VAR1(2027)
--       https://e-ftb.co.jp/bmc/lineup/12903/
--       "Seat Tube MM 418"(47)
--     Teammachine SLR 01 Frameset(Gen 5)
--       https://bmc-switzerland.com/products/teammachine-slr-01-frameset-frames-bmc-27a-000028
--       "Seat Tube 422"(47)
--       同型番の別色ページ(27a-000025〜27a-000027)も422mmで一致する
--       BMC日本公式の2027年モデルページ(13102)は418mmのため、
--       全色ページが一致する422mmを採用する
--     Teammachine SLR01 MOD(2023)
--       https://e-ftb.co.jp/bmc/lineup/9453/
--       "Seat Tube (st) 423"(47)
--   Merida Scultura Team 製品ページ(ジオメトリ表)
--     https://www.merida-bikes.com/en/bike/6560/scultura-team
--     "ST seat tube 400"(3XS)
--   Colnago V4Rs ジオメトリシート(公式)
--     https://139650070.fs1.hubspotusercontent-eu1.net/hubfs/139650070/Geometrie%20schede/Scheda%20A4%20-%20COLNAGO%20V4Rs.pdf
--     "Cf 420"(Size 420、Cf=シートチューブ長center-end)
--   Orbea Orca OMX Bluepaper 2024(公式技術資料。配布元は販売店)
--     https://velomarket-cska.ru/resources/manuals/Orbea/ORCA_OMX_OMR_2024_BLUEPAPER_EN_ES_DE_FR_IT_14-07-25.pdf
--     "1-Seat tube(C-T) 440"(47)
--   Factor OSTRO VAM 製品ページ(ジオメトリ)
--     https://factorbikes.com/bikes/ostro-vam
--     "J Seat Tube Length 432"(45)
--   LOOK 795 Blade RS 3 製品ページ(ジオメトリ表)
--     https://www.lookcycle.com/dispatch/fr-fr/produits/velos/route/aero/795-blade-rs-sram-force-axs-scope-artech-6-a
--     "A - Seat tube 463"(XXS)
--   Argon 18 Nitrogen Pro 製品ページ(ジオメトリ表)
--     https://www.argon18.com/en/bikes/road/nitrogen-pro/nitrogen-pro-sram-red
--     "A Seat tube Height cm 39,5"(XXS)
--   Basso SV 技術ページ(ジオメトリ表)
--     https://bassobikes.com/en/sv-tech
--     "Seat Tube (A1) 420 mm"(45)
--   Winspace M6 製品ページ(カタログのジオメトリ表)
--     https://www.winspace.cc/products/m6
--     "A SEAT TUBE 430"(XS)
-- 未登録:
--   なし(31件すべて公式資料で数値を確認)

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, 'seat_tube_depth_mm', v.column2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    (1, '438'),       -- 最小サイズ（48cm）の値: Cervelo S5
    (2, '400'),       -- 最小サイズ（44cm）の値: Cannondale SuperSix EVO Hi-Mod
    (4, '424'),       -- 最小サイズ（47cm）の値: Trek Madone SLR Gen7
    (5, '433'),       -- 最小サイズ（44cm）の値: Specialized Tarmac SL8
    (8, '680'),       -- 最小サイズ（XS）の値: Giant Propel Advanced SL（ISPのマスト長）
    (9, '451.8'),     -- 最小サイズ（47 XXS）の値: Scott Foil RC
    (10, '450'),      -- 最小サイズ（XS）の値: Wilier Filante SLR
    (11, '430'),      -- 最小サイズ（425）の値: Pinarello Dogma F
    (12, '418'),      -- 最小サイズ（47cm）の値: BMC Teammachine R 01
    (13, '400'),      -- 最小サイズ（3XS）の値: Merida Scultura
    (14, '420'),      -- 最小サイズ（420）の値: Colnago V4Rs
    (15, '400'),      -- 最小サイズ（44cm）の値: Cannondale SuperSix EVO Carbon（Gen4のOMS由来）
    (18, '404'),      -- 最小サイズ（XS）の値: Trek Madone SLR Gen 8
    (19, '424'),      -- 最小サイズ（47cm）の値: Trek Emonda SLR Disc（ISPのマスト長）
    (20, '431'),      -- 最小サイズ（49cm）の値: Specialized S-Works Aethos
    (23, '420'),      -- 最小サイズ（47cm）の値: Scott Addict RC Ultimate
    (24, '450'),      -- 最小サイズ（XS）の値: Wilier Verticale SLR
    (26, '423'),      -- 最小サイズ（47cm）の値: BMC Teammachine SLR 01(2023)
    (28, '440'),      -- 最小サイズ（47cm）の値: Orbea Orca OMX
    (29, '432'),      -- 最小サイズ（45）の値: Factor OSTRO VAM 2.0
    (363, '463'),     -- 最小サイズ（XXS）の値: LOOK 795 Blade RS 3
    (364, '395'),     -- 最小サイズ（XXS）の値: Argon 18 Nitrogen Pro
    (534, '420'),     -- 最小サイズ（45）の値: Basso SV
    (539, '430'),     -- 最小サイズ（XS）の値: Winspace M6
    (541, '433'),     -- 最小サイズ（44cm）の値: Specialized Tarmac SL9
    (756, '422'),     -- 最小サイズ（47cm）の値: BMC Teammachine SLR 01(Gen 5)
    (758, '418'),     -- 最小サイズ（47cm）の値: BMC Teammachine R 01(VAR)
    (759, '418'),     -- 最小サイズ（47cm）の値: BMC Teammachine R 01(V)
    (762, '400'),     -- 最小サイズ（44cm）の値: Cannondale SuperSix EVO Carbon(Gen 5)
    (763, '400'),     -- 最小サイズ（44cm）の値: Cannondale SuperSix EVO Hi-MOD(Gen 5)
    (764, '400')      -- 最小サイズ（44cm）の値: Cannondale SuperSix EVO LAB71(Gen 5)
) AS v
JOIN parts p ON p.id = v.column1;
