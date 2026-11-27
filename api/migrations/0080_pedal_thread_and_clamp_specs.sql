-- ペダル軸規格(pedal_thread)とレバー・ハンドルのクランプ径(control_clamp_mm)を登録する
-- 目的:
--   ペダルとクランクの軸規格、シフトブレーキレバーとハンドルのレバー取付径を
--   突き合わせて、誤った組み合わせを保存前に検出できるようにする
--   control_clamp_mm はステム側の handlebar_clamp_mm(31.8mm)とは別の規格で、
--   レバー側はバーのクランプ径、ハンドル側はレバー取付部の径を表す
-- 対象:
--   ペダル34件、クランク28件、シフトブレーキレバー13件、ハンドル78件
-- 登録件数(このマイグレーションで登録する件数):
--   ペダル34件、クランク28件、シフトブレーキレバー12件、ハンドル24件
-- 未登録:
--   シフトブレーキレバー1件、ハンドル54件(理由は末尾に記載)
-- 方針:
--   - メーカー公式(製品ページ・技術資料・分解図)を優先する(AGENTS.md)
--   - 公式に軸径・クランプ径の記載が無い場合は販売店・技術解説で確認し、非公式と明記する
--   - 確認できない値は推測で埋めず、末尾の未登録一覧に残す
--   - 既存値を壊さないよう INSERT OR IGNORE にする
-- 確認日: 2026-11-26
--
-- 出典(公式):
--   Shimano 分解図(ペダル軸 B.C.9/16" x 20T.P.I. の記載)
--     PD-R7000  https://dassets.shimano.com/content/dam/global/cg1SHICCycling/final/ev/ev/EV-PD-R7000-4337A.pdf
--     PD-RS500  https://dassets.shimano.com/content/dam/global/cg1SHICCycling/final/ev/ev/EV-PD-RS500-4555.pdf
--     PD-R8000  https://dassets.shimano.com/content/dam/global/cg1SHICCycling/final/ev/ev/EV-PD-R8000-4232.pdf
--     PD-R9100  https://dassets.shimano.com/content/dam/global/cg1SHICCycling/final/ev/ev/EV-PD-R9100-4056A.pdf
--     PD-R550   https://dassets.shimano.com/content/dam/global/cg1SHICCycling/final/ev/ev/EV-PD-R550-3555.pdf
--   Shimano 分解図(レバーのクランプバンド径 23.8 - 24.2 mm の記載)
--     ST-R9270  https://dassets.shimano.com/content/dam/global/cg1SHICCycling/final/ev/ev/EV-ST-R9270-4819.pdf
--     ST-R8170  https://dassets.shimano.com/content/dam/global/cg1SHICCycling/final/ev/ev/EV-ST-R8170-4866.pdf
--     ST-R7170  https://dassets.shimano.com/content/dam/global/cg1SHICCycling/final/ev/ev/EV-ST-R7170-4928.pdf
--     ST-R7120  https://dassets.shimano.com/content/dam/global/cg1SHICCycling/final/ev/ev/EV-ST-R7120-5035.pdf
--     ST-RX825  https://dassets.shimano.com/content/dam/global/cg1SHICCycling/final/ev/ev/EV-ST-RX825-5053.pdf
--     ST-RX820  https://dassets.shimano.com/content/dam/global/cg1SHICCycling/final/ev/ev/EV-ST-RX820-5009.pdf
--   Shimano クランク ディーラーマニュアル(左右ねじ・ペダル取付の記載)
--     https://si.shimano.com/en/pdfs/dm/RAFC010/DM-RAFC010-05-ENG.pdf
--   SRAM / TIME 公式スペック(Threading 9/16 - 20 inch の記載)
--     XPRO 10      https://www.sram.com/en/time-sport/models/pd-xpro-10-c1
--     XPRO 12      https://www.sram.com/en/time-sport/models/pd-xpro-12-c1
--     XPRO 12 SL   https://www.sram.com/en/time-sport/models/pd-xpro-12sl-c1
--   SRAM 2024 Road Frame Fit Specifications(全ロード用シフトブレーキレバー Ø23.8-24.2 mm)
--     https://www.sram.com/globalassets/document-hierarchy/frame-fit-specifications/road/2024-road-frame-fit-specifications.pdf
--     p.100 "Dropbar Guidelines All Road Shift-Brakes and Brake Levers Ø23.8-24.2 mm"
--   Campagnolo 技術マニュアル(レバー取付部の直径 23.8 - 24.2 mm の記載)
--     機械式 12s/13s
--       https://www.campagnolo.com/on/demandware.static/-/Library-Sites-campagnoloLibrary/default/dw31541667/pdf/Technical%20manual%20-%20Mechanical%20units%20ergopower%2012s_13s%20commands%20-%20Campagnolo_Rev01_02_24.pdf
--     Super Record Wireless
--       https://media.campagnolo.com/seecommerce/original/C-CL-SUPER-RECORD-DB-12S-TM6EN
--
-- 出典(非公式: 販売店・仕様集約・業界標準):
--   Sheldon Brown ハンドル寸法表(31.8mmステムクランプのドロップバーはレバー取付部23.8mm)
--     https://sheldonbrown.com/cribsheet-handlebars.html
--     "31.8 mm 1 1/4" 23.8 mm 15/16" Road oversized"
--     標準的な丸型ドロップバーのレバー取付部は非公式(業界標準23.8)として登録する
--   LOOK KEO Blade Carbon 9/16 (365cycles 商品仕様)
--     https://365cycles.com/products/look-keo-blade-carbon-pedals-clipless-pedals-with-cleats-pedl3289-bicycle-pedals
--   Wahoo SPEEDPLAY COMP 9/16 (Wheel & Sprocket 商品仕様)
--     https://outlet.wheelandsprocket.com/products/850010131382
--   Shimano PD-M520 9/16 (mybikething 商品仕様)
--     https://mybikething.com/home/product/shimano-pd-m520-spd-clipless-pedals-9-16-dual-entry/
--   Crankbrothers Candy 1 9/16 (Colorado Cyclist 商品仕様)
--     https://www.coloradocyclist.com/products/crankbrothers-candy-1-pedals-dual-sided-clipless-composite-9-16-black
--   Favero Assioma DUO 9/16 (BIKE24 商品仕様)
--     https://www.bike24.com/p2347605.html
--   Garmin Rally 9/16 (Worldwide Cyclery 商品仕様。Rally XCの掲載だが同シリーズ共通)
--     https://www.worldwidecyclery.com/products/garmin-rally-xc210-power-meter-pedals-dual-sided-clipless-alloy-9-16-black-pair-dual-sensing-shimano-spd
--   軸径の記載が無いメーカーの公式ページ・取扱説明書は左右ねじのみのため、
--   クランク側の9/16×20TPIは上記の標準規格と公式のペダル軸規格から確認した
--   Magene P715は公式ページ・販売店仕様に軸径の記載が無いため、
--   9/16×20TPIの標準規格として登録する(非公式)
--
PRAGMA foreign_keys = ON;

-- ペダル軸規格(9/16インチ×20TPI)
-- 対象: 180-201, 523-532, 552-553 の34件
-- 例外の1/2インチ軸は対象製品に無い
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano(公式の分解図で確認)
    (180, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (181, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (182, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (187, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (188, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (189, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (552, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- TIME(公式スペックで確認)
    (186, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (523, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (524, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- LOOK(販売店仕様で確認・非公式)
    (183, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (190, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (191, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (192, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (525, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (526, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Wahoo(販売店仕様で確認・非公式)
    (184, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (193, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (194, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (195, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (196, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (197, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Favero(BIKE24の仕様で9/16を確認。公式ページは軸径の記載が無い・非公式)
    (185, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (198, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (199, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (531, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (532, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Garmin(公式マニュアルは左右ねじのみ。Worldwide Cycleryの仕様で9/16を確認・非公式)
    (200, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (201, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (529, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (530, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Magene(公式ページに軸径の記載が無いため標準規格として登録・非公式)
    (527, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (528, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Crankbrothers(公式ページは標準スピンドルのみ。販売店仕様で9/16を確認・非公式)
    (553, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- クランクのペダル軸規格(9/16インチ×20TPI)
-- 対象: 160-179, 388-395 の28件
-- クランク単体の軸径は各社公式に記載が無いが、受けるペダル軸の規格は共通のため
-- Shimano公式のペダル軸規格(9/16×20TPI)と標準規格で確認した
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano
    (160, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (161, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (162, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (167, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (168, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (169, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (170, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (394, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM
    (163, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (164, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (171, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (172, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (173, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (174, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (391, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (392, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo
    (166, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (175, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (176, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (393, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Rotor
    (177, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (178, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (395, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- FSA
    (165, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Praxis Works
    (179, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- microSHIFT
    (388, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Magene
    (389, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (390, 'pedal_thread', '9_16_20tpi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- シフトブレーキレバーのバークランプ径
-- 対象: 340-347, 375-378 の12件(374を除く)
-- 公式のクランプバンド径は23.8 - 24.2 mmの範囲
-- Shimano/Campagnoloは23.8、SRAMは範囲の代表値24として登録する
-- microSHIFT Sword SB-G7020(374)は径の記載が無いため未登録
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano(公式の分解図に23.8 - 24.2 mmの記載)
    (340, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (341, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (342, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (343, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (375, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (376, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM(公式の対応範囲23.8 - 24.2 mmの代表値24)
    (344, 'control_clamp_mm', '24', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (345, 'control_clamp_mm', '24', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (346, 'control_clamp_mm', '24', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (377, 'control_clamp_mm', '24', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo(公式の技術マニュアルに23.8 - 24.2 mmの記載)
    (347, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (378, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ハンドルのレバー取付部の径
-- 対象: 標準的な丸型ドロップバー24件(48-51, 53, 58-60, 63-66, 68, 70-73, 76-79, 81, 84, 485)
-- メーカー公式はステム側31.8mmのみの記載のため、レバー取付部は
-- 非公式(業界標準23.8)として登録する(Sheldon Brownの寸法表)
-- 一体型ハンドル、エアロ形状・独自形状でレバー取付部が特殊なもの、
-- 23.8以外の値を公表しているものは未登録(理由は末尾に記載)
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (48, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (49, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (50, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (51, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (53, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (58, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (59, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (60, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (63, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (64, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (65, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (66, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (68, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (70, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (71, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (72, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (73, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (76, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (77, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (78, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (79, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (81, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (84, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (485, 'control_clamp_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 未登録(確認できなかった値)
--   シフトブレーキレバー:
--     374 microSHIFT Sword SB-G7020
--       公式製品ページ・取付説明書(SH006-002)にクランプ径の記載が無い
--   ハンドル(レバー取付部の径が未公表のもの・54件):
--     一体型ハンドル(35件):
--       87, 88, 89, 90, 91, 92, 483, 484, 489, 490, 546, 589-611, 615
--       公式ページはステム側31.8mmのみ。レバー取付部が独自形状の可能性があり径が不明
--     エアロ形状・独自形状の単体バー(19件):
--       52, 54, 55, 56, 57, 61, 62, 67, 69, 74, 75, 80, 82, 83, 85, 86, 486, 487, 488
--       トップがエアロ・偏平・独自形状で、レバー取付部の径の公表が無い
