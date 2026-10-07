-- 駆動系の未登録規格(変速方式・対応段数)を補完する
-- 理由:
--   shift_system(変速方式)とdrivetrain_speed(対応段数)が未登録のパーツがまとまって存在し、
--   候補パーツの絞り込みで表示されなくなっていた。
--   絞り込みは「候補に実在する値」だけを選択肢にするため、未登録だと値を選んだ時に消えるだけでなく、
--   その値の選択肢自体が出ない(例: コンポセットの変速方式で電動を選んでもDi2が表示されない)。
--   未登録だったのは0002のシード時に規格行を付けなかった世代で、idでいうと
--   コンポセット(31-47)・クランク(160-179)・上級駆動系(305-347)の3ブロック。
-- 出典:
--   Shimano: 公式製品ページ(12速ロード/GRXは12速、12速Di2は変速方式=有線電動)
--     DURA-ACE R9270/R9250, ULTEGRA R8170/R8150, 105 R7170/R7150, GRX RX825 はいずれも12速Di2。
--     105 R7120・GRX RX820 は12速機械式。
--     https://bike.shimano.com/en-UK/products/components/pdp.P-ST-R9270-R.html
--   SRAM: 正規代理店 Many'S 商品ページ。AXSロード(Force/Rival/Apex/RED)は12速・無線電動、
--     XPLR AXS E1(370/371)は13速・無線電動。チェーンは11速(CN-HG系)を除き12速。
--     https://manys.work/sram-road/
--   Campagnolo: 正規代理店ニチナオの価格表(0038/0040と同じ出典)
--     SUPER RECORD WIRELESS 12s: https://nichinao.jp/wp/wp-content/uploads/2025/06/campagnolo_20251201_WRL12s.pdf
--     RECORD 13 ワイヤレス 13s: https://nichinao.jp/wp/wp-content/uploads/2026/04/campagnolo_20260429_RE-WRL-13s_v2.pdf
--     メカニカルDB(CHORUS 12s / EKAR 13s): https://nichinao.jp/wp/wp-content/uploads/2025/06/campagnolo_20251201_m_DB.pdf
--   FSA Gossamer Pro AGX: 公式製品ページ「Fits Shimano and SRAM 10-11 speed systems」
--     https://www.fsaproshop.com/products/gossamer-pro-abs-adventure-386evo-crankset
--   ROTOR ALDHU Carbon / VEGAST: 公式製品ページ(2x12s・11/12速対応)
--     https://rotorbike.com/rotor-aldhu-carbon-crankset.html
--     https://rotorbike.com/en-uk/vegast-2x12s-shimano-crankset.html
--   Praxis Zayante Carbon-S: 公式製品ページ「10/11/12sp compatible」
--     https://praxiscycles.com/product/zayante-carbon-s/
--   取得日: 2026-10-01
-- 登録方針:
--   - 変速方式(shift_system): mechanical / electronic_wired / electronic_wireless。
--     Shimano 12速Di2はセミワイヤレス(レバーは無線・ディレイラーはバッテリーと有線)だが、
--     既存のRD-R8150(554=有線電動)と同じ扱いに統一する。
--     Campagnolo Record 13・Super Record (S) Wireless は無線電動、Chorus・Ekarは機械式。
--   - 対応段数(drivetrain_speed): 型番・公式スペックが示す段数。
--     複数段数に対応するアフターマーケットクランクは、対応する段数をカンマ区切りで登録する
--     (FSA AGX=10/11、ROTOR=11/12、Praxis=10/11/12)。
-- 登録しなかったもの:
--   今回の対象(31-47, 160-179, 305-347)はすべて出典で段数・変速方式を特定できたため無し。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象パーツの該当キーを先に消す。
DELETE FROM part_specifications
WHERE spec_key IN ('shift_system', 'drivetrain_speed')
  AND (
      part_id BETWEEN 31 AND 47      -- コンポセット
      OR part_id BETWEEN 160 AND 179 -- クランク
      OR part_id BETWEEN 305 AND 347 -- カセット・チェーン・レバー・前後ディレイラー
  );

-- ===== 変速方式(shift_system) =====

-- 有線電動: Shimano 12速Di2(コンポセット・レバー・前後ディレイラー)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (31,  'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (32,  'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (33,  'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (44,  'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (323, 'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (324, 'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (325, 'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (326, 'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (331, 'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (332, 'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (333, 'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (334, 'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (340, 'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (341, 'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (342, 'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (343, 'shift_system', 'electronic_wired',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 無線電動: SRAM AXSロード(XPLR AXS E1を含む)とCampagnolo Wireless
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (34,  'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (35,  'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (36,  'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (37,  'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (39,  'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (40,  'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (41,  'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (42,  'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (47,  'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (327, 'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (328, 'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (329, 'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (330, 'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (335, 'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (336, 'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (337, 'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (338, 'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (344, 'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (345, 'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (346, 'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (347, 'shift_system', 'electronic_wireless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 機械式: Campagnolo Chorus/Ekar、Shimano 105 R7120・GRX RX820、Campagnolo Ekar RD
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (38,  'shift_system', 'mechanical',          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (43,  'shift_system', 'mechanical',          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (45,  'shift_system', 'mechanical',          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (46,  'shift_system', 'mechanical',          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (339, 'shift_system', 'mechanical',          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ===== 対応段数(drivetrain_speed) =====

-- 12速: コンポセット、レバー、前後ディレイラー
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (31,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (32,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (33,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (34,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (35,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (36,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (38,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (39,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (40,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (41,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (42,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (43,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (44,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (45,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (47,  'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (323, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (324, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (325, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (326, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (327, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (328, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (329, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (330, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (331, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (332, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (333, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (334, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (335, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (336, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (337, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (338, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (340, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (341, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (342, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (343, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (344, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (345, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (346, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (347, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 13速: Campagnolo Record 13/Ekar、SRAM XPLR AXS 系
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (37,  'drivetrain_speed', '13', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (46,  'drivetrain_speed', '13', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (339, 'drivetrain_speed', '13', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- カセット(12速 / 13速)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (305, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (306, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (307, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (308, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (309, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (310, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (311, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (312, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (313, 'drivetrain_speed', '13', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- チェーン(11速 / 12速 / 13速)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (314, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (315, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (316, 'drivetrain_speed', '11', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (317, 'drivetrain_speed', '11', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (318, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (319, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (320, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (321, 'drivetrain_speed', '12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (322, 'drivetrain_speed', '13', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- クランク(12速。アフターマーケット品は対応段数をカンマ区切りで登録)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (160, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (161, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (162, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (163, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (164, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (165, 'drivetrain_speed', '10,11',   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (166, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (167, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (168, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (169, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (170, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (171, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (172, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (173, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (174, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (175, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (176, 'drivetrain_speed', '12',      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (177, 'drivetrain_speed', '11,12',   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (178, 'drivetrain_speed', '11,12',   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (179, 'drivetrain_speed', '10,11,12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
