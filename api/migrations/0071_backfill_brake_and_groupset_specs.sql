-- ブレーキキャリパーのマウント規格と、コンポセットの規格値を補完する
-- 目的:
--   フレーム×キャリパーの brake_mount が6/21、コンポセットの pad_family が9/22 など、
--   規格が未登録で適合判定が「未確認」になる組み合わせを減らす(issue #164)。
-- 方針:
--   - メーカー公式(製品ページ・技術資料)を優先する(AGENTS.md)
--   - 公式に記載が無い値は販売店・スペック集約サイトで確認し、非公式と明記する
--   - 既存の値を壊さないよう、登録は INSERT OR IGNORE にする
--   - 確認できない値・対象外の値は推測で埋めず、末尾に残件として記録する
-- 出典(2026-11-25 確認):
--   公式:
--     Shimano BR-R7170
--       https://bike.shimano.com/en-EU/product/component/shimano105-r7100-di2/BR-R7170.html
--       "SHIMANO Flat Mount System"
--     Shimano BR-4770
--       https://bike.shimano.com/en-US/product/component/tiagra-4700/BR-4770-R.html
--       "Mount type: Flat mount"
--     Shimano BR-RX820
--       https://bike.shimano.com/en-UK/products/components/pdp.P-BR-RX820.html
--       "GRX - FLAT MOUNT - BRAKE CALIPER"
--     Shimano BR-RX400
--       https://bike.shimano.com/en-UK/products/components/pdp.P-BR-RX400-F.html
--       "low-profile Flat Mount design" / 取付規格 "Supporto piatto"
--     Shimano CS-HG710-12
--       https://bike.shimano.com/en-AU/products/components/pdp.P-CS-HG710-12.html
--       "Compatible with new 12-speed and road 11-speed FREEHUB body"
--     Shimano CS-M8100-12
--       https://bike.shimano.com/de-DE/products/components/pdp.P-CS-M8100-12.html
--       "Spline-Typ: MICRO SPLINE"
--     Shimano 12速フリーハブ互換の解説(GRX 1x12はMICRO SPLINE)
--       https://bike.shimano.com/stories/article/a-guide-to-shimanos-12-speed-freehubs-and-compatibility.html
--     Campagnolo Super Record Wireless Caliper
--       https://www.campagnolo.com/us-en/super-record-wireless-caliper/CCPSUPERRECORDWRLDB12S.html
--       "Standard Flat Mount fully compatible with flat-mount frames"
--     Campagnolo Super Record S Wireless Caliper
--       https://www.campagnolo.com/us-en/super-record-s-wireless-caliper/CCPSUPERRECORDSWRLDB12S.html
--       "Standard Flat Mount fully compatible with flat-mount frames"
--     Campagnolo Ekar Caliper
--       https://www.campagnolo.com/us-en/caliper-ekar/CCPEKAR1X13S.html
--       "DB310 pads – also compatible with other Campagnolo disc brakes"
--     Campagnolo Ekar 13sクランク取扱説明書
--       https://www.campagnolo.com/on/demandware.static/-/Library-Sites-campagnoloLibrary/default/dwa8ccfe01/pdf/035_2454_User_manual_13s_Ekar_Crankset_Campagnolo_Rev00_03_2021.pdf
--       "La guarnitura è del tipo Ultra-Torque" / "calotte PRO-TECH"
--     Campagnolo 2022カタログ(EkarのPro-Tech BB)
--       https://www.campagnolo.com/on/demandware.static/-/Library-Sites-campagnoloLibrary/default/dw7c7a92cc/pdf/035_2482_Campagnolo-catalogue-6-2022-ENG.pdf
--       "Ekar TM Pro-Tech TM Bottom Bracket"
--     Campagnolo Record 13 Crankset
--       https://www.campagnolo.com/us-en/record-13-crankset/CFCRECORD13.html
--       "combines ... Ultra-Torque technology"
--     Campagnolo Record 13 Cassette
--       https://www.campagnolo.com/us-en/record-13-cassette/CCSRECORD13.html
--       "The proven N3W standard is fully maintained"
--     Campagnolo Super Record 12 Speed Wireless sprockets
--       https://www.campagnolo.com/us-en/super-record-12-speed-wireless-sprockets/CCSSUPERRECORDWRLDB12S.html
--       "the new Super Record Wireless cassettes mount the N3W freewheel body"
--     Campagnolo Super Record S Wireless Crankset
--       https://www.campagnolo.com/us-en/super-record-s-wireless-crankset-with-power-meter/CFCSUPERRECORDSWRLDB12SPM.html
--       "uses the Ultra-Torque locking system"
--     TRP Spyre SLC
--       https://trpcycling.com/products/spyre-slc
--       "All flat mount calipers being mounted to the fork require the FF-5 ... adapter"
--     TRP HY/RD
--       https://trpcycling.com/products/hy-rd
--       "All flat mount calipers being mounted to the fork require the FF-5 ... adapter"
--     SRAM RED XPLR XG-1391 Cassette
--       https://www.sram.com/en/sram/models/CS-XG-1391-E1
--       "Driver body interface: XDR"
--     SRAM Force XPLR XG-1371 Cassette
--       https://www.sram.com/en/sram/models/cs-xg-1371-e1
--       "Driver body interface: XDR"
--     SRAM XPLR PG-1231 Cassette
--       https://www.sram.com/en/sram/models/CS-PG-1231-D1
--       "For 11-speed road driver bodies" / "Driver body interface: Splined 11"
--     SRAM 12速AXSカセットと11速HGドライバーの互換FAQ
--       https://support.sram.com/hc/en-us/articles/6042443448219-Is-there-a-12-speed-road-AXS-cassette-that-is-compatible-with-11-speed-Hyperglide-driver-bodies
--       "the XPLR PG-1231 Cassette is compatible with the Hyperglide, also known as HG, 11-speed road driver bodies"
--     SRAM 2024+ Road Components 互換表(PG 1231のドライバーは11、XG 1391はXDR)
--       https://www.sram.com/globalassets/document-hierarchy/compatibility-map/road/road-compatibility-map-2024.pdf
--     SRAM/AVID ブレーキパッド識別表(Level ULTとRED/Force/Rival/Apexの2ピースキャリパーが同一パッド)
--       https://www.sram.com/globalassets/document-hierarchy/compatibility-map/sram-avid-disc-brake-pad-identification-guide.pdf
--   準公式(正規代理店):
--     SRAM RED XPLR E1の構成品名(0040で登録済み): "Red AXS Crank Set DUB Wide 1x"
--       https://manys.work/sram-road/
--   非公式(販売店・計測記事):
--     Shimano BR-R8170 "Mount type: Flat mount" (Starbike)
--       https://www.starbike.com/en/shimano-ultegra-br-r8170-disc-brake-caliper-flatmount-2-piston-black-resin-l03a/
--     Shimano BR-R9270 "Mount type: Flat mount" (Bikelake)
--       https://bikelake.com/components/shimano-dura-ace-br-r9270
--     SRAM Force AXS キャリパー "Flatmount" (Starbike)
--       https://www.starbike.com/en/sram-force-axs-disc-brake-flatmountfm/
--     SRAM Rival AXS キャリパー "Flat Mount mounting" (GravelPlus)
--       https://gravelplus.es/en/products/sram-frenos-pinza-de-freno-sram-rival-axs
--     Campagnolo Chorus 12速 "Brake Caliper Mount: Flat Mount" (Bicycle Warehouse)
--       https://bicyclewarehouse.com/products/chorus-ergopower-hydraulic-brake-shift-lever-disc-caliper-right-rear-12-speed-140mm-flat-mount-caliper-blk
--       (207は製品名が汎用的なため、Campagnolo 12速のフラットマウントキャリパーとして確認)
--     SRAM RED AXS E1 キャリパー "Brake Mount: Flat Mount" (The Bike Affair)
--       https://www.thebikeaffair.com/products/sram-red-axs-e1-flat-mount-disc-brake-caliper-front-rear
--     SRAM Apex AXS キャリパー "Flat mount" (Starbike)
--       https://www.starbike.com/en/sram-apex-axs-s300-2-piston-brake-caliper-flatmount-front-rear-black-incl-brake-pads/
--     Campagnolo Ekar キャリパー "Brake caliper mounting: Flat Mount" (bike-components)
--       https://www.bike-components.de/en/Campagnolo/Ekar-Disc-Brake-w-Hydraulic-Ergopower-Shift-Brake-Lever-13-speed-p78108/
--     microSHIFT Swordにキャリパーが含まれないこと(BikeRadar)
--       https://www.bikeradar.com/news/microshift-sword
--       "nor does it include brake calipers or disc brake rotors"
-- 未登録のまま残したもの:
--   369 microSHIFT Sword Mechanical Disc Groupset 2x10 の pad_family
--     メーカー・計測記事ともコンポセットにブレーキキャリパーが含まれないと明記しているため、
--     パッド形状を登録しない(キャリパーを占有する現行データは別途確認が必要)
--   208 Shimano Tiagra BR-4770 / 210 Shimano GRX BR-RX400 の pad_family
--     今回の対象外。公式ページ上はK05S-RX/L05A-RF対応でshimano_road_flat_mountと推定できるが、
--     対象外のため値を追加しない
PRAGMA foreign_keys = ON;

-- キャリパーのブレーキマウント(21件中、未登録の15件)
-- 対象: 202-216。421-426は登録済みのため INSERT OR IGNORE でそのまま残す
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (202, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (203, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (204, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (205, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (206, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (207, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (208, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (209, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (210, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (211, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (212, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (213, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (214, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (215, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (216, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- コンポセットのクランク軸規格(未登録4件)
-- CampagnoloのEkar系はPro-Tech(既存のEkar GT(372)と同じ)、ロード12速/13速はUltra-Torque、
-- SRAM RED XPLR E1はDUB
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (36, 'crank_spindle', 'campagnolo_ultra_torque', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (37, 'crank_spindle', 'campagnolo_ultra_torque', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (46, 'crank_spindle', 'campagnolo_protech', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (370, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- コンポセットのフリーボディ規格(未登録7件)
-- CampagnoloはN3W、SRAM Apex XPLRのPG-1231はHG、GRX 2xはHG、GRX 1x12はMICRO SPLINE
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (36, 'freehub_body', 'campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (37, 'freehub_body', 'campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (42, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (44, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (45, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (371, 'freehub_body', 'sram_xdr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (373, 'freehub_body', 'shimano_micro_spline', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- コンポセットのパッド形状(未登録13件のうち、キャリパーを含む12件)
-- 369はキャリパーを同梱しないため登録しない(上記「未登録のまま残したもの」)
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (34, 'pad_family', 'sram_road_axs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (35, 'pad_family', 'sram_road_axs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (36, 'pad_family', 'campagnolo_db310', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (37, 'pad_family', 'campagnolo_db310', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (38, 'pad_family', 'campagnolo_db310', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (39, 'pad_family', 'sram_road_axs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (40, 'pad_family', 'sram_road_axs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (41, 'pad_family', 'sram_road_axs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (42, 'pad_family', 'sram_road_axs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (370, 'pad_family', 'sram_road_axs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (371, 'pad_family', 'sram_road_axs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (372, 'pad_family', 'campagnolo_db310', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAMのキャリパー・ブレーキパッドのパッド形状(未登録3件)
-- SRAM公式のパッド識別表で、RED/Force/Rival/Apexの2ピースキャリパーが
-- 同一のパッド(00.5318.024.001など)を使うことを確認済み
-- Level Ultimateのパッドは世代で形状が変わるため、製品名から世代を特定できず未登録のままにする
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (206, 'pad_family', 'sram_road_axs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (211, 'pad_family', 'sram_road_axs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (212, 'pad_family', 'sram_road_axs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
