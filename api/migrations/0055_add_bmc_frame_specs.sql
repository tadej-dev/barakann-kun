-- BMC フレームに不足していた規格(ブレーキマウント・コックピット接続方式・コックピットシステム)を登録する
-- 理由:
--   登録済みの BMC フレーム7件を監査したところ、brake_mount が全7件、
--   cockpit_connection が5件、cockpit_system が5件、cockpit_replaceable が未登録だった。
--   未登録のままだと、ブレーキキャリパー・ハンドル・ステムの適合判定が
--   「規格未確認」になり候補を選べない(shared/part-compatibility-core.ts)。
-- 出典(2026-10-06 調査。規格値は各ページの原文で確認):
--   [BMC Switzerland 日本公式Webサイト 商品ページのテクニカルデータ]
--     Teammachine SLR01 FRS VAR4 (id 756) https://e-ftb.co.jp/bmc/lineup/13102/
--       Frame: "Teammachine SLR 01 Gen 5 | ... | Flat Mount Disc | 12 x 142mm Thru-Axle"
--       Fork : "Teammachine SLR 01 Gen 5 | ... | Flat Mount Disc | 12 x 100mm Thru-Axle"
--       ハンドル: "別売 / ICS2 ステム (アルミステム) ＋ お好きなハンドルバー(ケーブル内蔵タイプ)
--                 / ICS カーボン EVO / ICS カーボン AERO が使用可能です。"
--     Teammachine SLR01 MOD V1 (id 757) https://e-ftb.co.jp/bmc/lineup/9453/
--       フレーム: "Teammachine SLR 01 Premium Carbon ... 12x142 mm thru-axle"
--       フォーク: "Teammachine SLR 01 Premium Carbon ... Flat mount disc | 12x100 mm thru-axle"
--       ブレーキ: "Flat mount disc" / ハンドル・ステム: "ICS Carbon, One-Piece Full Carbon Cockpit"
--     Teammachine R 01 FRS VAR1 (id 758) https://e-ftb.co.jp/bmc/lineup/12903/
--     Teammachine R 01 FRS V1   (id 759) https://e-ftb.co.jp/bmc/lineup/12113/
--       Frame: "Teammachine R 01 Premium Carbon ... | PF86 Bottom Bracket | Flat Mount Disc | 12x142mm Thru-Axle"
--       Fork : "Teammachine R 01 Premium Carbon | ... | Flat Mount Disc | 12x100mm Thru-Axle"
--       ハンドル: "別売 / ICS2 ステム (アルミステム) ＋ お好きなハンドルバー(ケーブル内蔵タイプ)
--                 / ICS カーボン EVO / ICS カーボン AERO が使用可能です。"
--     Roadmachine FRS V2 (id 761) https://e-ftb.co.jp/bmc/lineup/10504/
--       フレーム: "Roadmachine Premium Carbon ... Flat mount disc | 12x142 mm thru-axle"
--       フォーク: "Roadmachine Premium Carbon ... Flat mount disc | 12x100 mm thru-axle"
--     Teammachine R 01 (id 12) / Teammachine SLR 01 Frameset (id 26) は
--       上記 R 01 / SLR01 と同系列のフレームのため、同じページの "Flat Mount Disc" を出典とする
--       (id 26 は世代を問わず Gen4=9453 / Gen5=13102 のどちらも flat mount disc)。
--   [コックピット接続方式(一体型とステム式の別)]
--     上記 13102 / 12903 / 12113 の "ハンドル" 欄: ICS2 ステム + ハンドルバー と
--       ICS カーボン EVO / AERO の両方が使用可能 → either
--     MY21 Teammachine SLR01 のトップコーン(ICS2 ステムと ICS Carbon コックピットの両方に対応):
--       https://revolutionbikeshop.com/product_images/uploaded_images/2024-bmc-teammachine-slr-five-black-white-2.pdf
--       "Topcones that feature #1 and #2 indentations ... are designed to fit ICS2 stems
--        and ICS Carbon cockpits on MY21 Teammachine SLR01 frames."
--       (id 757 は SLR01 Gen4。9453 は完成車画像だが、フレームは同世代)
--   [コックピットシステム(Deda DCR)]
--     Deda Elementi "DEDA DCR & BIKE BRANDS COMPATIBILITY - MY2024" (2024-09-09 版)
--       https://dedaelementi.com/media/wysiwyg/dcr-tech/DCR-DedaDCR_Compatible-bicycle-models_09092024.pdf
--       ・BMC Teammachine SLR 01 : SUPERBOX / ALANERA RS / ALANERA / VINCI いずれも Y
--         (アダプター YHDRS-BMC / YHDALADCRTCBMC、"Internal cables routing")
--       ・BMC Roadmachine 01 2021: 同上
--       ・BMC の記載は Teammachine SLR 01 / Roadmachine 01 2021 / Roadmachine X TWO /
--         Timemachine Road 01 / URS / KAIUS のみ。
--   [ICS2 ステムと一体型の対応車種(接続方式の補強)]
--     https://www.bike24.com/p2830806.html (ICS2 Carbon EVO Handlebar / Stem Unit)
--       "Suitable for: BMC Teammachine SLR01 / SLR - 2021+, BMC Roadmachine 01 - 2020+ ..."
-- 方針・注意:
--   - トークンは既存登録と同じものを使う(flat_mount / either / deda_dcr / true)。
--   - cockpit_system(deda_dcr)は、Deda の互換表に記載のある 2 件(SLR01 Gen4・Roadmachine Gen2)だけに登録する。
--     Teammachine SLR01 Gen5(id 756)と Teammachine R 01(id 758/759)は互換表に記載が無く、
--     出典が確認できないため未登録のままとする(推測で埋めない)。
--   - id 757 は一体型コックピット(ICS Carbon)を同梱し、DCR 規格のサードパーティ製コックピットへ
--     交換できるため cockpit_replaceable='true' とする(0023 と同じ扱い)。
--   - seatpost_diameter_mm / handlebar_clamp_mm は、専用 D シェイプ/エアロ形状のシートポストと
--     一体型コックピットのため径の出典が無く未登録とする(0051/0053 の Cannondale と同じ扱い)。
--     また BMC は「専用ステムにハンドルを付ける」構成ではないため、フレーム側の handlebar_clamp_mm は
--     判定に使われない(shared/part-compatibility-core.ts の compareCockpitParts)。
PRAGMA foreign_keys = ON;

