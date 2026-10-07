-- CP0018の付属品名を公式名へ修正し、重量を公式値ベースへ見直す
-- T-BarはCanyon公式70mm=0.53lbs(約240g)。中間100mmはやや重いが代表値として240gを採用する
-- DropsはCanyon公式0.42lbs(約191g)。S/Lの別はページ上で単一表記のため代表値として採用する
-- なお0008の「CP0018ドロップ125g / Tバー125g(公式)」の注記は誤りのため上書きする
PRAGMA foreign_keys = ON;

-- Canyon Aeroad CFR (part_id 7): Handlebar→Dropsへ改名、重量は公式値191g
UPDATE part_included_items SET item_name = 'Canyon CP0018 Drops', weight = 191
WHERE part_id = 7 AND included_category_id = 16;
-- Canyon Aeroad CFR (part_id 7): Stem→T-Barへ改名、重量は公式70mm値240g
UPDATE part_included_items SET item_name = 'Canyon CP0018 T-Bar', weight = 240
WHERE part_id = 7 AND included_category_id = 17;

-- Canyon Ultimate CFR (part_id 21): 同上
UPDATE part_included_items SET item_name = 'Canyon CP0018 Drops', weight = 191
WHERE part_id = 21 AND included_category_id = 16;
UPDATE part_included_items SET item_name = 'Canyon CP0018 T-Bar', weight = 240
WHERE part_id = 21 AND included_category_id = 17;
