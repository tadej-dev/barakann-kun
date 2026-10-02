-- コンポセットの規格値と、欠けていた規格値を登録する
-- 理由:
--   コンポセットは構成品(クランク・カセット・キャリパー)のカテゴリーを占有するため、
--   BB・ホイール・ブレーキパッドとの適合を、セット本体の規格値で判定する(shared/part-compatibility-core.ts)。
--   あわせて、既存ルールで判定できていなかった規格値の欠けを埋める。
-- 出典:
--   すべてDBに登録済みのデータから導出した値。新しく外部から調べた値は含まない。
--   - コンポセット: 同じ型番・シリーズの単体パーツ(カッコ内はpart id)に登録済みの値
--   - シートポスト径: 製品名に記載された径
--   - パッド形状: 同じ形状番号・同じシリーズで登録済みの値
-- 登録しなかったもの:
--   型番が一致する単体パーツがDBに無い、または世代が特定できないものは推測で埋めず未登録のままにする
--   (例: Campagnolo Super Record S Wireless・Record 13、SRAMキャリパーのパッド形状、GRXのカセット)。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、登録するキーを先に消す。
DELETE FROM part_specifications
WHERE (spec_key IN ('crank_spindle', 'freehub_body', 'pad_family') AND part_id IN (31, 32, 33, 43, 44, 45, 373, 34, 40, 39, 35, 41, 42, 371, 370, 38, 47, 46, 372, 369))
   OR (spec_key = 'seatpost_diameter_mm' AND part_id IN (289, 290, 291, 292, 293, 294, 295, 296))
   OR (spec_key = 'pad_family' AND part_id IN (230, 231, 215, 216));

-- コンポセット(優先度1)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (31, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (31, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (31, 'pad_family', 'shimano_road_flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (32, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (32, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (32, 'pad_family', 'shimano_road_flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (33, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (33, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (33, 'pad_family', 'shimano_road_flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (43, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (43, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (43, 'pad_family', 'shimano_road_flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (44, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (44, 'pad_family', 'shimano_road_flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (45, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (45, 'pad_family', 'shimano_road_flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (373, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (373, 'pad_family', 'shimano_road_flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (34, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (34, 'freehub_body', 'sram_xdr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (40, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (40, 'freehub_body', 'sram_xdr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (39, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (39, 'freehub_body', 'sram_xdr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (35, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (35, 'freehub_body', 'sram_xdr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (41, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (41, 'freehub_body', 'sram_xdr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (42, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (371, 'crank_spindle', 'dub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (370, 'freehub_body', 'sram_xdr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (38, 'crank_spindle', 'campagnolo_ultra_torque', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (38, 'freehub_body', 'campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (47, 'crank_spindle', 'campagnolo_ultra_torque', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (47, 'freehub_body', 'campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (47, 'pad_family', 'campagnolo_db310', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (46, 'freehub_body', 'campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (46, 'pad_family', 'campagnolo_db310', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (372, 'crank_spindle', 'campagnolo_protech', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (372, 'freehub_body', 'campagnolo_n3w', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (369, 'crank_spindle', 'hollowtech_ii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (369, 'freehub_body', 'shimano_hg', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 根拠(コンポセット)
--   31: FC-R9200(162) / CS-R9200(305) / BR-R9270(204)
--   32: FC-R8100(161) / CS-R8101(306) / BR-R8170(203)
--   33: FC-R7100(160) / CS-R7101(307) / BR-R7170(202)
--   43: FC-R7100(160) / CS-R7101(307) / BR-R7170(202)
--   44: FC-RX820-2(169) / BR-RX820(209)
--   45: FC-RX820-2(169) / BR-RX820(209)
--   373: FC-RX820-1(170) / BR-RX820(209)
--   34: Force AXS DUB(163) / XG-1270(310)
--   40: Force AXS D2 DUB(173) / XG-1270(310)
--   39: RED AXS DUB(171) / XG-1290(309)
--   35: Rival AXS DUB(164) / XG-1250(311)
--   41: Rival AXS DUB(164) / XG-1250(311)
--   42: Apex DUB Wide(174)
--   371: Force XPLR E1 DUB(391)
--   370: RED XPLR XG-1391(401)
--   38: Chorus 12s Ultra-Torque(166) / Chorus Cassette(403)
--   47: Super Record Wireless Crankset(175) / Super Record 12s Cassette(312) / Super Record Wireless Caliper(213)
--   46: Ekar Cassette(313) / Ekar Caliper(214)
--   372: Ekar GT Crankset(393) / Ekar GT Cassette(402)
--   369: Sword FC-G7000(388) / Sword CS-G104(396)

-- 欠けていた規格値(優先度3)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (289, 'seatpost_diameter_mm', '27.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (290, 'seatpost_diameter_mm', '27.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (291, 'seatpost_diameter_mm', '27.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (292, 'seatpost_diameter_mm', '27.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (293, 'seatpost_diameter_mm', '27.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (294, 'seatpost_diameter_mm', '27.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (295, 'seatpost_diameter_mm', '27.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (296, 'seatpost_diameter_mm', '27.2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (230, 'pad_family', 'shimano_road_flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (231, 'pad_family', 'sram_road_axs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (215, 'pad_family', 'trp_spyre', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (216, 'pad_family', 'trp_hyrd', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 根拠(欠けていた規格値)
--   289 seatpost_diameter_mm=27.2: 製品名「Seatpost 27.2mm」
--   290 seatpost_diameter_mm=27.2: 製品名「Seatpost 27.2mm」
--   291 seatpost_diameter_mm=27.2: 製品名「Seatpost 27.2mm」
--   292 seatpost_diameter_mm=27.2: 製品名「Seatpost 27.2mm」
--   293 seatpost_diameter_mm=27.2: 製品名「Seatpost 27.2mm」
--   294 seatpost_diameter_mm=27.2: 製品名「Seatpost 27.2mm」
--   295 seatpost_diameter_mm=27.2: 製品名「Seatpost 27.2mm」
--   296 seatpost_diameter_mm=27.2: 製品名「Seatpost 27.2mm」
--   230 pad_family=shimano_road_flat_mount: SwissStop 形状番号34 = Disc 34 EXOTherm2(427)と同形状
--   231 pad_family=sram_road_axs: SwissStop 形状番号35 = Disc 35 RS(428)と同形状
--   215 pad_family=trp_spyre: 同シリーズの TRP Spyre C(423)
--   216 pad_family=trp_hyrd: 同シリーズの TRP HY-RD Post Mount(424)
