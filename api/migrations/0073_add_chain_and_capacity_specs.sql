-- チェーン規格・RD/FD容量・チェーンラインを登録する(issue #166)
-- 目的:
--   変速段数だけでは判定できないチェーン規格と、RD/FD/クランクの容量・チェーンラインを
--   比較できるようにする。対象は次の4キー。
--     chain_standard       : チェーン規格(shimano_hg / sram_flattop / campagnolo)
--     max_sprocket_teeth   : RDが対応する最大スプロケット歯数、カセットの最大歯数
--     max_chainring_teeth  : FDが対応する最大チェーンリング歯数、クランクの最大歯数
--     chainline_mm         : クランク・FDのチェーンライン(mm)
--   複数規格に対応する部品はカンマ区切りで登録する(例: KMC X10 は shimano_hg,campagnolo)。
-- 方針:
--   - メーカー公式(製品ページ・技術資料)を優先する(AGENTS.md)
--   - 公式に記載が無い値は販売店・スペック集約サイトで確認し、非公式と明記する
--   - 既存の値を壊さないよう INSERT OR IGNORE にする
--   - 確認できない値は推測で埋めず、このコメントの「未登録」に記録する
-- 出典(2026-11-26 確認):
--   公式:
--     Shimano 製品ページ(以下の pdp.P-* は https://bike.shimano.com/en-NA/products/components/ 配下)
--       RD-R9250: pdp.P-RD-R9250.html (Low sprocket Max. 34T)
--       RD-R8150: pdp.P-RD-R8150.html (Low sprocket Max. 34T)
--       RD-R7150: pdp.P-RD-R7150.html (Low sprocket Max. 36T)
--       RD-RX825: pdp.P-RD-RX825.html (Low sprocket Max. 36T)
--       RD-R7100: pdp.P-RD-R7100.html (Low sprocket Max. 36T)
--       RD-RX822-GS: pdp.P-RD-RX822-GS.html (Low sprocket Max. 45T)
--       RD-R3000-GS: pdp.P-RD-R3000-GS.html (Low sprocket Max. 34T)
--       FD-R9250: pdp.P-FD-R9250.html (Chain line 44.5mm / Top gear teeth 46-54T)
--       FD-R8150: pdp.P-FD-R8150.html (Chain line 44.5mm / Top gear teeth 46-52T)
--       FD-R7150: pdp.P-FD-R7150.html (Chain line 44.5mm / Top gear teeth 50-52T)
--       FD-RX825: pdp.P-FD-RX825.html (+2.5mm chain line / 17T front range / Top gear teeth 48T)
--       FD-R7100-F: pdp.P-FD-R7100-F.html (Chain line 44.5mm / Top gear teeth 50-52T)
--       FD-RX820: pdp.P-FD-RX820.html (Chain line 47mm / Top gear teeth 46-48T)
--       FC-R7100: pdp.P-FC-R7100.html (Chain line 44.5mm / 50-34T, 52-36T)
--       FC-R8100: pdp.P-FC-R8100.html (Chain line 44.5mm / 46-36T, 50-34T, 52-36T)
--       FC-R9200: pdp.P-FC-R9200.html (Chain line 44.5mm / 50-34T, 52-36T, 54-40T)
--       FC-R9200-P: pdp.P-FC-R9200-P.html (FC-R9200と同じ)
--       FC-R8100-P: pdp.P-FC-R8100-P.html (FC-R8100と同じ)
--       FC-RX820-1: pdp.P-FC-RX820-1.html (Chain line 49.7mm / 40T, 42T)
--       FC-RX820-2: pdp.P-FC-RX820-2.html (Chain line 47mm / 48-31T)
--       CS-HG710-12: pdp.P-CS-HG710-12.html (11-36T / Compatible chain HG 12-speed)
--       CS-M8100-12: pdp.P-CS-M8100-12.html (10-45T, 10-51T / Compatible chain HG 12-speed)
--     Shimano 製品ページ(旧URL)
--       CS-R9200-12: https://bike.shimano.com/en-US/product/component/dura-ace-r9200/CS-R9200-12.html
--         (11-30T, 11-34T / Compatible chain HG 12-speed)
--       CS-R8101-12: https://bike.shimano.com/en-US/product/component/ultegra-r8100/CS-R8101-12.html
--         (11-30T, 11-34T / Compatible chain HG 12-speed)
--       CS-R7101-12: https://bike.shimano.com/en-US/product/component/shimano105-r7100-di2/CS-R7101-12.html
--         (11-34T / Compatible chain HG 12-speed)
--       CN-M9100: https://bike.shimano.com/en-US/product/component/dura-ace-r9200/CN-M9100.html
--         (Type HG 12-speed)
--       CN-M8100: https://bike.shimano.com/en-US/product/component/ultegra-r8100/CN-M8100.html
--         (Type HG 12-speed)
--       CN-HG701-11: pdp.P-CN-HG701-11.html (Type HG 11-speed)
--       CN-HG601-11: https://bike.shimano.com/en-EU/product/component/shimano/CN-HG601-11.html
--         (Type HG 11-speed)
--       * 直接アクセスが拒否されたため、上記の一部はWeb Archiveに保存された公式ページで確認した
--     SRAM サービスページ(https://www.sram.com/en/service/models/ 配下)
--       チェーン:
--         CN-RED-D1, CN-FRC-D1, CN-RIV-D1, CN-APX-D1, CN-RED-E1
--         (いずれも Chain Technology: Road Flattop D1/E1)
--       カセット:
--         CS-XG-1290-E1 (10-28t を含む) / CS-XG-1270-E1 (10-30t を含む)
--         CS-XG-1250-D1 (10-30t) / CS-XG-1271-D1 (10-44t) / CS-PG-1231-D1 (11-44t)
--         CS-XG-1391-E1 (10-46t) / CS-XG-1275-A1 (10-50t)
--         (ロード系は Chain Technology: Road Flattop D1/E1、Eagle系は Eagle)
--       XG-1275 10-52T: https://www.sram.com/en/sram/models/cs-xg-1275-b1
--       リアディレイラー:
--         RD-RED-E-E1 (Max tooth 36) / RD-FRC-E-D2 (36) / RD-RIV-E-D1 (36)
--         RD-APX-1E-D1 (44) / RD-RED-1E-E1 (46)
--       フロントディレイラー:
--         FD-RED-E-E1 / FD-FRC-E-D2 / FD-RIV-E-D1 (Chainline 45.0mm / 46-33T, 48-35T, 50-37T)
--       クランク:
--         FC-RED-D1 / PM-RED-D1 / FC-FRC-D1 / FC-FRC-D2 / FC-RIV-D1 (Chainline 45.0mm)
--         FC-APX-1W-D1 (40T, 47.5mm) / FC-FRC-1W-E1 (38-50T、40Tを含む、47.5mm)
--         / FC-RIV-1W-E1 (40T, 47.5mm)
--       DUB Road Wide(45.0mmと47.5mmの違い):
--         https://www.sram.com/en/service/articles/dub--road-wide
--     Campagnolo 技術資料
--       12s/13sクランク技術マニュアル(Rev.08/10-2026)
--         https://media.campagnolo.com/seecommerce/original/C-FC-SUPER-RECORD-13-PM-TM1EN
--         Super Record 12s Wireless: チェーンライン45.8mm / 45-29T, 48-32T, 50-34T
--         Super Record・Record・Chorus: チェーンライン44.5mm
--         Chorus: 48-32T, 50-34T, 52-36T
--       Ekar/Ekar GTクランク技術マニュアル(Rev.03/03-2024)
--         https://media.campagnolo.com/seecommerce/original/C-FC-EKAR-1X13S-GT-TM5EN
--         Ekar: チェーンライン45.5mm / 38-44T
--         Ekar GT: チェーンライン47.5mm / 36-44T
--       12s Wireless互換表(Rev00_12_2024)
--         https://media.campagnolo.com/seecommerce/original/C-CL-SUPER-RECORD-WRL-DB-12S-CT1EN
--         フロントディレイラーFD23-SR12WRLは52-36T以下に対応(最大52T)
--       Super Record Wireless リアディレイラー
--         https://www.campagnolo.com/us-en/super-record-wireless-rear-derailleur/CRDSUPERRECORDWRLDB12S.html
--         (10-25, 10-27, 10-29 の3種に対応)
--       Ekar リアディレイラー
--         https://www.campagnolo.com/us-en/ekar-rear-derailleur/CRDEKAR1X13S.html
--         (9-36から10-44までの3種に対応)
--       Ekar GT カセット
--         https://www.campagnolo.com/ie-en/ekar-gt-13--speed-sprockets/CCSEKAR1X13SGT.html
--         (9-36, 9-42, 10-44, 10-48。10-48の最大は48T)
--       Chorus 12 Speed カセット
--         https://www.campagnolo.com/us-en/chorus-12-speed-sprockets/CCSCHORUS12S.html
--         (11-29, 11-32, 11-34。11-34の最大は34T)
--       2022カタログ
--         https://www.campagnolo.com/on/demandware.static/-/Library-Sites-campagnoloLibrary/default/dw7c7a92cc/pdf/035_2482_Campagnolo-catalogue-6-2022-ENG.pdf
--         (Super Record 12s 11-29、Ekar 9-42)
--       Super Record 12 Speed チェーン
--         https://www.campagnolo.com/us-en/super-record-12-speed-chain/CCNSUPERRECORD12S.html
--       Ekar C13 チェーン
--         https://www.campagnolo.com/us-en/ekar-c13-chain/CCNEKAR1X13S.html
--     microSHIFT 2024カタログ
--       https://www.microshift.com/wp-content/uploads/2024/02/20240229_2024-Catalog_microSHIFT-web.pdf
--       RD-G7005M: Max Cog 42-48T / 1x10
--       FD-G7020: Chain Line 47mm / Top Gear Teeth 46-52T
--       FC-G7000-46: Chainline 47mm / Chainring 46-29T
--       CS-G105 11-38: https://www.microshift.com/models/cs-g105-11-38t/
--       Swordに専用チェーンは無い(BikeRadar 2023-07-18):
--         https://www.bikeradar.com/news/microshift-sword
--     KMC 製品ページ
--       X10: https://www.kmcchain.com/en/product/bicycle-chain-x10-10-speed
--         (SHIMANO, Campagnolo, SRAM 10 speed に対応)
--       X11: https://www.kmcchain.com/en/product/bicycle-chain-x11-11-speed
--         (SHIMANO, Campagnolo, SRAM 11 speed に対応)
--       X12: https://www.kmcchain.com/en/product/bicycle-chain-x12-12-speed
--         (Shimano・Campagnolo 12 speed向け。SRAM Flattop非対応)
--     FSA 製品ページ・技術資料
--       https://www.fsaproshop.com/products/gossamer-pro-abs-adventure-386evo-crankset
--       (Gossamer Pro AGX 46/30T)
--       Gossamer Pro Modular Direct Mount 2X BB386EVO AGX+ の技術資料
--       https://shop.fullspeedahead.com/en/files/index/download/id/ba85a5ebb82dfbcbb56b23ab79e2de27645/
--       (AGX 2X Chainline - 47mm)
--     Rotor 製品ページ
--       ALDHU Carbon: https://rotorbike.com/rotor-aldhu-carbon-crankset.html
--         (Chainline 43.9mm / 50-34T を含む)
--       ALDHU 24: https://rotorbike.com/en-eu/rotor-aldhu-2x12-shimano-crankset.html
--         (Chainline 43.5mm / 50-34T)
--       VEGAST: https://rotorbike.com/en-us/vegast-2x12s-shimano-crankset.html
--         (Chainline 43.5mm / 50-34T)
--     Praxis Works 製品ページ
--       https://praxiscycles.com/product/zayante-carbon-s/
--       (CHAINLINE 2X = 44 / 48-32T / 10-12sp KMC・SHIMANO・SRAM、Flat-Top対応)
--     Magene 製品ページ
--       PES P515: https://www.magene.com/en/pes/217-pes-p515-power-meter-set.html
--         (Chainline 44 / 50-34T)
--       TEO P515: https://www.magene.com/en/teo/237-teo-p515-power-meter-set.html
--         (Chainline 44 / 50-34T)
--   非公式(公式ページにチェーンラインの記載が無い値):
--     Campagnolo Chorus フロントディレイラー(44.5mm / 最大52T)
--       https://www.bike-components.de/en/Campagnolo/Chorus-12s-front-derailleur-2-12-speed-p72886/
--     Campagnolo Super Record Wireless フロントディレイラー(45.8mm)
--       https://www.bike-components.de/en/Campagnolo/Super-Record-Wireless-2-12-speed-Front-Derailleur-p92427/
--       * 最大チェーンリング歯数52Tは公式互換表による
--   未登録(公式に値・モデルを確認できないため。推測で埋めない):
--     404 microSHIFT Sword 10-Speed Chain
--       microSHIFT公式にSword専用チェーンが無く、KMC X10を推奨しているため
--     396 microSHIFT Sword CS-G104 11-38T
--       公式CS-G104は11-48Tのみ。11-38TはCS-G105/CS-H105のため
--     398 Shimano 105 CS-R7101 11-30T
--       公式CS-R7101-12は11-34Tのみのため最大歯数は未登録(chain_standardのみ登録)
--     308 Shimano GRX CS-RX820 11-34T
--       公式にCS-RX820のモデルページを確認できないため(12s GRX 2xはCS-R8101/CS-HG710)
--     549 SRAM GX Eagle XG-1275 10-52T
--       公式のチェーン規格はEagleで、shimano_hg/sram_flattop/campagnoloの語彙に無いため
--     165 FSAクランク
--       引用元にチェーン規格の記載が無いため
--     389/390 Magene PES/TEO P515 の chain_standard
--       公式ページにチェーン規格の記載が無いため未登録(歯数・チェーンラインは登録)
PRAGMA foreign_keys = ON;

-- チェーン(15件): そのチェーンが対応する規格（404は規格を確認できず未登録）
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano(HG 11/12-speed)
    (314, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (315, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (316, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (317, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM(Road Flattop)
    (318, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (319, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (320, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (409, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (410, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo
    (321, 'chain_standard', 'campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (322, 'chain_standard', 'campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- KMC(Shimano・Campagnolo対応)
    (405, 'chain_standard', 'shimano_hg,campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (406, 'chain_standard', 'shimano_hg,campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (407, 'chain_standard', 'shimano_hg,campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (408, 'chain_standard', 'shimano_hg,campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- カセット(16件): 受け入れるチェーン規格
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano(HG 12-speed)
    (305, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (306, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (307, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (397, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (398, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (547, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM(Road Flattop)
    (309, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (310, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (311, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (399, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (400, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (401, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo
    (312, 'chain_standard', 'campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (313, 'chain_standard', 'campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (402, 'chain_standard', 'campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (403, 'chain_standard', 'campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- リアディレイラー(16件): 受け入れるチェーン規格
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano(HG 9/12-speed)
    (331,  'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (332,  'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (333,  'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (334,  'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (384,  'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (385,  'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (554,  'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (555,  'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM(Road Flattop)
    (335,  'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (336,  'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (337,  'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (386,  'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (387,  'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo
    (338,  'chain_standard', 'campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (339,  'chain_standard', 'campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- microSHIFT(標準10-speedチェーン)
    (383,  'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- クランク(28件中25件): 受け入れるチェーン規格（165・389・390は未登録）
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano(HG 12-speed)
    (160, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (161, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (162, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (167, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (168, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (169, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (170, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (394, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM(Road Flattop)
    (163, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (164, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (171, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (172, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (173, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (174, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (391, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (392, 'chain_standard', 'sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo
    (166, 'chain_standard', 'campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (175, 'chain_standard', 'campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (176, 'chain_standard', 'campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (393, 'chain_standard', 'campagnolo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- microSHIFT(標準10-speedチェーン)
    (388, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Rotor(Shimano 2x12・2x11に対応)
    (177, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (178, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (395, 'chain_standard', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Praxis Works(通常チェーンとFlat-Topの両対応)
    (179, 'chain_standard', 'shimano_hg,sram_flattop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- リアディレイラー(16件): 対応する最大スプロケット歯数
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano
    (331, 'max_sprocket_teeth', '34', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (332, 'max_sprocket_teeth', '34', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (333, 'max_sprocket_teeth', '36', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (334, 'max_sprocket_teeth', '36', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (384, 'max_sprocket_teeth', '36', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (385, 'max_sprocket_teeth', '45', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (554, 'max_sprocket_teeth', '34', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (555, 'max_sprocket_teeth', '34', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM
    (335, 'max_sprocket_teeth', '36', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (336, 'max_sprocket_teeth', '36', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (337, 'max_sprocket_teeth', '36', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (386, 'max_sprocket_teeth', '44', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (387, 'max_sprocket_teeth', '46', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo
    (338, 'max_sprocket_teeth', '29', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (339, 'max_sprocket_teeth', '44', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- microSHIFT
    (383, 'max_sprocket_teeth', '48', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- カセット(16件): 最大スプロケット歯数(カセットの最大歯数)
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano
    (305, 'max_sprocket_teeth', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (306, 'max_sprocket_teeth', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (307, 'max_sprocket_teeth', '34', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (397, 'max_sprocket_teeth', '36', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (547, 'max_sprocket_teeth', '51', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM
    (309, 'max_sprocket_teeth', '28', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (310, 'max_sprocket_teeth', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (311, 'max_sprocket_teeth', '30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (399, 'max_sprocket_teeth', '44', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (400, 'max_sprocket_teeth', '44', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (401, 'max_sprocket_teeth', '46', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (549, 'max_sprocket_teeth', '52', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo
    (312, 'max_sprocket_teeth', '29', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (313, 'max_sprocket_teeth', '42', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (402, 'max_sprocket_teeth', '48', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (403, 'max_sprocket_teeth', '34', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- フロントディレイラー(12件): 対応する最大チェーンリング歯数
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano
    (323, 'max_chainring_teeth', '54', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (324, 'max_chainring_teeth', '52', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (325, 'max_chainring_teeth', '52', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (326, 'max_chainring_teeth', '48', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (380, 'max_chainring_teeth', '52', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (381, 'max_chainring_teeth', '48', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM
    (327, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (328, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (329, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo
    (330, 'max_chainring_teeth', '52', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (382, 'max_chainring_teeth', '52', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- microSHIFT
    (379, 'max_chainring_teeth', '52', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- クランク(28件): 最大チェーンリング歯数(装着される最大のチェーンリング)
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano
    (160, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (161, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (162, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (167, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (168, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (169, 'max_chainring_teeth', '48', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (170, 'max_chainring_teeth', '40', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (394, 'max_chainring_teeth', '52', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM
    (163, 'max_chainring_teeth', '48', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (164, 'max_chainring_teeth', '48', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (171, 'max_chainring_teeth', '48', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (172, 'max_chainring_teeth', '48', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (173, 'max_chainring_teeth', '48', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (174, 'max_chainring_teeth', '40', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (391, 'max_chainring_teeth', '40', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (392, 'max_chainring_teeth', '40', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo
    (166, 'max_chainring_teeth', '48', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (175, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (176, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (393, 'max_chainring_teeth', '42', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- microSHIFT
    (388, 'max_chainring_teeth', '46', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- FSA
    (165, 'max_chainring_teeth', '46', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Rotor
    (177, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (178, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (395, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Praxis Works
    (179, 'max_chainring_teeth', '48', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Magene
    (389, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (390, 'max_chainring_teeth', '50', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- クランク(28件): チェーンライン(mm)
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano(12sロードは44.5mm、GRX 2xは47mm、GRX 1xは49.7mm)
    (160, 'chainline_mm', '44.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (161, 'chainline_mm', '44.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (162, 'chainline_mm', '44.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (167, 'chainline_mm', '44.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (168, 'chainline_mm', '44.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (169, 'chainline_mm', '47', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (170, 'chainline_mm', '49.7', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (394, 'chainline_mm', '44.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM(ロード2xは45.0mm、Wideは47.5mm)
    (163, 'chainline_mm', '45.0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (164, 'chainline_mm', '45.0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (171, 'chainline_mm', '45.0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (172, 'chainline_mm', '45.0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (173, 'chainline_mm', '45.0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (174, 'chainline_mm', '47.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (391, 'chainline_mm', '47.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (392, 'chainline_mm', '47.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo
    (166, 'chainline_mm', '44.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (175, 'chainline_mm', '45.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (176, 'chainline_mm', '44.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (393, 'chainline_mm', '47.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- microSHIFT
    (388, 'chainline_mm', '47', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- FSA(AGX 2Xのチェーンラインは47mm)
    (165, 'chainline_mm', '47', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Rotor
    (177, 'chainline_mm', '43.9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (178, 'chainline_mm', '43.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (395, 'chainline_mm', '43.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Praxis Works
    (179, 'chainline_mm', '44', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Magene
    (389, 'chainline_mm', '44', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (390, 'chainline_mm', '44', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- フロントディレイラー(12件): チェーンライン(mm)
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano
    (323, 'chainline_mm', '44.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (324, 'chainline_mm', '44.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (325, 'chainline_mm', '44.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (326, 'chainline_mm', '47', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (380, 'chainline_mm', '44.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (381, 'chainline_mm', '47', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM
    (327, 'chainline_mm', '45.0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (328, 'chainline_mm', '45.0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (329, 'chainline_mm', '45.0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo(SRWは公式クランクの45.8mm、Chorusは販売店スペックの44.5mm)
    (330, 'chainline_mm', '45.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (382, 'chainline_mm', '44.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- microSHIFT
    (379, 'chainline_mm', '47', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
