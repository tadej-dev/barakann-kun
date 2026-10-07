-- ボトムブラケットを増やす: フレームが要求する規格に対してBBが無い4規格を埋め、主要規格を厚くする
-- 理由:
--   フレームのbb_standardには t47a(2台)・italian(2台)・pf30a(1台)・bbright(1台) があるが、
--   一致するBBが1つも無く、これらのフレームではBBを選択できなかった。
--   bb386(3台)・t47_85_5(8台)・bb86(22台)・bsa(6台)も選択肢を増やす。
-- 出典:
--   Shimano: バイシクル デジタルカタログ ロード 価格表(更新日 2026-08-07・税込・平均重量)
--     https://set.shimano.co.jp/bc_catalog/road-pl.xlsx
--     BB-R9100 スレッド BSA 68mm 65g ¥5,984 / イタリアン 70mm 65g ¥5,984
--     SM-BBR60 イタリアン 70mm 77g ¥3,097
--   SRAM: 株式会社Many'S(メニーズ) SRAM ROAD Bottom Bracket 一覧(2026-09-26取得・税込)
--     https://manys.work/sram-road/sram_road_category/bb/
--     DUB Italian 70mm ¥6,500 / DUB PF30A 73mm ¥8,590 / DUB BBRight 79mm ¥8,590 / DUB T47 68mm ¥8,590
--     重量は代理店が公表していないため0(未公表)とする。
--   Campagnolo: BRANDS OF NICHINAO 価格表(2025.12.1更新・税込)と公式Pro-Tech BB仕様
--     https://nichinao.jp/wp/wp-content/uploads/2025/06/campagnolo_20251201_WRL12s.pdf
--     スレッド ITA/ENG ¥7,150 / T47X68・T47X86 ¥8,580 / T47A ¥8,360 /
--     BB30 68X42・PF30 68X46・BB RIGHT 79x46・BB86 86.5X41・BB386 86.5X46 各¥7,150
--     重量: https://www.campagnolo.com/jp-ja/pro-tech%E2%84%A2-bottom-bracket/CCUEKAR1X13S.html (50g)
--   Chris King: ミズタニ自転車(国内正規代理店) ThreadFit T47A 30(2026-09-26取得・税込)
--     https://www.mizutanibike.co.jp/products/detail/2258/
--     スチール ¥40,700 (セラミック ¥61,600)。T47A(BB-Rightシェル)・30mm/DUBスピンドル用。重量は未公表。
-- 登録方針:
--   - bb_standard はフレームと完全一致で判定されるため、製品が対応する規格値をそのまま登録する。
--   - crank_spindle が複数に跨る製品はカンマ区切りで登録する(判定側はカンマ分割で一致を見る)。
--   - 公表されていない重量は0のまま残し、推測で埋めない。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象を先に消す(いずれも新規追加分)
DELETE FROM part_specifications WHERE part_id BETWEEN 616 AND 631;
DELETE FROM parts WHERE id BETWEEN 616 AND 631;
DELETE FROM brands WHERE id = 96;

