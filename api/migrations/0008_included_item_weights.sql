-- 付属品の実重量を登録し、完成重量の加算に反映する
-- 一体型コックピットはハンドル行へ公称値を集約し、ステム行は0のままにする
-- 重量未調査の付属品は0のまま加算対象外とする
PRAGMA foreign_keys = ON;

-- Basso SV Frame Kit: Fugaハンドル300g(公式)、Piumaシートポスト180g(380mm)
UPDATE part_included_items SET weight = 300
WHERE part_id = 534 AND included_category_id = 16;
UPDATE part_included_items SET weight = 180
WHERE part_id = 534 AND included_category_id = 19;

-- CUBE Litening C:68X: 一体型ユニット450gをハンドル行へ集約
UPDATE part_included_items SET weight = 450
WHERE part_id = 535 AND included_category_id = 16;

-- Cervelo S5: HB19一体型338gをハンドル行へ集約
UPDATE part_included_items SET weight = 338
WHERE part_id = 1 AND included_category_id = 16;

-- Canyon Aeroad CFR: CP0018ドロップ125g / Tバー125g(公式)
UPDATE part_included_items SET weight = 125
WHERE part_id = 7 AND included_category_id = 16;
UPDATE part_included_items SET weight = 125
WHERE part_id = 7 AND included_category_id = 17;

-- Canyon Ultimate CFR: CP0018ドロップ125g / Tバー125g(公式)、SP0064シートポスト70g(公称値)
UPDATE part_included_items SET weight = 125
WHERE part_id = 21 AND included_category_id = 16;
UPDATE part_included_items SET weight = 125
WHERE part_id = 21 AND included_category_id = 17;
UPDATE part_included_items SET weight = 70
WHERE part_id = 21 AND included_category_id = 19;

-- Factor OSTRO VAM: AB02一体型398g(42x110)をハンドル行へ集約、シートポスト198g(0mm)
UPDATE part_included_items SET weight = 398
WHERE part_id = 29 AND included_category_id = 16;
UPDATE part_included_items SET weight = 198
WHERE part_id = 29 AND included_category_id = 19;

-- Specialized Tarmac SL8: シートポスト166g(380mm)
UPDATE part_included_items SET weight = 166
WHERE part_id = 5 AND included_category_id = 19;

-- Argon 18 Nitrogen: シートポスト215g(未カット)
UPDATE part_included_items SET weight = 215
WHERE part_id = 364 AND included_category_id = 19;

-- Lapierre Xelius DRS: シートポスト128g(公称値)
UPDATE part_included_items SET weight = 128
WHERE part_id = 365 AND included_category_id = 19;
