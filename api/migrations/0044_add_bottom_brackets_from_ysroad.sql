-- ワイズロードのBB一覧から、現行規格のBBを選んで追加する
-- 理由:
--   フレームが要求する規格(bsa/italian/bb86/bb386/bbright/pf30/pf30a/t47系)の選択肢を増やす。
-- 出典:
--   ワイズロード オンライン「BB(ボトムブラケット)の商品一覧」(185件・2026-09-26取得・税込)
--     https://online.ysroad.co.jp/shop/l/l3034/
--     個別商品のBB規格はワイズロードの絞り込み分類と商品名から判別した。
--   重量は一覧・商品ページとも数値の掲載が無いため0(未登録)とする。
-- 選別方針:
--   - スクエアテーパー・MTB専用シェル(BB92/BB107/83mm等)・スペーサー/アダプター・
--     旧規格(NJSトラック、BB-7700/7710、Octalink等)は対象外。
--   - 同一製品の色違い・軸長違いは1件に統合する。
--   - T47はシェル幅が商品名から確定できるもの(85.5mm)だけをt47_85_5へ登録し、
--     幅が不明なもの・86mmのものは誤判定を避けて対象外とした。
--     (Campagnolo Pro-Tech T47 86mmは既存416でt47_85_5としているが、今回は踏襲しない)
--   - bb_standard はフレーム規格と完全一致で判定され、crank_spindle はクランクと一致で判定される。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象を先に消す(いずれも新規追加分)
DELETE FROM part_specifications WHERE part_id BETWEEN 632 AND 673;
DELETE FROM parts WHERE id BETWEEN 632 AND 673;
DELETE FROM brands WHERE id BETWEEN 97 AND 101;