-- Chris King は未登録ブランドのため追加する
INSERT INTO brands (id, name, created_at, updated_at) VALUES (96, 'Chris King', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 新規BB (id 616-631)
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES
    -- Shimano(24mm HOLLOWTECH II用)
    (5984,  65, 14, 9, CURRENT_TIMESTAMP, 616, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Shimano BB-R9100 BSA', 'Shimano BB-R9100 BSA Bottom Bracket', NULL, 'BSA(BC1.37・シェル幅68mm)ねじ切り用のボトムブラケット。重量はメーカー公表値です'),
    (5984,  65, 14, 9, CURRENT_TIMESTAMP, 617, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Shimano BB-R9100 Italian', 'Shimano BB-R9100 Italian Bottom Bracket', NULL, 'イタリアン(36x24・シェル幅70mm)ねじ切り用のボトムブラケット。重量はメーカー公表値です'),
    (3097,  77, 14, 9, CURRENT_TIMESTAMP, 618, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Shimano SM-BBR60', 'Shimano SM-BBR60 Italian Bottom Bracket', NULL, 'イタリアン(36x24・シェル幅70mm)ねじ切り用のボトムブラケット。重量はメーカー公表値です'),
    -- SRAM(DUB用)
    (6500,   0, 33, 9, CURRENT_TIMESTAMP, 619, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'SRAM DUB Italian 70mm', 'SRAM DUB Italian 70mm Bottom Bracket', NULL, 'イタリアン(シェル幅70mm)ねじ切り用のDUBボトムブラケット。重量は代理店非公表です'),
    (8590,   0, 33, 9, CURRENT_TIMESTAMP, 620, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'SRAM DUB PF30A 73mm', 'SRAM DUB PF30A 73mm Bottom Bracket', NULL, 'PF30A(シェル幅73mm)圧入用のDUBボトムブラケット。重量は代理店非公表です'),
    (8590,   0, 33, 9, CURRENT_TIMESTAMP, 621, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'SRAM DUB BBRight 79mm', 'SRAM DUB BBRight 79mm Bottom Bracket', NULL, 'BBRight(シェル幅79mm)圧入用のDUBボトムブラケット。重量は代理店非公表です'),
    (8590,   0, 33, 9, CURRENT_TIMESTAMP, 622, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'SRAM DUB T47 68mm', 'SRAM DUB T47 68mm Bottom Bracket', NULL, 'T47(シェル幅68mm)ねじ切り用のDUBボトムブラケット。重量は代理店非公表です'),
    -- Campagnolo(Pro-Techクランク用)
    (7150,  50, 28, 9, CURRENT_TIMESTAMP, 623, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Campagnolo Pro-Tech ITA', 'Campagnolo Pro-Tech ITA Bottom Bracket', NULL, 'イタリアン(36x24)ねじ切り用のPro-Techボトムブラケット。重量はメーカー公表値です'),
    (8360,  50, 28, 9, CURRENT_TIMESTAMP, 624, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Campagnolo Pro-Tech T47A', 'Campagnolo Pro-Tech T47A Bottom Bracket', NULL, 'T47A(非対称シェル)ねじ切り用のPro-Techボトムブラケット。重量はメーカー公表値です'),
    (7150,  50, 28, 9, CURRENT_TIMESTAMP, 625, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Campagnolo Pro-Tech BBRight', 'Campagnolo Pro-Tech BBRight Bottom Bracket', NULL, 'BBRight(シェル幅79mm)圧入用のPro-Techボトムブラケット。重量はメーカー公表値です'),
    (7150,  50, 28, 9, CURRENT_TIMESTAMP, 626, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Campagnolo Pro-Tech BB386', 'Campagnolo Pro-Tech BB386 Bottom Bracket', NULL, 'BB386(86.5x46)圧入用のPro-Techボトムブラケット。重量はメーカー公表値です'),
    (7150,  50, 28, 9, CURRENT_TIMESTAMP, 627, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Campagnolo Pro-Tech PF30', 'Campagnolo Pro-Tech PF30 Bottom Bracket', NULL, 'PF30(68x46)圧入用のPro-Techボトムブラケット。重量はメーカー公表値です'),
    (7150,  50, 28, 9, CURRENT_TIMESTAMP, 628, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Campagnolo Pro-Tech BB86', 'Campagnolo Pro-Tech BB86 Bottom Bracket', NULL, 'BB86(86.5x41)圧入用のPro-Techボトムブラケット。重量はメーカー公表値です'),
    (7150,  50, 28, 9, CURRENT_TIMESTAMP, 629, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Campagnolo Pro-Tech BB30', 'Campagnolo Pro-Tech BB30 Bottom Bracket', NULL, 'BB30(68x42)圧入用のPro-Techボトムブラケット。重量はメーカー公表値です'),
    (8580,  50, 28, 9, CURRENT_TIMESTAMP, 630, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Campagnolo Pro-Tech T47/68', 'Campagnolo Pro-Tech T47/68 Bottom Bracket', NULL, 'T47(シェル幅68mm)ねじ切り用のPro-Techボトムブラケット。重量はメーカー公表値です'),
    -- Chris King(T47A)
    (40700,  0, 96, 9, CURRENT_TIMESTAMP, 631, '2026-09-26 00:00:00', CURRENT_TIMESTAMP, 'Chris King ThreadFit T47A 30', 'Chris King ThreadFit T47A 30 Bottom Bracket', NULL, 'T47A(BB-Rightシェル)ねじ切り用。30mm/DUBスピンドルのクランクに対応します。重量はメーカー非公表です');

-- 各製品のBB規格とクランク軸規格
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES
    (616, 'bb_standard', 'bsa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (616, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (617, 'bb_standard', 'italian', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (617, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (618, 'bb_standard', 'italian', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (618, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (619, 'bb_standard', 'italian', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (619, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (620, 'bb_standard', 'pf30a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (620, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (621, 'bb_standard', 'bbright', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (621, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (622, 'bb_standard', 't47_68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (622, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (623, 'bb_standard', 'italian', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (623, 'crank_spindle', 'campagnolo_protech', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (624, 'bb_standard', 't47a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (624, 'crank_spindle', 'campagnolo_protech', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (625, 'bb_standard', 'bbright', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (625, 'crank_spindle', 'campagnolo_protech', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (626, 'bb_standard', 'bb386', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (626, 'crank_spindle', 'campagnolo_protech', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (627, 'bb_standard', 'pf30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (627, 'crank_spindle', 'campagnolo_protech', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (628, 'bb_standard', 'bb86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (628, 'crank_spindle', 'campagnolo_protech', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (629, 'bb_standard', 'bb30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (629, 'crank_spindle', 'campagnolo_protech', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (630, 'bb_standard', 't47_68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (630, 'crank_spindle', 'campagnolo_protech', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (631, 'bb_standard', 't47a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (631, 'crank_spindle', 'dub,rotor_30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
