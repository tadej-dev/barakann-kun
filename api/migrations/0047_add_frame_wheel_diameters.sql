-- フレームのホイール径(wheel_diameter)を登録する
-- 理由:
--   フレーム×ホイールの適合判定(ホイール径)で、フレーム側が未登録だと
--   ホイール選択時に「ホイール径が未確認です」と表示されるため。
-- 出典(2026-10-01 調査):
--   各フレームの出典URLと、ページ上の記載(原文)を下に記す。
--   年式が登録データと異なる出典や、完成車・最大タイヤ幅の記載で確認したものはその旨を併記する。
-- 原文で確認できなかったもの:
--   次の4件は検索結果の要約では700cだったが、出典ページを取得できず原文では未確認。
--   利用者の判断(2026-10-01)で、ほかのフレームと同じ700Cとして登録する。
--     26: BMC Teammachine SLR 01
--     365: Lapierre Xelius DRS Team Replica
--     23: Scott Addict RC Ultimate
--     19: Trek Emonda SLR Disc
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象フレームのホイール径を先に消す。
DELETE FROM part_specifications
WHERE spec_key = 'wheel_diameter'
  AND part_id IN (364, 613, 614, 12, 3, 17, 2, 15, 16, 7, 21, 1, 14, 29, 366, 8, 22, 363, 13, 28, 11, 25, 30, 9, 5, 6, 20, 541, 368, 4, 18, 367, 10, 24, 26, 365, 23, 19);

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Argon 18 Nitrogen Pro: 完成車ページ「Fork [Wheel Size] 700c」 https://www.sigmasports.com/item/Argon-18/Nitrogen-Pro-Dura-Ace-Di2-Road-Bike-2026/15XQ5
    (364, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Argon 18 Sum Pro: 2022年モデル「Wheel Size 700c」 https://geometrygeeks.bike/bike/argon-18-sum-pro-2022-1/
    (613, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Argon 18 Sum: 「700C」 https://www.ridealtitude.com/product/argon-18-sum-road-carbon-frameset-podium-grey-gloss/
    (614, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- BMC Teammachine R 01: 「J. Wheel Size 700c」 https://racycles.com/products/bmc-teammachine-r-01-frameset
    (12, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Bianchi Oltre RC: 「J. Wheel Size 700c」 https://racycles.com/products/bianchi-oltre-rc-frameset-1
    (3, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Bianchi Specialissima RC: 「J. Wheel Size 700c」 https://racycles.com/products/bianchi-specialissima-rc-disc-frameset
    (17, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Cannondale SuperSix EVO Hi-Mod: 公式「Wheel Size 700c」 https://www.cannondale.com/en-us/bikes/road/race/supersix-evo/supersix-evo-hi-mod-frameset/2023
    (2, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Cannondale SuperSix EVO Carbon: 公式「Wheel Size 700c」 https://www.cannondale.com/en/bikes/road/race/supersix-evo/supersix-evo-carbon-frameset
    (15, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Cannondale SystemSix Hi-MOD: 2022年モデル「Wheel Size: 700C」 https://www.theproscloset.com/products/2022-cannondale-systemsix-hi-mod-frameset-l
    (16, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Canyon Aeroad CFR: 2021年モデル「Wheel Size」「700C」 https://geometrygeeks.bike/bike/canyon-aeroad-cfr-2021/
    (7, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Canyon Ultimate CFR: 公式「Wheel Size 28"」(700Cと同規格) https://www.canyon.com/en-co/road-bikes/race-bikes/ultimate/cfr/ultimate-cfr-frameset/3860.html
    (21, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Cervelo S5: 「J. Wheel Size 700c」 https://racycles.com/products/cervelo-s5-frameset-6202
    (1, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Colnago V4Rs: 「J. Wheel Size 700c」 https://racycles.com/products/colnago-v4rs-disc-frameset
    (14, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Factor OSTRO VAM 2.0: 2024年 OSTRO VAM「WHEEL SIZE - 700c」 https://www.all3sports.com/products/factor-2024-ostro-vam-disc-frameset
    (29, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Felt BREED FRD: 「J. Wheel Size 700c」 https://racycles.com/products/felt-breed-frd-frameset-6202
    (366, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Giant Propel Advanced SL: 公式「Q Wheel Size 700C」 https://www.giant-bicycles.com/us/propel-advanced-sl-frameset-2024
    (8, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Giant TCR Advanced SL: 公式「Q Wheel Size 700C」 https://www.giant-bicycles.com/us/tcr-advanced-sl-frameset-2025
    (22, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- LOOK 795 Blade RS 3: 「J. Wheel Size 700c」 https://racycles.com/products/look-795-blade-3-rs-frameset-6202
    (363, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Merida Scultura: 公式「700x30C max. wheelsize」 https://www.merida-bikes.com/en/bike/3219/scultura-frame-kit
    (13, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Orbea Orca OMX: 2024年モデル「700C」 https://geometrygeeks.bike/bike/orbea-orca-omx-2024/
    (28, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Pinarello Dogma F: 「700c」 https://www.excelsports.com/pinarello-dogma-f-disc-frameset
    (11, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Pinarello Dogma X: 「J. Wheel Size 700c」 https://racycles.com/collections/pinarello-bikes/products/pinarello-dogma-x-frameset-7202
    (25, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Ridley Falcn RS: 公式「Max Tire Clearance 700c」 https://www.ridley-bikes.com/en_US/bikes/FFSFRSRID004
    (30, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Scott Foil RC: 2023年 Foil RC Pro「Wheel Size 700C」 https://cyclelimited.com/products/scott-foil-rc-pro-carbon-road-bike-frameset-2023-large
    (9, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Specialized Tarmac SL8: 「Wheel Size 700」 https://www.excelsports.com/specialized-tarmac-sl8-frameset-2025
    (5, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Specialized Tarmac SL7: 2022年モデル「Wheel Size」「700c」 https://geometrygeeks.bike/bike/specialized-tarmac-sl7-2022-1/
    (6, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Specialized S-Works Aethos: 2023年モデル「Wheel Size 700」 https://www.excelsports.com/specialized-s-works-aethos-frameset-2023
    (20, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Specialized Tarmac SL9: 「Tire Clearance: 700c x 32mm」 https://www.performancebike.com/specialized-sworks-tarmac-sl9-frameset-vivid-red-black-white-silver-metallic-74927-0654/p1847983?v=1838516
    (541, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- TIME Alpe d'Huez X: 「J. Wheel Size 700c」 https://racycles.com/products/time-alpe-dhuez-x-frameset
    (368, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Trek Madone SLR Gen7: 「700c」 https://trekbikesflorida.com/products/trek-madone-slr-gen-7-disc-frameset
    (4, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Trek Madone SLR Gen 8: 「Wheel Size 700c」 https://trekbikesflorida.com/products/trek-madone-slr-gen-8-frameset
    (18, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Van Rysel RCR-F Pro: 完成車ページ「J. Wheel Size 700c」 https://racycles.com/products/van-rysel-rcr-f-pro-dura-ace-di2-team-edition-bike
    (367, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Wilier Filante SLR: 「Wheel Size 700c」 https://racycles.com/products/wilier-filante-slr-frameset
    (10, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Wilier Verticale SLR: 「J. Wheel Size 700c」 https://racycles.com/products/wilier-verticale-slr-frameset
    (24, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- BMC Teammachine SLR 01: 原文未確認(利用者の判断で登録)
    (26, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Lapierre Xelius DRS Team Replica: 原文未確認(利用者の判断で登録)
    (365, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Scott Addict RC Ultimate: 原文未確認(利用者の判断で登録)
    (23, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Trek Emonda SLR Disc: 原文未確認(利用者の判断で登録)
    (19, 'wheel_diameter', '700C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
