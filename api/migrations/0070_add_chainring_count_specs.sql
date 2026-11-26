-- チェーンリング枚数(chainring_count)を、コンポセット・フロントディレイラー・クランクへ登録する
-- 理由:
--   1x/2xの構成でフロントディレイラー(FD)の要否が変わるため、クランクの枚数とFDの対応枚数を
--   規格として比較できるようにする(shared/part-compatibility-core.ts)。
--   値は 1(1x・シングル) / 2(2x・ダブル) / 3(3x・トリプル)。
-- 出典:
--   Shimano: 公式製品ページ(型番ごとのページタイトルに 2X12s / 1X12s の表記)
--     FC-R7100: https://bike.shimano.com/en-NA/products/components/pdp.P-FC-R7100.html
--     FC-R8100: https://bike.shimano.com/en-NA/products/components/pdp.P-FC-R8100.html
--     FC-R9200: https://bike.shimano.com/en-NA/products/components/pdp.P-FC-R9200.html
--     FC-R9200-P: https://bike.shimano.com/en-NA/products/components/pdp.P-FC-R9200-P.html
--     FC-R8100-P: https://bike.shimano.com/en-NA/products/components/pdp.P-FC-R8100-P.html
--     FC-RX820-2: https://bike.shimano.com/en-NA/products/components/pdp.P-FC-RX820-2.html
--     FC-RX820-1: https://bike.shimano.com/en-NA/products/components/pdp.P-FC-RX820-1.html
--     FD-R9250: https://bike.shimano.com/en-NA/products/components/pdp.P-FD-R9250.html
--     FD-R8150: https://bike.shimano.com/en-NA/products/components/pdp.P-FD-R8150.html
--     FD-R7150: https://bike.shimano.com/en-NA/products/components/pdp.P-FD-R7150.html
--     FD-RX825: https://bike.shimano.com/en-NA/products/components/pdp.P-FD-RX825.html
--     FD-RX820: https://bike.shimano.com/en-NA/products/components/pdp.P-FD-RX820.html
--     FD-R7100(直付/バンド): pdp.P-FD-R7100-F.html / pdp.P-FD-R7100-B.html(2X12s)
--   SRAM: 公式製品ページの Drivetrain Configuration(2x/1x)
--     FC-FRC-E1: https://www.sram.com/en/sram/models/fc-frc-e1
--     FC-FRC-D2: https://www.sram.com/en/sram/models/fc-frc-d2 (2026-08-08のアーカイブで確認)
--     FC-RIV-D1: https://www.sram.com/en/sram/models/fc-riv-d1
--     FC-RIV-E1: https://www.sram.com/en/sram/models/fc-riv-e1
--     FC-RED-D1: https://www.sram.com/en/sram/models/fc-red-d1 (2025-11-16のアーカイブで確認)
--     FC-RED-E1: https://www.sram.com/en/sram/models/fc-red-e1
--     PM-RED-D1: https://www.sram.com/en/sram/models/pm-red-d1 (2019-08-22のアーカイブで確認)
--     FC-FRC-D1: https://www.sram.com/en/sram/models/fc-frc-d1 (2024-05-26のアーカイブで確認)
--     FC-APX-1W-D1: https://www.sram.com/en/sram/models/fc-apx-1w-d1
--     FC-FRC-1W-E1: https://www.sram.com/en/sram/models/fc-frc-1w-e1
--     FC-RIV-1W-E1: https://www.sram.com/en/sram/models/fc-riv-1w-e1
--     FC-RED-1W-E1: https://www.sram.com/en/sram/models/fc-red-1w-e1
--     FD-RED-E-E1: https://www.sram.com/en/sram/models/fd-red-e-e1
--     FD-FRC-E-D2: https://www.sram.com/en/sram/models/fd-frc-e-d2
--     FD-RIV-E-D1: https://www.sram.com/en/sram/models/fd-riv-e-d1
--   Campagnolo: 公式製品ページ
--     Chorus 12x2: https://www.campagnolo.com/us-en/chorus-crankset-12x2-speed/CFCCHORUS12S.html
--     Record 12x2: https://www.campagnolo.com/us-en/record-crankset-12x2-speed/CFCRECORD12S.html
--     Super Record Wireless 12x2:
--       https://www.campagnolo.com/us-en/super-record-wireless-crankset/CFCSUPERRECORDWRLDB12S.html
--     Super Record S Wireless 12x2:
--       https://www.campagnolo.com/us-en/super-record-s-wireless-crankset/CFCSUPERRECORDSWRLDB12S.html
--     Ekar 1x13: https://www.campagnolo.com/us-en/ekar-crankset-1x13-speed/CFCEKAR1X13S.html
--     Ekar GT 1x13: https://www.campagnolo.com/us-en/ekar-gt-crankset/CFCEKAR1X13SGT.html
--     Chorus FD(2x12): https://www.campagnolo.com/us-en/chorus-front-derailleur/CFDCHORUS12S.html
--     Super Record Wireless FD(2x):
--       https://www.campagnolo.com/us-en/super-record-wireless-front-derailleur/CFDSUPERRECORDWRLDB12S.html
--     Record 13(2x13): https://www.campagnolo.com/us-en/record-13/
--     Ekar groupset(1x13): https://www.campagnolo.com/us-en/ekar/
--   FSA: 公式製品ページ「46/30T」の2枚構成
--     https://www.fsaproshop.com/products/gossamer-pro-abs-adventure-386evo-crankset
--   ROTOR: 公式製品ページ(2x12s・50/34の組み合わせ)
--     ALDHU Carbon: https://rotorbike.com/rotor-aldhu-carbon-crankset.html
--     ALDHU 24: https://rotorbike.com/en-eu/rotor-aldhu-2x12-shimano-crankset.html
--     VEGAST: https://rotorbike.com/en-us/vegast-2x12s-shimano-crankset.html
--   Praxis Works: 公式製品ページ(48/32の2枚構成)
--     https://praxiscycles.com/product/zayante-carbon-s/
--   microSHIFT: 公式製品ページの Chainring Count(2x Double)
--     FC-G7000-46: https://www.microshift.com/models/fc-g7000-46/
--     FD-G7020: https://www.microshift.com/models/fd-g7020/
--   Magene: 公式製品ページ(チェーンリング付属版に小・大の2枚を含む)
--     PES P515: https://www.magene.com/en/pes/217-pes-p515-power-meter-set.html
--     TEO P515: https://www.magene.com/en/teo/237-teo-p515-power-meter-set.html
--   確認日: 2026-11-25
-- 登録方針:
--   - コンポセットは構成品のクランク(同梱クランク)の枚数を値にする。
--   - SRAMの一部世代は公式ページが公開終了しているため、上記のアーカイブで内容を確認した。
--   - 上記で枚数を確認できなかったものは無く、すべて登録する。
-- 注意:
--   - アーカイブはWeb Archiveの保存時点の公式ページであり、現在の公式ページとは表示が異なる。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象パーツの該当キーを先に消す。
DELETE FROM part_specifications
WHERE spec_key = 'chainring_count'
  AND part_id IN (
      31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
      369, 370, 371, 372, 373,
      323, 324, 325, 326, 327, 328, 329, 330, 379, 380, 381, 382,
      160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173,
      174, 175, 176, 177, 178, 179,
      388, 389, 390, 391, 392, 393, 394, 395
  );

