-- SHIMANO Di2コンポセット(Dura-Ace R9270・Ultegra R8170・105 R7170)の構成品を登録する
-- 理由:
--   選択済みパーツ表の占有行へ、構成品の型番・重量・参考価格を表示するため。
-- 出典:
--   STAR BIKES「SHIMANO Di2 コンポーネント 価格・重量比較」(2025年11月時点・税込価格)
--   https://www.star-bikes.jp/?p=22165
-- 登録方針:
--   - is_set_component = 1 とし、重量・価格はセット本体に含まれる扱いで合計へ加算しない。
--   - 価格は上記ページの税込価格。メーカー希望小売価格か店頭価格かは明記が無いため「参考価格」として扱う。
--   - シフトレバーは左右1組の重量。価格はレバーとキャリパーを組み合わせた
--     Jキット(右前・左後)の合計しか掲載が無いため、レバー行へJキット合計を載せ、キャリパーは価格なし(NULL)にする。
--   - キャリパーは前後で別の行に表示されるため、掲載の「前後分」の重量を2で割った1個分で登録する。
--   - クランクの重量は掲載の50/34T、価格は52×36Tの値(掲載の組み合わせのまま)。
--   - 105 機械式(R7120)とGRXは出典に掲載が無いため、今回は登録しない。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象セットのセット構成品を先に消す。
DELETE FROM part_included_items
WHERE part_id IN (31, 32, 33)
  AND is_set_component = 1;

-- Dura-Ace R9270 Di2 Disc Groupset(id 31)
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (31, 'ST-R9270（左右）',   1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 350, 177226, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (31, 'BR-R9270',           1, (SELECT id FROM categories WHERE key = 'brake_caliper'),      97, NULL,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (31, 'FC-R9200 170mm',     1, (SELECT id FROM categories WHERE key = 'crankset'),          685, 79195,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (31, 'FD-R9250',           1, (SELECT id FROM categories WHERE key = 'front_derailleur'),   96, 56165,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (31, 'RD-R9250',           1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   215, 101976, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (31, 'CS-R9200 11-34T',    1, (SELECT id FROM categories WHERE key = 'cassette'),          253, 45157,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (31, 'CN-M9100',           1, (SELECT id FROM categories WHERE key = 'chain'),             242, 8452,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Ultegra R8170 Di2 Disc Groupset(id 32)
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (32, 'ST-R8170（左右）',   1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 391, 123375, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (32, 'BR-R8170',           1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     123, NULL,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (32, 'FC-R8100 170mm',     1, (SELECT id FROM categories WHERE key = 'crankset'),          700, 39745,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (32, 'FD-R8150',           1, (SELECT id FROM categories WHERE key = 'front_derailleur'),  110, 32219,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (32, 'RD-R8150',           1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   262, 51565,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (32, 'CS-R8101 11-34T',    1, (SELECT id FROM categories WHERE key = 'cassette'),          345, 14081,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (32, 'CN-M8100',           1, (SELECT id FROM categories WHERE key = 'chain'),             252, 5554,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 105 R7170 Di2 Disc Groupset(id 33)
INSERT INTO part_included_items
    (part_id, item_name, quantity, included_category_id, weight, price, is_set_component, created_at, updated_at)
VALUES
    (33, 'ST-R7170（左右）',   1, (SELECT id FROM categories WHERE key = 'shift_brake_lever'), 423, 93654,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (33, 'BR-R7170',           1, (SELECT id FROM categories WHERE key = 'brake_caliper'),     123, NULL,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (33, 'FC-R7100 170mm',     1, (SELECT id FROM categories WHERE key = 'crankset'),          754, 23494,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (33, 'FD-R7150',           1, (SELECT id FROM categories WHERE key = 'front_derailleur'),  142, 19424,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (33, 'RD-R7150',           1, (SELECT id FROM categories WHERE key = 'rear_derailleur'),   302, 35363,  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (33, 'CS-R7101 11-34T',    1, (SELECT id FROM categories WHERE key = 'cassette'),          361, 8785,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (33, 'CN-M7100',           1, (SELECT id FROM categories WHERE key = 'chain'),             252, 4005,   1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
