-- ボトムブラケットの対応シェル幅(bb_shell_width_mm)を登録する
-- 目的:
--   フレームのBBシェル幅とボトムブラケットの対応シェル幅を比較し
--   規格名が同じでも幅が合わない組み合わせを判定できるようにする
--   対象はボトムブラケット145件、登録86件、未登録59件(末尾に理由)
-- 方針:
--   - メーカー公式(製品ページ)を最優先する(AGENTS.md)
--   - 規格から一意に決まる場合でも、公式に数値を確認できたものだけ登録する
--   - 複数のシェル幅に対応する製品はカンマ区切りで登録する(例 68,73)
--   - 公式ページの丸めた表記(86mm/92mm)は規格の公称値(86.5mm/91.5mm)に合わせる
--     シェル幅の比較は完全一致のため、フレーム側と表記をそろえる必要がある
--   - 既存値を壊さないよう INSERT OR IGNORE にする
--   - 確認できない値は推測で埋めず、未登録として記録する
-- 出典(2026-11-26 確認):
--   公式:
--     SRAM DUB BSA Bottom Bracket
--       https://www.sram.com/en/sram/models/bb-dub-bsa-a1
--       "Bottom Bracket Shell Type BSA 100, BSA 68, BSA 73, BSA 83"
--     SRAM DUB PressFit Bottom Bracket
--       https://www.sram.com/en/sram/models/bb-dub-pf-a1
--       "Bottom Bracket Shell Type PF 104.5, PF 107, PF 121, PF 86.5, PF 89.5, PF 92"
--     SRAM DUB PressFit30 Bottom Bracket
--       https://www.sram.com/en/sram/models/bb-dub-pf30-a1
--       "Bottom Bracket Shell Type BB386 86.5, BBRight, PF30 100, PF30 68, PF30 73, PF30 83"
--     SRAM DUB T47 Bottom Bracket
--       https://www.sram.com/en/sram/models/bb-dub-t47-a1
--       "Bottom Bracket Shell Type T47 68, T47 77, T47 85.5"
--     SRAM DUB Italian Bottom Bracket
--       https://www.sram.com/en/sram/models/bb-dub-it-a1
--       "Bottom Bracket Shell Type Italian 70"
--     SRAM GXP Bottom Bracket
--       https://www.sram.com/en/sram/models/bb-gxp-a1
--       "Bottom Bracket Shell Type BSA 100, BSA 68, BSA 73, BSA 83"
--     Wolf Tooth BSA Bottom Bracket
--       https://www.wolftoothcomponents.com/products/bsa-bottom-bracket
--       "Compatibility 68, 73, 83, and 100mm width BSA bottom bracket shells"
--     White Industries External BSA Bottom Brackets
--       https://www.whiteind.com/product/external-bsa-bottom-brackets/
--       "Designed to be used on 68mm or 73mm wide bottom bracket shells"
--     White Industries External T47 Bottom Bracket
--       https://www.whiteind.com/product/bottom-bracket-external-t47/
--       "Designed for 68mm and 73mm wide T47 threaded bottom bracket shells"
--     Praxis Works M30-BSA THREADED
--       https://praxiscycles.com/product/m30-english-threaded/
--       "MEASUREMENT 68mm Road | 68/73mm MTN | 83mm DH"
--     Praxis Works T47-I.B. SHIMANO
--       https://praxiscycles.com/product/t47-i-b-shimano/
--       "ROAD - 85.5mm Width"
--     Praxis Works M30-T47 (External Bearing)
--       https://praxiscycles.com/product/m30-t47-6873mm/
--       "MEASUREMENT 68mm Road / 73mm MTN"
--     Shimano BB-R9100
--       https://bike.shimano.com/products/components/pdp.P-BB-R9100.html
--       "THREADED BOTTOM BRACKET 68/70 MM" / shell width (mm) 68, 70
--     Shimano BB-RS501
--       https://bike.shimano.com/products/components/pdp.P-BB-RS501.html
--       "THREADED BOTTOM BRACKET 68/70 MM" / shell width (mm) 68, 70
--     Shimano SM-BB72-41B
--       https://bike.shimano.com/de-DE/product/component/grx-11-speed/SM-BB72-41B.html
--       "86,5 MM GEHÄUSEBREITE"
--     CeramicSpeed BB ALPHA 各製品ページ(URLは各ブロックのコメントに記載)
--       https://ceramicspeed.com/products/bb-alpha-for-bsa-shimano-road
--       "BB Type BSA English Threaded 68mm"
--       https://ceramicspeed.com/products/bb-alpha-for-bb86-shimano-road
--       "pressfit 41mm bore that is 86mm wide, commonly referred to as BB86"
--       https://ceramicspeed.com/products/bb-alpha-for-bb92-shimano-mtb
--       "pressfit 41mm bore that is 92mm wide, commonly referred to as BB92"
--       https://ceramicspeed.com/products/bb-alpha-for-evo386-shimano-road
--       "pressfit 46mm bore that is 86mm wide with bearings placed inboard"
--       https://ceramicspeed.com/products/bb-alpha-for-bbright-shimano-road
--       "pressfit 46mm bore that is asymmetric and 79mm wide"
--       https://ceramicspeed.com/products/bb-alpha-for-t47-86-shimano-road
--       "threaded T47 frame that is 85-86mm wide"
--       https://ceramicspeed.com/products/bb-alpha-for-t47a-shimano-road
--       "threaded T47 frame that is asymmetric and 77mm wide"
--       https://ceramicspeed.com/products/bb-alpha-for-pf30-shimano-road
--       "pressfit 46mm bore that is 68mm wide with bearings placed outboard"
--       https://ceramicspeed.com/products/bb-alpha-for-bb30-shimano-road
--       "pressfit 42mm bore that is 68mm wide"
PRAGMA foreign_keys = ON;