-- 1) ブレーキマウント(全7件)
--    再実行しても重複しないよう対象を先に消す。
DELETE FROM part_specifications
WHERE spec_key = 'brake_mount'
  AND part_id IN (SELECT id FROM parts WHERE category_id = 1 AND brand_id = 11);

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT id, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM parts
WHERE category_id = 1 AND brand_id = 11;

-- 2) コックピット接続方式(未登録だった5件)
DELETE FROM part_specifications
WHERE spec_key = 'cockpit_connection'
  AND part_id IN (
    SELECT id FROM parts
    WHERE category_id = 1
      AND brand_id = 11
      AND name IN (
        'BMC Teammachine SLR 01 Frameset (Gen 5)',
        'BMC Teammachine SLR01 MOD Frameset',
        'BMC Teammachine R 01 Frameset (VAR)',
        'BMC Teammachine R 01 Frameset (V)',
        'BMC Roadmachine FRS Frameset'
      )
  );

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, 'cockpit_connection', v.column2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    -- Gen5 SLR01 / R 01: ICS2 ステム + ハンドルバー、ICS カーボン EVO / AERO の両方が可能
    ('BMC Teammachine SLR 01 Frameset (Gen 5)', 'either'),
    -- Gen4 SLR01(MOD): ICS2 ステムと ICS Carbon 一体型の両方が可能
    ('BMC Teammachine SLR01 MOD Frameset',      'either'),
    ('BMC Teammachine R 01 Frameset (VAR)',     'either'),
    ('BMC Teammachine R 01 Frameset (V)',       'either'),
    -- Roadmachine Gen2: ICS2 ステム(BIKE24 の対応車種 "Roadmachine 01 - 2020+")と
    -- Deda DCR の一体型(互換表の ALANERA / VINCI)の両方が可能
    ('BMC Roadmachine FRS Frameset',            'either')
) AS v
JOIN parts p
  ON p.brand_id = 11 AND p.category_id = 1 AND p.name = v.column1;

-- 3) コックピットシステム(出典のある2件のみ)
DELETE FROM part_specifications
WHERE spec_key = 'cockpit_system'
  AND part_id IN (
    SELECT id FROM parts
    WHERE category_id = 1
      AND brand_id = 11
      AND name IN ('BMC Teammachine SLR01 MOD Frameset', 'BMC Roadmachine FRS Frameset')
  );

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, 'cockpit_system', 'deda_dcr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM parts p
WHERE p.brand_id = 11
  AND p.category_id = 1
  AND p.name IN ('BMC Teammachine SLR01 MOD Frameset', 'BMC Roadmachine FRS Frameset');

-- 4) コックピット交換可否(一体型コックピットを同梱する id 757 のみ)
DELETE FROM part_specifications
WHERE spec_key = 'cockpit_replaceable'
  AND part_id IN (
    SELECT id FROM parts
    WHERE category_id = 1 AND brand_id = 11 AND name = 'BMC Teammachine SLR01 MOD Frameset'
  );

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT id, 'cockpit_replaceable', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM parts
WHERE brand_id = 11 AND category_id = 1 AND name = 'BMC Teammachine SLR01 MOD Frameset';