-- コンポセット(22件)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano(2x12)
    (31,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (32,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (33,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (43,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (44,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (45,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (373, 'chainring_count', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM(2x / 1x)
    (34,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (35,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (39,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (40,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (41,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (42,  'chainring_count', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (370, 'chainring_count', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (371, 'chainring_count', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo(2x / 1x)
    (36,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (37,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (38,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (47,  'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (46,  'chainring_count', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (372, 'chainring_count', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- microSHIFT(2x10)
    (369, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- フロントディレイラー(12件。FDは2枚用のみ)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano
    (323, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (324, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (325, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (326, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (380, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (381, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM
    (327, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (328, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (329, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo
    (330, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (382, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- microSHIFT
    (379, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- クランクセット(28件)
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    -- Shimano
    (160, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (394, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (161, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (162, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (167, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (168, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (169, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (170, 'chainring_count', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- SRAM
    (163, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (164, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (171, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (172, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (173, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (174, 'chainring_count', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (391, 'chainring_count', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (392, 'chainring_count', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo
    (166, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (175, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (176, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (393, 'chainring_count', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- FSA(46/30T)
    (165, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- ROTOR(2x12s)
    (177, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (178, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (395, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Praxis Works(48/32)
    (179, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- microSHIFT(2x Double)
    (388, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Magene(チェーンリング付属版は2枚)
    (389, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (390, 'chainring_count', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