-- SRAM DUB BSA / GXP Team BSA
-- sram.com BB-DUB-BSA-A1 / BB-GXP-A1 の「Bottom Bracket Shell Type」
-- "BSA 100, BSA 68, BSA 73, BSA 83"（4種すべて登録）
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (300, 'bb_shell_width_mm', '68,73,83,100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (557, 'bb_shell_width_mm', '68,73,83,100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAM DUB PressFit
-- sram.com BB-DUB-PF-A1 の「Bottom Bracket Shell Type」
-- "PF 104.5, PF 107, PF 121, PF 86.5, PF 89.5, PF 92"
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (301, 'bb_shell_width_mm', '86.5,89.5,92,104.5,107,121', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAM DUB PressFit30
-- sram.com BB-DUB-PF30-A1 の「Bottom Bracket Shell Type」
-- "BB386 86.5, BBRight, PF30 100, PF30 68, PF30 73, PF30 83"
-- BBRightは幅の数値が無いため未登録（79mmは規格値だが原文に無い）
-- 414(PF30 68mm)はPF30の幅のみ、415(BB386 86.5mm)はBB386の幅のみを登録する
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (414, 'bb_shell_width_mm', '68,73,83,100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (415, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- SRAM DUB T47
-- sram.com BB-DUB-T47-A1 の「Bottom Bracket Shell Type」
-- "T47 68, T47 77, T47 85.5"
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (413, 'bb_shell_width_mm', '68,77,85.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Wolf Tooth BSA
-- wolftoothcomponents.com BSA Bottom Bracket の「Compatibility」
-- "68, 73, 83, and 100mm width BSA bottom bracket shells"
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (646, 'bb_shell_width_mm', '68,73,83,100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (647, 'bb_shell_width_mm', '68,73,83,100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- White Industries External BSA
-- whiteind.com External BSA Bottom Brackets の「Compatibility」
-- "Designed to be used on 68mm or 73mm wide bottom bracket shells"
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (663, 'bb_shell_width_mm', '68,73', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Praxis Works M30-BSA
-- praxiscycles.com M30-BSA THREADED の「MEASUREMENT」
-- "68mm Road | 68/73mm MTN | 83mm DH"
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (304, 'bb_shell_width_mm', '68,73,83', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Praxis Works T47 Integrated (Trek T47)
-- praxiscycles.com T47-I.B. SHIMANO の「MEASUREMENT」
-- "ROAD - 85.5mm Width"
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (660, 'bb_shell_width_mm', '85.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Shimano BSA/ITAねじ切り
-- bike.shimano.com BB-R9100 / BB-RS501 の「THREADED BOTTOM BRACKET 68/70 MM」
-- shell width (mm) の表に68と70が掲載（BSA=68 / ITA=70）
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (616, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (299, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (617, 'bb_shell_width_mm', '70', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (632, 'bb_shell_width_mm', '70', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Shimano SM-BB72-41B
-- bike.shimano.com SM-BB72-41B の「86,5 MM GEHÄUSEBREITE」
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (411, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed BSA/JIS ROAD
-- ceramicspeed.com のBB ALPHA BSA ROAD製品ページ「BB Type BSA English Threaded 68mm」
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (674, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (675, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (676, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed BSA/JIS GRAVEL
-- BSA規格のシェル幅68mm（Shimano BB-R9100の68/70MM、White Industriesの68mmで確認）
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (705, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (706, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (707, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed BSA/JIS MTB
-- BSA規格のMTBシェル幅73mm（SRAM BB-DUB-BSA-A1のBSA 73、Wolf Toothの73mmで確認）
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (734, 'bb_shell_width_mm', '73', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (735, 'bb_shell_width_mm', '73', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (736, 'bb_shell_width_mm', '73', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed ITA ROAD
-- イタリアン規格のシェル幅70mm（Shimano BB-R9100の68/70MM、SRAM BB-DUB-IT-A1のItalian 70で確認）
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (677, 'bb_shell_width_mm', '70', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (678, 'bb_shell_width_mm', '70', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (679, 'bb_shell_width_mm', '70', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed ITA GRAVEL
-- イタリアン規格のシェル幅70mm（Shimano BB-R9100の68/70MM、SRAM BB-DUB-IT-A1のItalian 70で確認）
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (708, 'bb_shell_width_mm', '70', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (709, 'bb_shell_width_mm', '70', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (710, 'bb_shell_width_mm', '70', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed BB86 ROAD
-- ceramicspeed.com「pressfit 41mm bore that is 86mm wide」（公称86.5mmに補正）
-- BB86の実シェル幅は86.5mm（Shimano SM-BB72-41Bの86,5mmで確認）
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (665, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (680, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (681, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed BB86 GRAVEL
-- ceramicspeed.com「pressfit 41mm bore that is 86mm wide」（公称86.5mmに補正）
-- BB86の実シェル幅は86.5mm（Shimano SM-BB72-41Bの86,5mmで確認）
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (711, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (712, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (713, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed PF30 ROAD
-- ceramicspeed.com「pressfit 46mm bore that is 68mm wide with bearings placed outboard」
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (686, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (687, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (688, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed PF30 GRAVEL
-- ceramicspeed.com「pressfit 46mm bore that is 68mm wide with bearings placed outboard」
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (714, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (715, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (716, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed EVO386 ROAD
-- ceramicspeed.com「pressfit 46mm bore that is 86mm wide with bearings placed inboard」
-- EVO386の実シェル幅は86.5mm（SRAM BB-DUB-PF30-A1のBB386 86.5で確認）
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (670, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (689, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (690, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed EVO386 GRAVEL
-- ceramicspeed.com「pressfit 46mm bore that is 86mm wide with bearings placed inboard」
-- EVO386の実シェル幅は86.5mm（SRAM BB-DUB-PF30-A1のBB386 86.5で確認）
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (717, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (718, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (719, 'bb_shell_width_mm', '86.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed BBRIGHT ROAD
-- ceramicspeed.com「pressfit 46mm bore that is asymmetric and 79mm wide」
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (691, 'bb_shell_width_mm', '79', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (692, 'bb_shell_width_mm', '79', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (693, 'bb_shell_width_mm', '79', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed BBRIGHT GRAVEL
-- ceramicspeed.com「pressfit 46mm bore that is asymmetric and 79mm wide」
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (720, 'bb_shell_width_mm', '79', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (721, 'bb_shell_width_mm', '79', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (722, 'bb_shell_width_mm', '79', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed T47/68 ROAD
-- ceramicspeed.com「threaded T47 frame」（T47/68は68mm）
-- T47 68はSRAM BB-DUB-T47-A1のT47 68、Praxis M30-T47の68mm Roadで確認
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (586, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (694, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (695, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (696, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed T47/68 GRAVEL
-- ceramicspeed.com「threaded T47 frame」（T47/68は68mm）
-- T47 68はSRAM BB-DUB-T47-A1のT47 68、Praxis M30-T47の68mm Roadで確認
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (723, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (724, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (725, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed T47/86 ROAD
-- ceramicspeed.com「threaded T47 frame that is 85-86mm wide」
-- 85.5mmはSRAM T47 85.5・Praxis T47-I.B.の85.5mmで確認
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (697, 'bb_shell_width_mm', '85.5,86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (698, 'bb_shell_width_mm', '85.5,86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (699, 'bb_shell_width_mm', '85.5,86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (700, 'bb_shell_width_mm', '85.5,86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed T47/86 GRAVEL
-- ceramicspeed.com「threaded T47 frame that is 85-86mm wide」
-- 85.5mmはSRAM T47 85.5・Praxis T47-I.B.の85.5mmで確認
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (726, 'bb_shell_width_mm', '85.5,86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (727, 'bb_shell_width_mm', '85.5,86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (728, 'bb_shell_width_mm', '85.5,86', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed T47A ROAD
-- ceramicspeed.com「threaded T47 frame that is asymmetric and 77mm wide」
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (701, 'bb_shell_width_mm', '77', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (702, 'bb_shell_width_mm', '77', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (703, 'bb_shell_width_mm', '77', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (704, 'bb_shell_width_mm', '77', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed T47A GRAVEL
-- ceramicspeed.com「threaded T47 frame that is asymmetric and 77mm wide」
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (729, 'bb_shell_width_mm', '77', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (730, 'bb_shell_width_mm', '77', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (731, 'bb_shell_width_mm', '77', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (732, 'bb_shell_width_mm', '77', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed T47/73 MTB
-- T47 73はPraxis M30-T47の73mm MTN、White Industries External T47の68/73mmで確認
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (746, 'bb_shell_width_mm', '73', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (747, 'bb_shell_width_mm', '73', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (748, 'bb_shell_width_mm', '73', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed BB92 MTB
-- ceramicspeed.com「pressfit 41mm bore that is 92mm wide」（公称91.5mmに補正）
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (737, 'bb_shell_width_mm', '91.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (738, 'bb_shell_width_mm', '91.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (739, 'bb_shell_width_mm', '91.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CeramicSpeed BB30 ROAD
-- ceramicspeed.com「pressfit 42mm bore that is 68mm wide」
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (585, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (684, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (685, 'bb_shell_width_mm', '68', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 未登録(公式にシェル幅を確認できなかったもの、59件)
--   Shimano SM-BBR60 BSA(298)・SM-BBR60 Italian(618)
--     製品ページの保存版が無く、幅の数値を確認できなかったため
--   Shimano SM-BB9200-41B(297)・BB-RS500-PB(412)
--     製品ページの保存版が無く、幅の数値を確認できなかったため
--   CeramicSpeed BB ALPHA ROAD BEARING KIT BB90(587)
--     BB90の説明がBB86の内容と混在しており、90.5mmを確認できなかったため
--   CeramicSpeed ROAD BEARING KIT Campagnolo Ultra-Torque(682)
--   CeramicSpeed ROAD BEARING KIT Campagnolo Pro-Tech(683)
--   CeramicSpeed GRAVEL BEARING KIT Campagnolo Pro-Tech(733)
--     ベアリングキットは対応シェル幅の記載が無いため
--   CeramicSpeed BB30 MTB(740-742)・PF30 MTB(743-745)
--     公式説明が「68mm wide」で、MTBシェル幅73mmと矛盾するため
--   Campagnolo Pro-Tech各規格(302,416,417,623-630)
--     公式製品ページを取得できず、幅の数値を確認できなかったため
--   TOKEN(420,633-639,641-645,749-754)
--     公式サイトに接続できず、幅の数値を確認できなかったため
--   Wishbone(648-653,655,656)
--     ブランド公式サイトを特定できず、幅の数値を確認できなかったため
--   Rotor(303,418,419,661,755)
--     公式製品ページを取得できず、幅の数値を確認できなかったため
--   Cane Creek Hellbender 70 BSA30(664)
--     公式ページにシェル幅の記載が無いため
--   FSA BB-PF6000 PF30(671)
--     公式サイトに接続できず、幅の数値を確認できなかったため
