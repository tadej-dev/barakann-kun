-- フレーム付属品に残っていた重量0を解消する
-- 方針(利用者の指定 2026-10-05):
--   フレーム登録では 0 を値として登録しない。重量の出典が見つからない場合は
--   限界まで調査し、それでも見つからない付属品は登録しない(行を削除する)。
-- 出典(2026-10-05 調査):
--   Cannondale C1 40 Aero Carbon Seatpost = 165g(330mm)
--     https://www.bike24.com/p2965397.html
--     https://www.cycleedges.com/product/cannondale-c1-40-aero-seatpost-0mm-offset/
--   出典が見つからなかったため登録しないもの:
--     専用シートポスト: BMC(Gen5 / D-Shape / Roadmachine)、De Rosa Merak、CUBE Litening C:68X、
--       FOCUS、X-LAB AD9、Pardus Robin EVO、Argon 18 SUM / SUM Pro、Van Rysel RCR-F、
--       Cannondale C1 Aero 40 V2(Ti)
--     一体型コックピットのステム行(重量はハンドル行に含めて計上していたもの)と、
--     重量非公表のハンドル、Corratec 専用BB
PRAGMA foreign_keys = ON;

-- 1) 判明した重量を登録する
UPDATE part_included_items
SET weight = 165, updated_at = CURRENT_TIMESTAMP
WHERE item_name = 'Cannondale C1 Aero 40 Carbon Seatpost'
  AND part_id IN (
    SELECT id FROM parts WHERE brand_id = 2 AND name = 'Cannondale SuperSix EVO Carbon Frameset (Gen 5)'
  );

-- 2) 重量が見つからないフレーム付属品(0)を行ごと削除する(0を登録しない方針のため)
DELETE FROM part_included_items
WHERE weight = 0
  AND part_id IN (SELECT id FROM parts WHERE category_id = 1);
