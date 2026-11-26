-- ブレーキの作動方式・油種・最大ローター径・フレームの最大ローター径を登録する(issue #167)
-- 目的:
--   油圧/機械式だけでは判定できないブレーキ互換(油種・ローター径・前後専用)を登録する。
--   対象はシフトブレーキレバー13件、ブレーキキャリパー21件、フレーム31件。
-- 方針:
--   - メーカー公式(製品ページ・技術資料・マニュアル)を優先する(AGENTS.md)
--   - 公式に記載が無い値は販売店・スペック集約サイトを使い、非公式と明記する
--   - max_rotor_diameter_mm はアダプター無しの直付けで使える最大径とし、
--     180mmなどアダプターや専用マウントが必要な径は含めない
--   - 既存値を壊さないよう INSERT OR IGNORE にする
--   - 確認できない値・対象外の値は推測で埋めず、末尾に残件として記録する
-- 出典(2026-11-26 確認):
--   公式:
--     Shimano ディスクブレーキキャリパーとローターの互換表
--       https://productinfo.shimano.com/en/compatibility/C-461
--       "Disc brake caliper and rotor compatibility" の表に
--       BR-R9270/R8170/R7170/R4770/RS805/RS305/RX820/RX400 が 140/160/180mm 対応として掲載
--       *3 "Not compatible with rear 180 mm rotors"(BR-R9270/BR-R9170)
--     Shimano 105 BR-R7170
--       https://bike.shimano.com/en-EU/product/component/shimano105-r7100-di2/BR-R7170.html
--       "SHIMANO Flat Mount System" / "proven hydraulic braking technology"
--     Shimano Ultegra BR-R8170
--       https://bike.shimano.com/en-UK/products/components/pdp.P-BR-R8170.html
--       "ULTEGRA R8170 disc brake caliper" / hydraulic
--     Shimano Dura-Ace BR-R9270
--       https://bike.shimano.com/en-UK/products/components/pdp.P-BR-R9270.html
--       "DURA-ACE BRAKE CALIPER" / hydraulic
--     Shimano Tiagra BR-4770
--       https://bike.shimano.com/en-US/product/component/tiagra-4700/BR-4770-R.html
--       "SHIMANO Flat Mount System" / hydraulic
--     Shimano GRX BR-RX820
--       https://bike.shimano.com/en-UK/products/components/pdp.P-BR-RX820.html
--       "GRX - FLAT MOUNT - BRAKE CALIPER"
--     Shimano GRX BR-RX400
--       https://bike.shimano.com/en-UK/products/components/pdp.P-BR-RX400-F.html
--       "GRX - FLAT MOUNT - BRAKE CALIPER"
--     Shimano BR-RS805-F
--       https://bike.shimano.com/en-EU/product/component/ultegra-6800/BR-RS805-F.html
--       "Brake type: Disc brake Hydraulic" / "Mount type: Flat mount"
--     Shimano BR-RS305-R
--       https://bike.shimano.com/en-US/product/component/shimano/BR-RS305-R.html
--       "Brake type: Mechanical disc brake" / "Both 140mm and 160mm rotor available with one bracket"
--     Shimano 鉱物油の公式説明
--       https://bike.shimano.com/en-US/information/news/mineral-oil-brake-fluids.html
--       "Genuine Shimano Mineral Oil is the only fluid compatible with Shimano brakes"
--     Shimano ST-RX820
--       https://bike.shimano.com/en-US/product/component/grx-12-speed/ST-RX820-R.html
--       "Brake lever|Oil: SHIMANO Mineral"
--     SRAM Force AXS ウェルカムガイド
--       https://www.sram.com/en/learn/force-axs-welcome-guide/easy-maintenance
--       "Using a fresh bottle of DOT 5.1 brake fluid"
--     SRAM Apex Disc Brake
--       https://www.sram.com/en/sram/models/db-apx-d1
--       "Brake type: Hydraulic" / "Hydraulic fluid: DOT 5.1"
--     SRAM RED AXS HRD Shift-Brake System
--       https://www.sram.com/en/sram/models/ED-RED-E1
--       "Brake orientation: Front, Rear" / hydraulic
--     SRAM Force AXS HRD Shift-Brake System
--       https://www.sram.com/en/sram/models/ED-FRC-D2
--       "Brake orientation: Front, Rear" / hydraulic
--     SRAM Rival AXS HRD Shift-Brake System
--       https://www.sram.com/en/sram/models/ED-RIV-D1
--       "Brake orientation: Front, Rear" / hydraulic
--     SRAM 2024 Road Frame Fit Specifications(直付けの上限確認)
--       https://www.sram.com/globalassets/document-hierarchy/frame-fit-specifications/road/2024-road-frame-fit-specifications.pdf
--       p.83 "Flat Mount Fork with Front Bracket Specification
--       SRAM Flat Mount Calipers and 140/160, 160/180 ... Rotor"
--       → 140/160は直付け、160/180はフロントブラケット(アダプター)要
--     Campagnolo Super Record Wireless Caliper
--       https://www.campagnolo.com/us-en/super-record-wireless-caliper/CCPSUPERRECORDWRLDB12S.html
--       "caliper can be chosen with a disc measuring either 140 mm ... or 160 mm"
--     Campagnolo Ekar Caliper
--       https://www.campagnolo.com/us-en/caliper-ekar/CCPEKAR1X13S.html
--       "using mineral oil" / "110 gr front (adapter incl.) 95 gr rear"
--     Campagnolo 2022カタログ(Ekarのローター径)
--       https://www.campagnolo.com/on/demandware.static/-/Library-Sites-campagnoloLibrary/default/dw7c7a92cc/pdf/035_2482_Campagnolo-catalogue-6-2022-ENG.pdf
--       "choice of 140 and 160mm discs"
--     Campagnolo Ekar 取扱説明書(油種・ローター径)
--       https://www.campagnolo.com/on/demandware.static/-/Library-Sites-campagnoloLibrary/default/dw95fe80d7/pdf/035_2457_User_manual_Ergopower_calipers_Ekar_Campagnolo_Rev00_03_2021.pdf
--     TRP Spyre SLC
--       https://trpcycling.com/products/spyre-slc
--       "mechanical disc brake" / "FF-5 Front Flat Mount 140/160mm adapter"
--     TRP Spyre
--       https://trpcycling.com/products/spyre
--       "mechanical disc brake" / "160mm rotors recommended on front wheel"
--     TRP HY/RD
--       https://trpcycling.com/products/hy-rd
--       "open hydraulic system" / "compatible with ... cable actuated systems"
--       "All flat mount calipers being mounted to the fork require the FF-5 ... adapter"
--     TRP HY/RD 日本正規代理店(あさひ)
--       https://trpcycling.jp/hyrd-fm.html
--       "対応ディスクローター径：140mm/160mm" / "ミネラルオイル"
--       "メカニカルタイプのロードバイク用ブレーキレバー"
--     TRP 2015カタログ(HY/RDのローター径)
--       https://www.trpbrakes.com/userfiles/file/TRPBrakesCatalog2015.pdf
--       "ROTOR OPTIONS: Choice of 140mm or 160mm"
--     HOPE RX4+ SL
--       https://www.hopetech.com/products/brakes/gravel-cx/rx4-sl-fm/
--       "Designed to fit 140, 160 & 180mm rotors" / "DOT and Mineral oil compatible versions"
--       "DOT Fluid"版はSRAM向け、Mineral Oil版はShimano/Campagnolo向け
--     HOPE Flat Mount Calipers Fitment Chart
--       https://www.hopetech.com/webtop/modules/_repository/1/documents/FlatMountFitmentChart.pdf
--       RX4+ STDは"For Ø160 disc Direct Mount"、180mmは+20mm版またはX/Zマウント要
--     microSHIFT Sword SB-G7020
--       https://www.microshift.com/models/sb-g7020/
--       "making your mechanical disc brakes feel stronger" / "Compatible with road pull brakes"
--   フレーム(公式に最大ローター径の記載がある機種):
--     Cervelo S5 テクニカルガイド
--       https://www.cervelo.com/cdn/shop/files/S5_SN170_Technical_Guide.pdf
--       "Brake Rotor Min/Max: Front 160 mm only, Rear 140 mm / 160 mm"
--     Cannondale SuperSix EVO Owner's Manual Supplement(2023)
--       https://www.cannondale.com/-/media/files/manual-uploads/cy23/151901-rev1-cd-oms-supersix-evo-0223-eng.ashx
--       "Brakes: Mount Type / Min./Max. Rotor Dia. | FT: Flat Mount/140mm/160mm
--        RR: Flat Mount/140mm/160mm"
--     Trek Madone SLR Gen7/SL 2024 Service Manual
--       https://retailerassetsprd.blob.core.windows.net/techassets/TK_MadoneSLRGen7-SL_MY24_ServiceManual_EN-US_2024-2-20.pdf
--       "Brake rotor diameter min/max | 140/160mm"
--     Specialized Tarmac SL8 User Manual(2024)
--       https://media.specialized.com/support/collateral/2024_TARMAC_SL8_USER_MANUAL_ENGLISH.pdf
--       "Min / max front rotor 160 mm / 160 mm" / "Min / max rear rotor 140 mm / 160 mm"
--     Scott Foil RC マニュアル(2023)
--       https://asset-misc.scott-sports.com/Foi/Foil_RC_Manual_A4_2022_Scott-Sports_EN.pdf
--       "Max/Min Rotor Size: Front Max/Min 180mm / 140mm Rear Max/Min 160mm / 140mm"
--     Pinarello Dogma F White Paper
--       https://pinarello.com/assets/documents/Whitepaper_Dogma-F.pdf
--       "Disc flat mount max 160mm"
--     BMC Teammachine R 01 Frameset
--       https://bmc-switzerland.com/products/teammachine-r-01-frameset-frames-bmc-27a-000045
--       "Rotor compatibility: 160mm front | 140mm or 160mm rear"
--     Trek Madone Gen 8 FAQ
--       https://www.trekbikes.com/gb/en_GB/FAQ/madone-gen8/
--       "The Madone SLR/SL Gen 8 accepts a 180 mm or 160 mm front rotor.
--        The rear can be either 160 mm or 140 mm."
--     Trek Emonda SLR Disc Frameset
--       https://www.trekbikes.com/gb/en_GB/bikes/road-bikes/performance-road-bikes/%C3%A9monda/f/F211/%25c3%2589monda-slr-disc-frame-set/32772/5264906/
--       "Max brake rotor sizes: 160 mm front and rear"
--     Scott Addict RC マニュアル(2025)
--       https://asset-misc.scott-sports.com/Add/Addict_RC_Manual_A4_2025_Scott-Sports_EN_2194728.pdf
--       "MAX ROTOR FRONT 160 / 180" / "MAX ROTOR REAR 140 / 160"
--     BMC Teammachine SLR 01 Frameset
--       https://bmc-switzerland.com/products/teammachine-slr-01-frameset-frames-bmc-27a-000028
--       "Rotor compatibility: 160mm front | 140mm or 160mm rear"
--     Orbea ORCA OMX-OMR 2024 Blue Paper(販売店ミラー)
--       https://velomarket-cska.ru/resources/manuals/Orbea/ORCA_OMX_OMR_2024_BLUEPAPER_EN_ES_DE_FR_IT_14-07-25.pdf
--       "MINIMUM/MAXIMUM FRONT DISC SIZE 140 mm/160 mm"
--       "MINIMUM/MAXIMUM REAR DISC SIZE 140 mm / 160 mm"
--     Factor OSTRO VAM バイクビルダー
--       https://factorbikes.com/bike-builder/ostro-vam-shimano-ultegra
--       "Max Rotor Size | 160mm front & rear"
--     Specialized Tarmac SL9 User Manual
--       https://media.specialized.com/support/collateral/TARMAC_SL9_USER_MANUAL_ENGLISH.pdf
--       "Min/Max Front Rotor 160 mm Only" / "Min/Max Rear Rotor 140 mm / 160 mm"
--     Cannondale 2026 Tech Book(SuperSix EVO Gen 5 / 販売店ミラー)
--       https://www.bikecentrumpresov.sk/attachment/14-cannondaletechbook2026pdf
--       "Brakes: Mount Type / Min./Max. Rotor Dia.
--        FT: Flat Mount/140mm/160mm RR: Flat Mount/140mm/160mm"
--   非公式(販売店・スペック集約):
--     SRAM Force AXS E1 キャリパー(完成車仕様) "Rotor Size Compatibility 140, 160mm"
--       https://www.jensonusa.com/sram-force-axs-e1-shifthydraulic-disc-brake
--     SRAM Force AXS Flat Mount Caliper "Compatible with common 140/160mm road rotors"
--       https://scenders.com/product/sram-force-axs-flat-mount-caliper-2
-- 未登録のまま残したもの:
--   allowed_position(全21件):
--     Shimano BR-RS805/BR-RS305は前後別品番(BR-RS805-F/R、BR-RS305-F/R)だが、
--     マスタの品名が前後を特定しないため登録しない。
--     Campagnoloのキャリパーは前後で重量・対応径が異なるが、マスタの品名が前後を
--     特定しないため登録しない。SRAM・TRP・HOPEの対象品は前後共通のため登録しない。
--   brake_fluid(機械式5件+レバー1件):
--     215 TRP Spyre SLC、216 TRP HY/RD、422 Shimano BR-RS305、423 TRP Spyre C、
--     424 TRP HY/RD Post Mount、374 microSHIFT Swordはワイヤー作動のため油種を登録しない。
--     216/424は内部に鉱物油を持つが、レバー側は機械式で油種の突き合わせが不要なため未登録。
--   フレームの最大ローター径(10件):
--     8 Giant Propel Advanced SL: 公式スペックPDFは完成車の160/140のみで最大径の記載なし
--     10 Wilier Filante SLR: 公式ページに最大径の記載なし
--     13 Merida Scultura: 公式ページはDISC COOLERがFM160用と記載するが最大径の明記なし
--     14 Colnago V4Rs: 公式技術仕様は完成車の160/140のみで最大径の記載なし
--     20 Specialized S-Works Aethos: 公式マニュアル・製品ページに最大径の明記なし
--        (Specializedサポートの回答を引用したコミュニティ記事のみ)
--     24 Wilier Verticale SLR: 公式ページに最大径の記載なし
--     363 LOOK 795 Blade RS 3: 公式ページは完成車の160/140のみ
--     364 Argon 18 Nitrogen Pro: 公式ページは完成車の160/140のみ
--     534 Basso SV: 公式ページに最大径の記載なし
--     539 Winspace M6: 公式ページに最大径の記載なし
PRAGMA foreign_keys = ON;

-- キャリパーの作動方式(21件)
-- 対象: 202-216, 421-426
-- 機械式: 215, 216, 422, 423, 424 / 油圧式: それ以外
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (202, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (203, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (204, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (205, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (206, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (207, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (208, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (209, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (210, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (211, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (212, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (213, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (214, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (215, 'brake_actuation', 'mechanical', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (216, 'brake_actuation', 'mechanical', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (421, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (422, 'brake_actuation', 'mechanical', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (423, 'brake_actuation', 'mechanical', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (424, 'brake_actuation', 'mechanical', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (425, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (426, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- レバーの作動方式(13件)
-- 対象: 340-347, 374-378
-- 機械式: 374 microSHIFT Sword / 油圧式: それ以外
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (340, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (341, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (342, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (343, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (344, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (345, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (346, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (347, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (374, 'brake_actuation', 'mechanical', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (375, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (376, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (377, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (378, 'brake_actuation', 'hydraulic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- キャリパーのブレーキフルード(油圧式16件)
-- mineral_oil: Shimano 202/203/204/208/209/210/421、Campagnolo 207/213/214、HOPE 425
-- dot_5_1: SRAM 205/206/211/212、HOPE 426(SRAM向けDOT版)
-- 機械式(215/216/422/423/424)は未登録
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (202, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (203, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (204, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (205, 'brake_fluid', 'dot_5_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (206, 'brake_fluid', 'dot_5_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (207, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (208, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (209, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (210, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (211, 'brake_fluid', 'dot_5_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (212, 'brake_fluid', 'dot_5_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (213, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (214, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (421, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (425, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (426, 'brake_fluid', 'dot_5_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- レバーのブレーキフルード(油圧式12件)
-- mineral_oil: Shimano 340/341/342/343/375/376、Campagnolo 347/378
-- dot_5_1: SRAM 344/345/346/377
-- 機械式(374)は未登録
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (340, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (341, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (342, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (343, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (344, 'brake_fluid', 'dot_5_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (345, 'brake_fluid', 'dot_5_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (346, 'brake_fluid', 'dot_5_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (347, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (375, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (376, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (377, 'brake_fluid', 'dot_5_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (378, 'brake_fluid', 'mineral_oil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- キャリパーの対応最大ローター径(21件)
-- アダプター無しの直付けで使える最大径は160mm
-- 180mmは160/180マウント用アダプター、HOPEは+20mm版キャリパーが必要なため、
-- この値には含めない。Campagnoloは160mmが上限
-- Shimano BR-R9270は後輪180mm非対応(公式互換表の*3)だが、直付け上限160mmは共通
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (202, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (203, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (204, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (205, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (206, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (207, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (208, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (209, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (210, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (211, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (212, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (213, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (214, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (215, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (216, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (421, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (422, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (423, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (424, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (425, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (426, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- フレームの対応最大ローター径(公式に前後の最大径が同一と確認できた18件)
-- 1 Cervelo S5: フロント160のみ、リア140/160
-- 762/763/764 Cannondale SuperSix EVO Gen5は前後とも140/160
-- 9 Scott Foil RC / 18 Trek Madone Gen8 / 23 Scott Addict RCは
-- フロント180・リア160で前後が異なるため、1値では誤判定するので登録しない
-- (前後別の規格を追加するissueで対応する)
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (1, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (4, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (5, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (11, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (12, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (15, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (19, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (26, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (28, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (29, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (541, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (756, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (758, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (759, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (762, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (763, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (764, 'max_rotor_diameter_mm', '160', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
