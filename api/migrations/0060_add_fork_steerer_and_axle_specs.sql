-- 全フレームにフロントフォークの規格(コラム規格・フロントアクスル)を登録する
-- 目的:
--   重量をフレーム＋フロントフォークに統一したのに続き、フォークの規格を全フレームへ登録し、
--   候補表の規格一覧で確認できるようにする。
-- 方針:
--   - front_axle は現行ロードの12x100mmスルーアクスルを基本とする。
--   - steerer_standard は原文に規格の記載があるものを登録する。メーカー独自形状
--     (Cannondale Delta / Giant OverDrive Aero / BMC ICS)はシステム名で表す。
--   - 公式に記載が無い場合は非公式ソース(正規販売店のスペック・ヘッドセットやフォークの
--     適合表)を使い、その旨を出典コメントに書く。どちらにも無い場合は推測せず未登録のまま残す。
--   - TrekのMadone Gen7/Gen8は、公式マニュアルのコラム外径が上28.6mm/下38.8mmで、
--     一般的な1.5インチ(38.1mm)と厳密には一致しない。原文の値を出典コメントに残す。
-- 出典(2026-10-10 調査。メーカー公式の製品ページ・オーナーズマニュアル・テクニカルPDFを
--       原文で確認。公式に径の記載が無い場合は非公式ソースを使い、その旨を記載する):
--   Cervelo Cervelo S5
--     Cervelo公式サポート『Headset 1-1/8" X 1-3/8"』『Front Axle Dimensions 12 X 100MM』(S5 DISC MK4, 2023-)
--   Cannondale Cannondale SuperSix EVO Hi-Mod
--     Cannondale純正Spec文の転載(正規販売店)『12x100mm Syntace thru-axle ... 1-1/8" to 1-1/4" Delta steerer』
--   Trek Trek Madone SLR Gen7
--     Trek公式Service Manual『Upper fork steerer tube OD 28.6mm / Lower 38.8mm』『Front hub OLD 100mm』(Trek E2系。下38.8mmは1.5"=38.1mmとは厳密には不一致)
--   Specialized Specialized Tarmac SL8
--     Specialized公式/Fork行『12x100mm thru-axle』。径は非公式 r2-bike『Fork steerer Ø: Tapered 1 1/2" to 1 1/8"』
--   Giant Giant Propel Advanced SL
--     Giant公式PDF『full-composite OverDrive Aero steerer』『Front & rear 12mm thru-axles』(径の公表なし・D型コラム)
--   Scott Scott Foil RC
--     Scott公式は径の記載なし。非公式 r2-bike『Fork steerer Ø: 1" - 1.5"』は表記が不完全で採用しない。アクスルは非公式情報
--   Wilier Wilier Filante SLR
--     Wilier公式PDF『HEADTUBE 1”1/4 – 1”1/4』『LOWER BEARING FSA MR137』『FRONT FORK O.L.D. 100 mm ... 12X119.5』。コラム外径1-1/4は非公式メディア
--   Pinarello Pinarello Dogma F
--     Pinarello公式『NEW eTICR Onda Fork ForkFlap 1 5 Steerer』『elliptical steering tube ... wider on the bottom and narrower at the top』『12x100 & 12x142』
--   BMC BMC Teammachine R 01
--     BMC公式オーナーズマニュアル『Front: BMC model CTS1048 12x100mm』『Flat steerer tube』(径の公表なし)
--   Merida Merida Scultura
--     Merida公式spec『100x12/142x12mm axle standard』『headset FSA ACR NO.55R』／FSA公式カタログ『NO.55R 1.5"』
--   Colnago Colnago V4Rs
--     Colnago公式『Carbon fork for disc brakes, integrated cables, 1"1/8 section』『Through axles: 12mm length 100mm (front)』
--   Cannondale Cannondale SuperSix EVO Carbon Frameset
--     Cannondale純正Spec文の転載(正規販売店)『12x100mm Syntace thru-axle ... 1-1/8" to 1-1/4" Delta steerer』
--   Trek Trek Madone SLR Gen 8 Frameset
--     Trek公式Service Manual『Fork steerer tube OD Upper 28.6mm Lower 38.8mm』『Hub OLD Front 100mm』
--   Trek Trek Emonda SLR Disc Frameset
--     Trek公式Service Manual『Fork steerer tube OD Upper 28.6mm Lower 38.1mm』『Hub OLD Front 100mm』
--   Specialized Specialized S-Works Aethos Frameset
--     Specialized公式/Fork行『12x100mm thru-axle』。径は出典が無く(ベアリング寸法からの推定のみ)未登録
--   Scott Scott Addict RC Ultimate Frameset
--     非公式 bike24『Axle Standard: 12mm Thru Axle / 100mm』。コラム径は未公表
--   Wilier Wilier Verticale SLR Frameset
--     Wilier公式PDF『HEADTUBE 1”1/4 SPECIAL BEARING』『MR137 FSA BEARING 1-1/4"』『FRONT FORK O.L.D. 100 mm』
--   BMC BMC Teammachine SLR 01 Frameset
--     BMC公式オーナーズマニュアル『Front: BMC model CTS1135 12x100mm』『flat steerer fork』
--   Orbea Orbea Orca OMX Frameset
--     Orbea公式『1-1/8" - 1,5" tappered head tube compatible, Thru axle 12x100mm』
--   Factor Factor OSTRO VAM 2.0 Frameset
--     Factor公式マニュアルに寸法の記載なし。正規販売店『Front axle spacing 12x100 mm thru-axle』(非公式)。コラム径は未登録
--   LOOK LOOK 795 Blade RS 3 Frameset
--     LOOK公式に記載なし。非公式『Axles: 12x100 front / 12x142 rear』。コラム径は未登録
--   Argon 18 Argon 18 Nitrogen Pro Frameset
--     Argon 18公式にアクスル寸法・コラム径の記載なし
--   Basso Basso SV Frame Kit
--     非公式『Thru axles: 100/142mm x 12mm』。Basso公式techページにコラム径の記載なし
--   Winspace Winspace M6 Frameset
--     Winspace公式『Axles: Front M12×P1.0×114L』は100mm間隔の明記がなく未登録。コラム径も未公表
--   Specialized Specialized Tarmac SL9
--     Specialized公式/Fork行『12x100mm thru-axle』。径は出典が無く(SL8との共通部品からの推定のみ)未登録
--   BMC BMC Teammachine SLR 01 Frameset (Gen 5)
--     BMC公式(Teammachine SLR 01 Gen 5)Fork行『12 x 100mm Thru-Axle』『ICS』
--   BMC BMC Teammachine R 01 Frameset (VAR)
--     BMC公式(Teammachine R 01 Frameset)Fork行
--   BMC BMC Teammachine R 01 Frameset (V)
--     BMC公式(Teammachine R 01 Frameset)Fork行
--   Cannondale Cannondale SuperSix EVO Carbon Frameset (Gen 5)
--     Cannondale純正Spec文(純正パーツ販売店)『12x100mm thru-axle ... 1-1/8" to 1-1/4" Delta steerer』
--   Cannondale Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)
--     マイグレーション0059で登録済み（Cannondale公式商品ページのFork行『12x100mm thru-axle ... 1-1/8" to 1-1/4" Delta steerer』）。本マイグレーションの再登録で保持する
--   Cannondale Cannondale SuperSix EVO LAB71 Frameset (Gen 5)
--     マイグレーション0059で登録済み（Cannondale公式商品ページのFork行『12x100mm thru-axle ... 1-1/8" to 1-1/4" Delta steerer』）。本マイグレーションの再登録で保持する
PRAGMA foreign_keys = ON;

