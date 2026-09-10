-- 未登録だった付属品の実重量を追加登録し、完成重量の加算に反映する
-- 出典はメーカー公称値・販売店掲載値・実測データベース。サイズ依存のため代表値を使用する
PRAGMA foreign_keys = ON;

-- Specialized Tarmac SL8: Tarmacステム155g(100mm、SL7/SL8共通品)
UPDATE part_included_items SET weight = 155
WHERE part_id = 5 AND included_category_id = 17;

-- Cervelo S5: SP20シートポスト241g(350mm/15mm)
UPDATE part_included_items SET weight = 241
WHERE part_id = 1 AND included_category_id = 19;

-- Canyon Aeroad CFR: SP0046シートポスト180g
UPDATE part_included_items SET weight = 180
WHERE part_id = 7 AND included_category_id = 19;

-- LOOK 795 Blade RS: AEROPOST 4シートポスト160g(350mm)
UPDATE part_included_items SET weight = 160
WHERE part_id = 363 AND included_category_id = 19;

-- Winspace M6: シートポスト175g
UPDATE part_included_items SET weight = 175
WHERE part_id = 539 AND included_category_id = 19;

-- Corratec CCT TEAM: カーボンエアロシートポスト200g
UPDATE part_included_items SET weight = 200
WHERE part_id = 537 AND included_category_id = 19;

-- Specialized Tarmac SL9: S-Works Rapide Post 150g(380mm/15mm、フォーラム実測値)
UPDATE part_included_items SET weight = 150
WHERE part_id = 541 AND included_category_id = 19;