-- 未登録ブランドを追加する
INSERT INTO brands (id, name, created_at, updated_at) VALUES
    (97,  'Wolf Tooth',        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (98,  'Wishbone',          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (99,  'Sugino',            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (100, 'White Industries',  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (101, 'Cane Creek',        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 新規BB (id 632-673)
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES
    (3183,  0, 14, 9, CURRENT_TIMESTAMP, 632, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Shimano BB-RS501 Italian', 'Shimano BB-RS501 Italian Bottom Bracket', NULL, 'イタリアン(36x24・シェル幅70mm)ねじ切り用のボトムブラケット。価格はワイズロード掲載の税込価格。重量は掲載が無いため未登録です'),
    (7150,  0, 72, 9, CURRENT_TIMESTAMP, 633, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN TK877EX ITA', 'TOKEN TK877EX BB ROAD ITA(70) Bottom Bracket', NULL, 'イタリアン(シェル幅70mm)ねじ切り用のボトムブラケット。重量は掲載が無いため未登録です'),
    (7150,  0, 72, 9, CURRENT_TIMESTAMP, 634, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN TK877EX BSA', 'TOKEN TK877EX BB CUP 68/73 Bottom Bracket', NULL, 'BSA(シェル幅68/73mm)ねじ切り用のボトムブラケット。重量は掲載が無いため未登録です'),
    (8250,  0, 72, 9, CURRENT_TIMESTAMP, 635, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN BB29BSA', 'TOKEN BB29BSA DUB Bottom Bracket', NULL, 'BSA(シェル幅68/73mm)ねじ切り用のDUBボトムブラケット。重量は掲載が無いため未登録です'),
    (11000, 0, 72, 9, CURRENT_TIMESTAMP, 636, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN BB46BR29', 'TOKEN BB46BR29 BBRight DUB Bottom Bracket', NULL, 'BBRight(シェル幅79mm)圧入用のDUBボトムブラケット。重量は掲載が無いため未登録です'),
    (8800,  0, 72, 9, CURRENT_TIMESTAMP, 637, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN BB46BR24', 'TOKEN BB46BR24 BBRight Bottom Bracket', NULL, 'BBRight(シェル幅79mm)圧入用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (19800, 0, 72, 9, CURRENT_TIMESTAMP, 638, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN BB47A29-TBT', 'TOKEN BB47A29-TBT T47A DUB Bottom Bracket', NULL, 'T47A(非対称シェル)ねじ切り用のDUBボトムブラケット。重量は掲載が無いため未登録です'),
    (7700,  0, 72, 9, CURRENT_TIMESTAMP, 639, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN BB47A24', 'TOKEN BB47A24 T47A Bottom Bracket', NULL, 'T47A(非対称シェル)ねじ切り用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (7700,  0, 72, 9, CURRENT_TIMESTAMP, 640, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN BB47A386', 'TOKEN BB47A386 T47A Bottom Bracket', NULL, 'T47A(非対称シェル)ねじ切り用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (7150,  0, 72, 9, CURRENT_TIMESTAMP, 641, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN NINJA LITE BB4124PS', 'TOKEN NINJA LITE BB4124PS BB86 Bottom Bracket', NULL, 'BB86(86.5x41)圧入用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (7150,  0, 72, 9, CURRENT_TIMESTAMP, 642, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN TK-BB86R386', 'TOKEN TK-BB86R386 BB86 Bottom Bracket', NULL, 'BB86(86.5x41)圧入用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (7150,  0, 72, 9, CURRENT_TIMESTAMP, 643, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN NINJA LITE BB38624PS', 'TOKEN NINJA LITE BB38624PS BB386 Bottom Bracket', NULL, 'BB386(86.5x46)圧入用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (6050,  0, 72, 9, CURRENT_TIMESTAMP, 644, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN TK-BB386PS', 'TOKEN TK-BB386PS BB386 Bottom Bracket', NULL, 'BB386(86.5x46)圧入用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (8800,  0, 72, 9, CURRENT_TIMESTAMP, 645, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'TOKEN BB841T-46 PF30', 'TOKEN BB841T-46 PF30 Bottom Bracket', NULL, 'PF30(68x46)圧入用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (22770, 0, 97, 9, CURRENT_TIMESTAMP, 646, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Wolf Tooth BSA 24mm', 'Wolf Tooth BSA 24mm Bottom Bracket', NULL, 'BSA(シェル幅68mm)ねじ切り用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (22770, 0, 97, 9, CURRENT_TIMESTAMP, 647, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Wolf Tooth BSA 30mm', 'Wolf Tooth BSA 30mm Bottom Bracket', NULL, 'BSA(シェル幅68mm)ねじ切り用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (22000, 0, 98, 9, CURRENT_TIMESTAMP, 648, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Wishbone T47855-24', 'Wishbone T47855-24 Bottom Bracket', NULL, 'T47(シェル幅85.5mm)ねじ切り用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (22000, 0, 98, 9, CURRENT_TIMESTAMP, 649, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Wishbone T47855-DUB', 'Wishbone T47855-DUB Bottom Bracket', NULL, 'T47(シェル幅85.5mm)ねじ切り用のDUBボトムブラケット。重量は掲載が無いため未登録です'),
    (19800, 0, 98, 9, CURRENT_TIMESTAMP, 650, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Wishbone BSA68GXP', 'Wishbone BSA68GXP Bottom Bracket', NULL, 'BSA(シェル幅68mm)ねじ切り用のGXPボトムブラケット。重量は掲載が無いため未登録です'),
    (22000, 0, 98, 9, CURRENT_TIMESTAMP, 651, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Wishbone BSA30386', 'Wishbone BSA30386 Bottom Bracket', NULL, 'BSA(シェル幅68mm)ねじ切り用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (19800, 0, 98, 9, CURRENT_TIMESTAMP, 652, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Wishbone BB38624', 'Wishbone BB38624 Bottom Bracket', NULL, 'BB386(86.5x46)圧入用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (19800, 0, 98, 9, CURRENT_TIMESTAMP, 653, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Wishbone PF3024', 'Wishbone PF3024 Bottom Bracket', NULL, 'PF30(68x46)圧入用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (19800, 0, 98, 9, CURRENT_TIMESTAMP, 654, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Wishbone PF30A24', 'Wishbone PF30A24 Bottom Bracket', NULL, 'PF30A(シェル幅73mm)圧入用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (19800, 0, 98, 9, CURRENT_TIMESTAMP, 655, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Wishbone BB30A24', 'Wishbone BB30A24 Bottom Bracket', NULL, 'BB30A(シェル幅73mm)圧入用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (19800, 0, 98, 9, CURRENT_TIMESTAMP, 656, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Wishbone BB3024', 'Wishbone BB3024 Bottom Bracket', NULL, 'BB30(68x42)圧入用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (17930, 0, 99, 9, CURRENT_TIMESTAMP, 657, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Sugino PF30A-IDS24', 'Sugino PF30A-IDS24 Bottom Bracket Converter', NULL, 'PF30A(シェル幅73mm)圧入用、24mmクランク用のコンバーター。重量は掲載が無いため未登録です'),
    (17930, 0, 99, 9, CURRENT_TIMESTAMP, 658, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Sugino BB386EVO-IDS24', 'Sugino BB386EVO-IDS24 Bottom Bracket Converter', NULL, 'BB386(86.5x46)圧入用、24mmクランク用のコンバーター。重量は掲載が無いため未登録です'),
    (17930, 0, 99, 9, CURRENT_TIMESTAMP, 659, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Sugino BB30A-IDS24', 'Sugino BB30A-IDS24 Bottom Bracket Converter', NULL, 'BB30A(シェル幅73mm)圧入用、24mmクランク用のコンバーター。重量は掲載が無いため未登録です'),
    (8030,  0, 53, 9, CURRENT_TIMESTAMP, 660, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Praxis Works T47 Integrated Trek', 'Praxis Works T47 Integrated Bottom Bracket (Trek T47)', NULL, 'T47(シェル幅85.5mm)ねじ切り用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (21780, 0, 52, 9, CURRENT_TIMESTAMP, 661, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Rotor PF4630 Steel', 'Rotor PF4630 Steel Bottom Bracket', NULL, 'PF30(68x46)圧入用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (37950, 0, 52, 9, CURRENT_TIMESTAMP, 662, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Rotor BSA30', 'Rotor BSA30 Bottom Bracket', NULL, 'BSA(シェル幅68/73mm)ねじ切り用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (22770, 0, 100, 9, CURRENT_TIMESTAMP, 663, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'White Industries BSA 30mm', 'White Industries BSA 30mm Bottom Bracket', NULL, 'BSA(シェル幅68mm)ねじ切り用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (24860, 0, 101, 9, CURRENT_TIMESTAMP, 664, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Cane Creek Hellbender 70 BSA30', 'Cane Creek Hellbender 70 BSA30 Bottom Bracket', NULL, 'BSA(シェル幅68mm)ねじ切り用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (74800, 0, 94, 9, CURRENT_TIMESTAMP, 665, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'CeramicSpeed BB ALPHA BB86 Shimano', 'CeramicSpeed BB ALPHA for BB86 (Shimano 24mm)', NULL, 'BB86(86.5x41)圧入用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (79860, 0, 94, 9, CURRENT_TIMESTAMP, 666, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'CeramicSpeed BB86 SRAM DUB', 'CeramicSpeed BB86 Bottom Bracket (SRAM DUB)', NULL, 'BB86(86.5x41)圧入用のDUBボトムブラケット。重量は掲載が無いため未登録です'),
    (79860, 0, 94, 9, CURRENT_TIMESTAMP, 667, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'CeramicSpeed PF4630', 'CeramicSpeed PF4630 Bottom Bracket', NULL, 'PF30(68x46)圧入用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (59950, 0, 94, 9, CURRENT_TIMESTAMP, 668, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'CeramicSpeed ITA30', 'CeramicSpeed ITA30 Bottom Bracket', NULL, 'イタリアン(シェル幅70mm)ねじ切り用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (59950, 0, 94, 9, CURRENT_TIMESTAMP, 669, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'CeramicSpeed BSA30', 'CeramicSpeed BSA30 Bottom Bracket', NULL, 'BSA(シェル幅68mm)ねじ切り用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (79860, 0, 94, 9, CURRENT_TIMESTAMP, 670, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'CeramicSpeed EVO386', 'CeramicSpeed BB EVO386 Bottom Bracket (Shimano 24mm)', NULL, 'BB386(86.5x46)圧入用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (9460,  0, 34, 9, CURRENT_TIMESTAMP, 671, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'FSA BB-PF6000', 'FSA BB-PF6000 PF30 Bottom Bracket', NULL, 'PF30(68x46)圧入用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (8140,  0, 34, 9, CURRENT_TIMESTAMP, 672, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'FSA BB-AL86', 'FSA BB-AL86 BB86 Bottom Bracket', NULL, 'BB86(86.5x41)圧入用、24mmクランク用のボトムブラケット。重量は掲載が無いため未登録です'),
    (9900,  0, 41, 9, CURRENT_TIMESTAMP, 673, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Easton BB386/BBRight 30mm', 'Easton BB386/BBRight 30mm Bottom Bracket', NULL, 'BB386(86.5x46)圧入用、30mmクランク用のボトムブラケット。重量は掲載が無いため未登録です');

-- 各製品のBB規格とクランク軸規格
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES
    (632, 'bb_standard', 'italian', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (632, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (633, 'bb_standard', 'italian', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (633, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (634, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (634, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (635, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (635, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (636, 'bb_standard', 'bbright', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (636, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (637, 'bb_standard', 'bbright', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (637, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (638, 'bb_standard', 't47a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (638, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (639, 'bb_standard', 't47a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (639, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (640, 'bb_standard', 't47a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (640, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (641, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (641, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (642, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (642, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (643, 'bb_standard', 'bb386', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (643, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (644, 'bb_standard', 'bb386', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (644, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (645, 'bb_standard', 'pf30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (645, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (646, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (646, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (647, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (647, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (648, 'bb_standard', 't47_85_5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (648, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (649, 'bb_standard', 't47_85_5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (649, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (650, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (650, 'crank_spindle', 'sram_gxp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (651, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (651, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (652, 'bb_standard', 'bb386', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (652, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (653, 'bb_standard', 'pf30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (653, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (654, 'bb_standard', 'pf30a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (654, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (655, 'bb_standard', 'bb30a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (655, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (656, 'bb_standard', 'bb30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (656, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (657, 'bb_standard', 'pf30a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (657, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (658, 'bb_standard', 'bb386', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (658, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (659, 'bb_standard', 'bb30a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (659, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (660, 'bb_standard', 't47_85_5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (660, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (661, 'bb_standard', 'pf30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (661, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (662, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (662, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (663, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (663, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (664, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (664, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (665, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (665, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (666, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (666, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (667, 'bb_standard', 'pf30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (667, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (668, 'bb_standard', 'italian', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (668, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (669, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (669, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (670, 'bb_standard', 'bb386', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (670, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (671, 'bb_standard', 'pf30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (671, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (672, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (672, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (673, 'bb_standard', 'bb386', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (673, 'crank_spindle', 'rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