-- 1. フロントフォークの規格を登録する(再実行できるよう対象を先に消す)。
DELETE FROM part_specifications
WHERE spec_key IN ('steerer_standard', 'front_axle')
  AND part_id IN (SELECT id FROM parts WHERE category_id = 1);

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, v.column3, v.column4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    (1, 'Cervelo S5', 'steerer_standard', 'tapered_1_1_8_1_3_8'),
    (1, 'Cervelo S5', 'front_axle', '12x100'),
    (2, 'Cannondale SuperSix EVO Hi-Mod', 'steerer_standard', 'cannondale_delta'),
    (2, 'Cannondale SuperSix EVO Hi-Mod', 'front_axle', '12x100'),
    (4, 'Trek Madone SLR Gen7', 'steerer_standard', 'tapered_1_1_8_1_5'),
    (4, 'Trek Madone SLR Gen7', 'front_axle', '12x100'),
    (5, 'Specialized Tarmac SL8', 'steerer_standard', 'tapered_1_1_8_1_5'),
    (5, 'Specialized Tarmac SL8', 'front_axle', '12x100'),
    (7, 'Giant Propel Advanced SL', 'steerer_standard', 'giant_overdrive_aero'),
    (7, 'Giant Propel Advanced SL', 'front_axle', '12x100'),
    (8, 'Scott Foil RC', 'front_axle', '12x100'),
    (9, 'Wilier Filante SLR', 'steerer_standard', 'straight_1_1_4'),
    (9, 'Wilier Filante SLR', 'front_axle', '12x100'),
    (10, 'Pinarello Dogma F', 'steerer_standard', 'tapered_1_1_4_1_1_5'),
    (10, 'Pinarello Dogma F', 'front_axle', '12x100'),
    (11, 'BMC Teammachine R 01', 'steerer_standard', 'bmc_ics'),
    (11, 'BMC Teammachine R 01', 'front_axle', '12x100'),
    (12, 'Merida Scultura', 'steerer_standard', 'tapered_1_1_8_1_5'),
    (12, 'Merida Scultura', 'front_axle', '12x100'),
    (13, 'Colnago V4Rs', 'steerer_standard', 'straight_1_1_8'),
    (13, 'Colnago V4Rs', 'front_axle', '12x100'),
    (2, 'Cannondale SuperSix EVO Carbon Frameset', 'steerer_standard', 'cannondale_delta'),
    (2, 'Cannondale SuperSix EVO Carbon Frameset', 'front_axle', '12x100'),
    (4, 'Trek Madone SLR Gen 8 Frameset', 'steerer_standard', 'tapered_1_1_8_1_5'),
    (4, 'Trek Madone SLR Gen 8 Frameset', 'front_axle', '12x100'),
    (4, 'Trek Emonda SLR Disc Frameset', 'steerer_standard', 'tapered_1_1_8_1_5'),
    (4, 'Trek Emonda SLR Disc Frameset', 'front_axle', '12x100'),
    (5, 'Specialized S-Works Aethos Frameset', 'front_axle', '12x100'),
    (8, 'Scott Addict RC Ultimate Frameset', 'front_axle', '12x100'),
    (9, 'Wilier Verticale SLR Frameset', 'steerer_standard', 'straight_1_1_4'),
    (9, 'Wilier Verticale SLR Frameset', 'front_axle', '12x100'),
    (11, 'BMC Teammachine SLR 01 Frameset', 'steerer_standard', 'bmc_ics'),
    (11, 'BMC Teammachine SLR 01 Frameset', 'front_axle', '12x100'),
    (44, 'Orbea Orca OMX Frameset', 'steerer_standard', 'tapered_1_1_8_1_5'),
    (44, 'Orbea Orca OMX Frameset', 'front_axle', '12x100'),
    (45, 'Factor OSTRO VAM 2.0 Frameset', 'front_axle', '12x100'),
    (35, 'LOOK 795 Blade RS 3 Frameset', 'front_axle', '12x100'),
    (84, 'Basso SV Frame Kit', 'front_axle', '12x100'),
    (5, 'Specialized Tarmac SL9', 'front_axle', '12x100'),
    (11, 'BMC Teammachine SLR 01 Frameset (Gen 5)', 'steerer_standard', 'bmc_ics'),
    (11, 'BMC Teammachine SLR 01 Frameset (Gen 5)', 'front_axle', '12x100'),
    (11, 'BMC Teammachine R 01 Frameset (VAR)', 'steerer_standard', 'bmc_ics'),
    (11, 'BMC Teammachine R 01 Frameset (VAR)', 'front_axle', '12x100'),
    (11, 'BMC Teammachine R 01 Frameset (V)', 'steerer_standard', 'bmc_ics'),
    (11, 'BMC Teammachine R 01 Frameset (V)', 'front_axle', '12x100'),
    (2, 'Cannondale SuperSix EVO Carbon Frameset (Gen 5)', 'steerer_standard', 'cannondale_delta'),
    (2, 'Cannondale SuperSix EVO Carbon Frameset (Gen 5)', 'front_axle', '12x100'),
    (2, 'Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)', 'steerer_standard', 'cannondale_delta'),
    (2, 'Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)', 'front_axle', '12x100'),
    (2, 'Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'steerer_standard', 'cannondale_delta'),
    (2, 'Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'front_axle', '12x100')
) AS v
JOIN parts p
  ON p.brand_id = v.column1 AND p.name = v.column2;
