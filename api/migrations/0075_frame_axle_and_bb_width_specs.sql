-- フレーム30件の後輪アクスル規格と31件のBBシェル幅を登録する(issue #168)
-- 目的:
--   フレームとホイールのアクスル、フレームとボトムブラケットのシェル幅を
--   適合判定に使えるようにする。front_axle は既存29件を変更せず、新規登録しない
--   (未登録の2件はハブ幅を公式に確認できないため)。
-- 方針:
--   - メーカー公式(製品ページ・スペック表・組立ガイド)を優先する(AGENTS.md)
--   - 数値は原文で照合し、確認日(2026-11-26)と出典URLをコメントに残す
--   - 公式に数値の記載が無い場合は、公式の規格名と規格の定義幅から登録し、
--     その旨を出典コメントに明記する
--   - 既存値を壊さないよう INSERT OR IGNORE にする
--   - 確認できない値は推測で埋めず、末尾に残件として記録する
-- 出典(2026-11-26 確認。2026-11-27 にフレームのアクスル出典を再確認。
-- 原文の引用は各節のコメントに記載):
--   公式(原文を取得して確認):
--     Cervelo S5 テクニカルガイド
--       https://www.cervelo.com/cdn/shop/files/S5_SN170_Technical_Guide.pdf
--       "Rear Thru-Axle Dimensions ... 142 x 12 spacing"
--       "Bottom Bracket Type/Width BBright"
--     Cannondale SuperSix EVO オーナーズマニュアル補足(2023)
--       https://www.cannondale.com/-/media/files/manual-uploads/cy23/151901-rev1-cd-oms-supersix-evo-0223-eng.ashx
--       "Bottom Bracket: Type/Width BSA/68mm - Sleeve required"
--       "Axles: Type/Length FT: Syntace 100mmxM12x1.0P /
--        RR: Syntace 142mmxM12x1.0P"
--     Trek Madone SLR Gen7 Frameset
--       https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/madone-slr/madone-slr-gen-7-disc-frameset/p/37307/
--       "T47 BB, flat mount disc, 142x12mm thru axle"
--       "Madone KVF full carbon ... 12x100mm thru axle"
--     Specialized S-Works Tarmac SL8 Frameset
--       https://www.specialized.com/us/en/s-works-tarmac-sl8-frameset-fact-12r-carbon/p/216956
--       "68mm threaded bottom bracket" / "Threaded BB, 12x142mm thru-axle"
--       "S-Works FACT 12r Carbon, 12x100mm thru-axle"
--     Specialized S-Works Tarmac SL9 Frameset
--       https://www.specialized.com/us/en/s-works-tarmac-sl9-frameset-fact-12r-carbon/p/4293537
--       "Threaded BB, 12x142mm thru-axle" / フォーク "12x100mm thru-axle"
--     Specialized S-Works Aethos Frameset
--       https://www.specialized.com/us/en/s-works-aethos-frameset-fact-12r-carbon/p/199445
--       "Threaded BB, 12x142mm thru-axle" / フォーク "12x100mm thru-axle"
--     Wilier Filante SLR
--       https://www.wilier.com/en/bikes/road/filante-slr
--       "Bottom bracket: MICHE INTEGRALE PRESSFIT 86.5X41"
--       "12x100mm measurements at the front and 12x142mm at the rear"
--     Pinarello Dogma F
--       https://pinarello.com/usa/en/bikes/road/competition/new-dogma-f/dogma-f
--       "Italian BB" / "BOTTOM BRACKET Shimano BB-R9100 ITA"
--       "AXLES DISC NEW MOST Ultra Light Custom Axle 12x100 & 12x142"
--     BMC 日本公式(Teammachine R 01 FRS VAR1)
--       https://e-ftb.co.jp/bmc/lineup/12903/
--       "PF86 Bottom Bracket | Flat Mount Disc | 12x142mm Thru-Axle"
--       "Teammachine R 01 Premium Carbon ... 12x100mm Thru-Axle"
--     BMC 日本公式(Teammachine R 01 FRS V1)
--       https://e-ftb.co.jp/bmc/lineup/12113/
--       上記12903と同じ "PF86 Bottom Bracket" "12x142mm Thru-Axle"
--     BMC 日本公式(Teammachine SLR 01 FRS VAR4 / Gen 5)
--       https://e-ftb.co.jp/bmc/lineup/13102/
--       "Teammachine SLR 01 Gen 5 ... 12 x 142mm Thru-Axle"
--       "Teammachine SLR 01 Gen 5 ... 12 x 100mm Thru-Axle"
--     BMC 日本公式(Teammachine SLR01 MOD、Gen4)
--       https://e-ftb.co.jp/bmc/lineup/9453/
--       "12x142 mm thru-axle" / "PF86 bottom bracket"
--     Colnago V4Rs テクニカルスペック
--       https://www.colnago.com/en-us/premium-bikes/v4rs-bike/technical-specifications
--       "Through axles Diameter: 12 mm. length 100 mm (front) - 142 mm (rear)"
--       "Bottom bracket T47 Shimano with Steel Bearings"
--     Argon 18 Nitrogen / Nitrogen Pro 組立ガイド(2026-05-05)
--       https://storage.googleapis.com/argon18craft/files/Assembly-Guides/2025/NITROGEN_NITROGEN-PRO_Assembly-Guide_383A_384A-B_2026-05-05.pdf
--       "Bottom Bracket Threaded T47, 85.5mm width"
--       "The system must be compatible with a 12mm x 142mm rear thru-axle"
--       "Front Thru Axle M12 x P1.5 x 119mm Axle"
--     Basso SV テックページ
--       https://bassobikes.com/en/sv-tech
--       "The 86.5 mm BB width provides a wide base for the downtube and chainstays"
--     Winspace M6 公式カタログ(製品ページのスペック表画像)
--       https://www.winspace.cc/products/m6
--       "Bottom Bracket Shell T47-85.5"
--       "Axles Front: M12xP1.0x114L / Rear: M12xP1.0x163L"
--       * アクスル全長のみで、ハブ幅(100mm/142mm)の記載は無い
--     Giant Propel Advanced SL Frameset(2026)
--       https://www.giant-bicycles.com/us/propel-advanced-sl-frameset
--       "Advanced SL-grade Composite, 12x142mm thru-axle"
--       "full-composite OverDrive Aero steerer ... 12x100mm thru-axle"
--     Scott Foil RC 公式マニュアル(2022)
--       https://asset-misc.scott-sports.com/Foi/Foil_RC_Manual_A4_2022_Scott-Sports_EN.pdf
--       "Axle Dimensions: Front: 100mm Rear: 142mm"
--     Scott Addict RC 公式マニュアル(2025)
--       https://asset-misc.scott-sports.com/Add/Addict_RC_Manual_A4_2025_Scott-Sports_EN_2194728.pdf
--       "REAR AXLE mm 12 x 142" / "FRONT AXLE mm 12 x 100"
--     Orbea ORCA OMX-OMR 2024 Blue Paper(Orbea公式資料の販売店ミラー)
--       https://velomarket-cska.ru/resources/manuals/Orbea/ORCA_OMX_OMR_2024_BLUEPAPER_EN_ES_DE_FR_IT_14-07-25.pdf
--       "STANDARD REAR DROPOUTS 12x142 mm Speed Release (Thru axle)"
--     Factor OSTRO VAM 製品ページ
--       https://factorbikes.com/bikes/ostro-vam
--       "Rear Axle 12 x 142mm thru-axle" / "Front Axle 12 x 100mm thru-axle"
--     Wilier Verticale SLR 技術資料
--       https://api.wilier.com/media/2634/INTRO_TECNICA_VERTICALE_ENG.pdf
--       "REAR STAYS O.L.D. 142mm" / "FRONT FORK O.L.D. 100 mm"
--     Trek Madone SLR Gen 8 Frameset
--       https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/f/F213/madone-slr-gen-8-frameset/46775/
--       "T47 BB, flat mount disc, UDH, 142x12mm thru axle"
--     Trek Emonda SLR Disc Frameset
--       https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/emonda/emonda-slr/emonda-slr-disc-frameset/p/32772/
--       "flat mount disc, 142x12mm thru axle"
--   既存マイグレーション(0012/0027/0060)で確認済みの出典:
--     Merida Scultura: Merida公式spec "100x12/142x12mm axle standard"、BB86(0012)
--     LOOK 795 Blade RS 3: 非公式 "Axles: 12x100 front / 12x142 rear"(0060)
--   規格幅の定義(bb_shell_width_mm の数値根拠):
--     BSA=68mm、イタリアン=70mm、BB86=86.5mm、BB386=86.5mm、BBRight=79mm、
--     T47/85.5=85.5mm、T47A=77mm
--     既存のボトムブラケット登録(0011/0020/0045)の説明文と一致する
--     CeramicSpeed公式 T47A "asymmetric and 77mm wide"
--       https://ceramicspeed.com/products/bb-alpha-for-t47a-shimano-gravel
-- 数値の確認状況:
--   - rear_axle は31件中30件を12x142で登録する。Winspace M6(539)は
--     公式カタログにアクスル全長(163L)のみでハブ幅142mmの記載が無いため未登録
--   - Giant / Scott / Orbea / Factor / Wilier / Trek Gen8 / Emonda の後輪142mmは、
--     メーカー公式の製品ページ・マニュアル・技術資料で確認した(出典は上記)
--   - Cannondale Gen 5(762-764)は2023年OMSがGen4のため、BSA/68mmと12x142は
--     SuperSix EVO共通の公式仕様として登録する
--   - front_axle は今回新規登録しない。Argon 18(364)は組立ガイドにアクスル全長
--     (119mm)のみ、Winspace M6(539)は公式カタログにアクスル全長(114L)のみで、
--     ハブ幅100mmの記載が無いため未登録とする。既存29件は変更しない
--   - bb_shell_width_mm は、Argon 18(85.5)・Basso(86.5)・Wilier Filante(86.5)・
--     Specialized Tarmac SL8(68)・Cannondale Gen4(68)を除き、フレーム公式ページの
--     BB規格名と上記「規格幅の定義」から登録する
PRAGMA foreign_keys = ON;

-- 1. 後輪アクスル(rear_axle)を31件中30件に登録する
--    型式は既存の front_axle と同じ "12x142" 表記にそろえる
--    Winspace M6(539)はハブ幅142mmを公式で確認できないため登録しない
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, 'rear_axle', v.column2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    (1,   '12x142'),  -- Cervelo S5
    (2,   '12x142'),  -- Cannondale SuperSix EVO Hi-Mod
    (4,   '12x142'),  -- Trek Madone SLR Gen7
    (5,   '12x142'),  -- Specialized Tarmac SL8
    (8,   '12x142'),  -- Giant Propel Advanced SL
    (9,   '12x142'),  -- Scott Foil RC
    (10,  '12x142'),  -- Wilier Filante SLR
    (11,  '12x142'),  -- Pinarello Dogma F
    (12,  '12x142'),  -- BMC Teammachine R 01
    (13,  '12x142'),  -- Merida Scultura
    (14,  '12x142'),  -- Colnago V4Rs
    (15,  '12x142'),  -- Cannondale SuperSix EVO Carbon Frameset
    (18,  '12x142'),  -- Trek Madone SLR Gen 8 Frameset
    (19,  '12x142'),  -- Trek Emonda SLR Disc Frameset
    (20,  '12x142'),  -- Specialized S-Works Aethos Frameset
    (23,  '12x142'),  -- Scott Addict RC Ultimate Frameset
    (24,  '12x142'),  -- Wilier Verticale SLR Frameset
    (26,  '12x142'),  -- BMC Teammachine SLR 01 Frameset
    (28,  '12x142'),  -- Orbea Orca OMX Frameset
    (29,  '12x142'),  -- Factor OSTRO VAM 2.0 Frameset
    (363, '12x142'),  -- LOOK 795 Blade RS 3 Frameset
    (364, '12x142'),  -- Argon 18 Nitrogen Pro Frameset
    (534, '12x142'),  -- Basso SV Frame Kit
    (541, '12x142'),  -- Specialized Tarmac SL9
    (756, '12x142'),  -- BMC Teammachine SLR 01 Frameset (Gen 5)
    (758, '12x142'),  -- BMC Teammachine R 01 Frameset (VAR)
    (759, '12x142'),  -- BMC Teammachine R 01 Frameset (V)
    (762, '12x142'),  -- Cannondale SuperSix EVO Carbon Frameset (Gen 5)
    (763, '12x142'),  -- Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)
    (764, '12x142')   -- Cannondale SuperSix EVO LAB71 Frameset (Gen 5)
) AS v
JOIN parts p ON p.id = v.column1;

