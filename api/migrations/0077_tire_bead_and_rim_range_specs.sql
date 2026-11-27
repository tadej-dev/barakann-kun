-- タイヤのビード規格・推奨リム内幅を登録する(issue #169 / #168)
-- 目的:
--   ホイールのリム内幅がタイヤの対応範囲に収まるかを判定できるようにする。
--   フックレスリムとチューブタイヤの組み合わせも判定できるようビード種別を登録する。
--   対象はタイヤ48件。
-- 値の語彙:
--   tire_bead                : tube_type / tubeless / tubular
--   min_rim_inner_width_mm   : 対応するリム内幅の下限(mm)
--   max_rim_inner_width_mm   : 対応するリム内幅の上限(mm)
-- 方針:
--   - メーカー公式(製品ページ・技術資料・公式API)を優先する(AGENTS.md)
--   - 数値は原文で照合し、両端が確認できたものだけ登録する
--   - 片側の幅しか公表されていない場合も未登録にする(範囲判定は両端が必要)
--   - 既存値を壊さないよう INSERT OR IGNORE にする
--   - 確認できない値は推測で埋めず、末尾に残件として記録する
-- 出典(2026-11-26 確認。2026-11-27 にVittoria/TUFOの範囲を再確認):
--   Continental(公式):
--     Grand Prix 5000(チューブタイプ)
--       https://www.continental-tires.com/products/bicycle/tires/grand-prix-5000/
--       サイズ表の "Permitted Rim Range (mm)" は全サイズ "000 - 000"(未公表)
--     Grand Prix 5000 S TR
--       https://www.continental-tires.com/products/bicycle/tires/grand-prix-5000-s-tr/
--       25-622: 13-21 / 28-622: 15-23 / 30-622: 16-25 / 32-622: 16-25
--       "Design Rim (mm)" は 19/19/21/21 TC、"Hookless compatible: Yes"
--     Grand Prix 5000 AllSeason TR
--       https://www.continental-tires.com/products/bicycle/tires/grand-prix-5000-allseason-tr/
--       28-622: 15-23 / 32-622: 16-25 / 35-622: 17-27
--       "Design Rim (mm)" は 19/21/23 TC、"Hookless compatible: Yes"
--     AERO 111
--       https://www.continental-tires.com/products/bicycle/tires/aero-111/
--       29/115-622: 16-25、Design Rim 21 TC、Hookless compatible: Yes
--     * 上記の "Permitted Rim Range (mm)" は製品ページのサイズ表と同じ公式データ
--       (api.productsearch.continental-tires.com の articles[].permRimRange_dtacs)
--       で照合した。値は最小-最大の順で、原文の例 "015 - 023" は 15-23 として登録する
--   TUFO(公式):
--     製品ページからリンクされる公式互換表
--       https://www.tufo.com/r/files/79723/download/TUFO_tab_A4_TIRE_WIDTHS%20(002).pdf
--       "TIRE AND RIM COMPATIBILITY CHART"。●推奨と○可を区別する
--       タイヤ幅28mmは●推奨が19C/21C、○可が17C/23Cのため、
--       対応範囲として17-23を登録する
--     Comtura Prima TT 28(チューブレス)
--       https://www.tufo.com/en/tyres/detail/comtura-prima-tt/
--       "TUFO Comtura Prima TT - Tubeless road tyre"、Type: Tubeless tyres
--     Endurance 7TR 28(チューブレス)
--       https://www.tufo.com/en/tyres/detail/endurance7tr/
--     Comtura Aero 28(チューブタイプ)
--       https://www.tufo.com/en/tyres/detail/comtura-aero/
--       Type: Tyre(チューブレス表記なし)
--     Comtura 4 TR 28(チューブレス)
--       https://www.tufo.com/en/tyres/detail/comtura-4-tr/
--   Vittoria(公式):
--     Corsa N.EXT TLR 28/30(チューブレス)
--       https://vittoria.com/products/corsa-n-ext-tubeless-ready
--     Corsa PRO TLR 26/28/30/32(チューブレス)
--       https://vittoria.com/products/corsa-pro-tubeless-ready
--     Corsa PRO Speed TLR 28(チューブレス)
--       https://vittoria.com/products/corsa-pro-speed-tubeless-ready
--     Rubino Pro 28(チューブタイプ)
--       https://vittoria.com/products/rubino-tube-type
--     RideArmor TLR 32(チューブレス)
--       https://vittoria.com/products/ridearmor-tubeless-ready
--     リム内幅はVittoria公式ページが参照するETRTOの推奨リム幅表で確認した
--       https://int.vittoria.com/blogs/magazine/vittoria-is-member-of-etrto
--       "Recommended Tyre–Rim Compatibility"(ピンク=推奨リム幅)
--       タイヤ幅25-27mm: 13-22 / 28mm: 15-23 / 29-34mm: 16-25
--       * ETRTO標準の推奨範囲であり、Vittoria固有の数値ではない
--   Schwalbe(公式):
--     Pro One TLE 25/28/30/32(チューブレス)
--       https://www.schwalbe.com/en/PRO-One-Tubeless-11653975
--     Pro One Aero Front TLR 28
--       https://www.schwalbe.com/en/PRO-One-Aero-Front-11654661
--     Pro One Aero Rear TLR 28
--       https://www.schwalbe.com/en/PRO-One-Aero-Rear-11654662
--     リム内幅は公式「タイヤ幅とリム内幅の組み合わせ表」で確認した
--       https://www.schwalbe.com/en/technology-faq/tire-dimensions/
--       "Possible combinations of tire width and inner rim width according to ETRTO,
--        supplemented by Schwalbe recommendations"
--       表の画像 https://s3-fsn.scale.sc/schwalbe.public/prod-sde/media/9f/bb/95/1715070780/reifen-felgen-kombination-tabelle-EN.png
--       図中 "ETRTO Standard 2024"、列は幅の範囲(例: 21 to 22)で上限は範囲の上端
--       25mm: 15-22 / 28mm: 16-23 / 30mm・32mm: 16-25
--       * 公式（ETRTO 2024準拠）の表であり、Schwalbe固有の数値ではない
--   Michelin(公式):
--     Power Cup TLR 28/30(チューブレス)
--       https://www.michelin.co.jp/bicycle/tyres/michelin-power-cup-tlr-competition-line
--       https://www.michelin.co.jp/bicycle/tyres/michelin-power-cup-competition-line
--     Power Cup Competition Line 25/28(チューブタイプ)
--       https://www.michelin.co.jp/bicycle/tyres/michelin-power-cup-competition-line
--       * 製品データの "sealing" が TUBE TYPE
--   Pirelli(公式):
--     P ZERO Race TLR 28 / P ZERO Race TLR SpeedCORE 28/30(チューブレス)
--       https://www.pirelli.com/tyres/en-ww/bike/tyres/catalogue/p-zero-race-tlr
--     P ZERO Race Tube Type 28(チューブタイプ)
--       https://www.pirelli.com/tyres/en-ww/bike/tyres/catalogue/p-zero-race
--     P ZERO Race TLR RS 28(チューブレス)
--       https://www.pirelli.com/tyres/en-ww/bike/tyres/catalogue/p-zero-race-tlr-rs
--     Cinturato Velo TLR 32(チューブレス)
--       https://www.pirelli.com/tyres/en-ww/bike/tyres/catalogue/cinturato-road-tlr
--   Panaracer(公式):
--     AGILEST TLR 28/30・AGILEST FAST TLR 28(チューブレス)
--       https://panaracer.com/en/products/road_en/agilest-en/agilest-tlr-en
--       https://panaracer.com/en/products/road_en/agilest-en/agilest-fast_tlr
--     GravelKing Slick TLR 35(チューブレス)
--       https://panaracer.com/en/products/gravel_en/gravelking_en/gravelking-r_tlr
--     GravelKing Slick R TLR 40(チューブレス)
--       https://panaracer.com/en/products/gravel_en/gravelking_en/gravelking-r_tlr
--     GravelKing SK 650Bx48(チューブレス)
--       https://panaracer.com/en/products/gravel_en/gravelking_en/gravelking-sk_tlr
--       * 650×48Bが610gでマスタの重量610gと一致し、TLR版と確認した
-- 未登録のまま残したもの:
--   min/max_rim_inner_width_mm(21件):
--     Continental Grand Prix 5000(チューブタイプ)4件:
--       129 700x25C / 130 700x28C / 457 700x30C / 458 700x32C
--       公式サイズ表の Permitted Rim Range が "000 - 000" で未公表
--     Michelin 5件:
--       134 Power Cup TLR 28 Black / 135 同28 Classic / 466 同30 /
--       156 Power Cup Competition Line 25 / 157 同28
--       公式ページにリム内幅の記載なし
--     Pirelli 6件:
--       132 P ZERO Race TLR 28 / 148 同SpeedCORE 28 / 149 同30 /
--       150 P ZERO Race Tube Type 28 / 464 P ZERO Race TLR RS 28 /
--       465 Cinturato Velo TLR 32
--       公式ページにリム内幅の記載なし
--     Panaracer 6件:
--       136 AGILEST TLR 28 / 467 同30 / 158 AGILEST FAST TLR 28 /
--       159 GravelKing Slick TLR 35 / 468 GravelKing Slick R TLR 40 /
--       551 GravelKing SK 650Bx48
--       公式ページにリム内幅の記載なし
PRAGMA foreign_keys = ON;

-- ビード種別(48件)
-- チューブタイプ: Continental GP5000 4件、Vittoria Rubino Pro、Pirelli P ZERO Race Tube Type、
--                 Michelin Power Cup Competition Line 2件、TUFO Comtura Aero
-- チューブレス: 上記以外の39件
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (129, 'tire_bead', 'tube_type', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (130, 'tire_bead', 'tube_type', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (457, 'tire_bead', 'tube_type', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (458, 'tire_bead', 'tube_type', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (137, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (138, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (139, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (140, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (141, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (459, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (460, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (142, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (131, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (462, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (143, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (144, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (145, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (461, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (146, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (147, 'tire_bead', 'tube_type', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (463, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (132, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (148, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (149, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (150, 'tire_bead', 'tube_type', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (464, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (465, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (133, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (151, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (152, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (153, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (154, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (155, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (134, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (135, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (466, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (156, 'tire_bead', 'tube_type', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (157, 'tire_bead', 'tube_type', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (136, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (467, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (158, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (159, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (468, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (551, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (453, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (454, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (455, 'tire_bead', 'tube_type', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (456, 'tire_bead', 'tubeless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 対応リム内幅の下限(27件)
-- Continental(サイズ別の公式公表値): 13,15,16,17
-- TUFO(公式互換表): 28mmは17(○可。●推奨は19)
-- Vittoria(公式ページが参照するETRTO推奨表): 26mmは13、28mmは15、30mm・32mmは16
-- Schwalbe(公式のETRTO 2024準拠表): 25mmは15、28mm・30mm・32mmは16
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (137, 'min_rim_inner_width_mm', '13', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (138, 'min_rim_inner_width_mm', '15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (139, 'min_rim_inner_width_mm', '16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (140, 'min_rim_inner_width_mm', '16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (141, 'min_rim_inner_width_mm', '15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (459, 'min_rim_inner_width_mm', '16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (460, 'min_rim_inner_width_mm', '17', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (142, 'min_rim_inner_width_mm', '16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (453, 'min_rim_inner_width_mm', '17', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (454, 'min_rim_inner_width_mm', '17', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (455, 'min_rim_inner_width_mm', '17', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (456, 'min_rim_inner_width_mm', '17', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (131, 'min_rim_inner_width_mm', '15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (144, 'min_rim_inner_width_mm', '15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (146, 'min_rim_inner_width_mm', '15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (147, 'min_rim_inner_width_mm', '15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (143, 'min_rim_inner_width_mm', '13', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (145, 'min_rim_inner_width_mm', '16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (462, 'min_rim_inner_width_mm', '16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (461, 'min_rim_inner_width_mm', '16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (463, 'min_rim_inner_width_mm', '16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (151, 'min_rim_inner_width_mm', '15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (133, 'min_rim_inner_width_mm', '16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (152, 'min_rim_inner_width_mm', '16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (153, 'min_rim_inner_width_mm', '16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (154, 'min_rim_inner_width_mm', '16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (155, 'min_rim_inner_width_mm', '16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 対応リム内幅の上限(27件)
-- Continental: 21,23,25,27 / TUFO: 28mmは23(○可。●推奨は21)
-- Vittoria: 26mmは22、28mmは23、30mm・32mmは25
-- Schwalbe: 25mmは22、28mmは23、30mm・32mmは25
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (137, 'max_rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (138, 'max_rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (139, 'max_rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (140, 'max_rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (141, 'max_rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (459, 'max_rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (460, 'max_rim_inner_width_mm', '27', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (142, 'max_rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (453, 'max_rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (454, 'max_rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (455, 'max_rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (456, 'max_rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (131, 'max_rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (144, 'max_rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (146, 'max_rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (147, 'max_rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (143, 'max_rim_inner_width_mm', '22', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (145, 'max_rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (462, 'max_rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (461, 'max_rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (463, 'max_rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (151, 'max_rim_inner_width_mm', '22', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (133, 'max_rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (152, 'max_rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (153, 'max_rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (154, 'max_rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (155, 'max_rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