-- 2. 前輪アクスル(front_axle)は追加しない
--    既存29件は変更しない(0012/0027/0060の登録を維持する)
--    Argon 18(364)・Winspace M6(539)は次の理由で未登録:
--      Argon 18: 組立ガイドに "Front Thru Axle M12 x P1.5 x 119mm Axle" はあるが、
--                ハブ幅100mmの記載が無い
--      Winspace: 公式カタログに "Front: M12xP1.0x114L" はあるが、
--                ハブ幅100mmの記載が無い
--    アクスル全長だけではハブ幅を決められないため、推測で12x100を登録しない

-- 3. BBシェル幅(bb_shell_width_mm)を全31件に登録する
--    値は既存の bb_standard 登録と規格の定義幅から決める
--    判定は数値比較のため "68" "85.5" "86.5" のように小数第1位まで表記する
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, 'bb_shell_width_mm', v.column2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    (1,   '79'),    -- Cervelo S5: BBright
    (2,   '68'),    -- Cannondale SuperSix EVO Hi-Mod: BSA/68mm(公式)
    (4,   '85.5'),  -- Trek Madone SLR Gen7: T47/85.5
    (5,   '68'),    -- Specialized Tarmac SL8: BSA/68mm(公式)
    (8,   '86.5'),  -- Giant Propel Advanced SL: BB86
    (9,   '86.5'),  -- Scott Foil RC: BB86
    (10,  '86.5'),  -- Wilier Filante SLR: BB86 86.5x41(公式)
    (11,  '70'),    -- Pinarello Dogma F: イタリアン/70mm(公式)
    (12,  '86.5'),  -- BMC Teammachine R 01: PF86
    (13,  '86.5'),  -- Merida Scultura: BB86
    (14,  '85.5'),  -- Colnago V4Rs: T47/85.5
    (15,  '68'),    -- Cannondale SuperSix EVO Carbon Frameset: BSA/68mm(公式)
    (18,  '85.5'),  -- Trek Madone SLR Gen 8 Frameset: T47/85.5
    (19,  '85.5'),  -- Trek Emonda SLR Disc Frameset: T47/85.5
    (20,  '68'),    -- Specialized S-Works Aethos Frameset: BSA/68mm
    (23,  '86.5'),  -- Scott Addict RC Ultimate Frameset: BB86
    (24,  '86.5'),  -- Wilier Verticale SLR Frameset: BB86
    (26,  '86.5'),  -- BMC Teammachine SLR 01 Frameset: PF86
    (28,  '86.5'),  -- Orbea Orca OMX Frameset: BB386
    (29,  '77'),    -- Factor OSTRO VAM 2.0 Frameset: T47A/77mm
    (363, '85.5'),  -- LOOK 795 Blade RS 3 Frameset: T47/85.5
    (364, '85.5'),  -- Argon 18 Nitrogen Pro Frameset: T47/85.5(公式)
    (534, '86.5'),  -- Basso SV Frame Kit: BB86/86.5(公式)
    (539, '85.5'),  -- Winspace M6 Frameset: T47-85.5(公式)
    (541, '68'),    -- Specialized Tarmac SL9: BSA/68mm
    (756, '86.5'),  -- BMC Teammachine SLR 01 Frameset (Gen 5): PF86
    (758, '86.5'),  -- BMC Teammachine R 01 Frameset (VAR): PF86
    (759, '86.5'),  -- BMC Teammachine R 01 Frameset (V): PF86
    (762, '68'),    -- Cannondale SuperSix EVO Carbon Frameset (Gen 5): BSA/68mm
    (763, '68'),    -- Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5): BSA/68mm
    (764, '68')     -- Cannondale SuperSix EVO LAB71 Frameset (Gen 5): BSA/68mm
) AS v
JOIN parts p ON p.id = v.column1;

-- 残件(推測で埋めていない値):
--   - rear_axle: 539 Winspace M6。公式カタログはアクスル全長(163L)のみで、
--     ハブ幅142mmの記載が無い
--   - front_axle: 364 Argon 18 Nitrogen Pro / 539 Winspace M6。アクスル全長
--     (119mm / 114L)のみで、ハブ幅100mmの記載が無い
--   - bb_shell_width_mm: 31件すべて登録した。数値の根拠は上記
--     「数値の確認状況」と「規格幅の定義」のとおり
