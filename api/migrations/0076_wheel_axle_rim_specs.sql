-- ホイールのアクスル規格・リム内幅・タイヤ対応を登録する
-- 目的:
--   フレームとホイールのアクスル一致、タイヤとリムの対応(フックレス/フックあり・内幅)を
--   判定できるようにする。対象は categories.key='wheel' の74件(part_id 93〜128、441〜584)。
--   対象のうち61件を登録し、13件は出典を確認できず未登録とする(末尾に理由を記載)。
-- 方針:
--   - メーカー公式(製品ページ・技術資料)を最優先する(AGENTS.md)
--   - 公式ページが403・JS描画・閉鎖で取得できない場合は販売店(bike-components)を
--     使い、非公式と明記する
--   - 公式ページはWeb Archiveに保存されたスナップショットで確認した場合がある
--   - 「2-Way Fit」「クリンチャー＋チューブレス」「Tubeless and Clincher」と公式が
--     明記するリムは、チューブ式クリンチャーを装着できるためフックあり(hooked)とする
--     (フックレスはチューブレス専用で、チューブ式クリンチャーを装着できない)
--   - 複数規格に対応する部品はカンマ区切り(例: 12x142,qr_135)で登録する
--   - 確認できない値は推測で埋めず、このコメントの「未登録」に記録する
--   - 既存値を壊さないよう INSERT OR IGNORE にする
-- 出典(2026-11-26 確認):
--   公式:
--     Fulcrum 製品ページ
--       https://www.fulcrumwheels.com/en/wheels/road-bike-wheels/speed-42
--       https://www.fulcrumwheels.com/en/wheels/road-bike-wheels/speed-57
--       https://www.fulcrumwheels.com/en/wheels/road-bike-wheels/wind-42
--       https://www.fulcrumwheels.com/en/wheels/road-bike-wheels/wind-57
--       https://www.fulcrumwheels.com/en/wheels/road-bike-wheels/Speed25-Plus
--       https://www.fulcrumwheels.com/en/wheels/road-bike-wheels/racing-zero-db
--       https://web.archive.org/web/2024/https://www.fulcrumwheels.com/en/wheels/road-bike-wheels/racing-4-db
--         (Racing 4 DBのアーカイブ)
--       Speed 42/57・Wind 42/57は"inner rim width 23 mm"、"front axle compatibility HH12-100"
--       "rear axle compatibility HH12-142"。Speed 25は21mm、Racing Zero DBは19mm、
--       Racing 4 DBは"inner rim width(channel) 19 mm"
--     Mavic 製品ページ
--       https://www.mavic.com/en-us/p/cosmic-s-42-disc-rr2402
--       https://www.mavic.com/en-us/p/cosmic-sl-45-disc-23mm-rr2610
--       https://www.mavic.com/en-us/p/cosmic-slr-45-disc-23mm-rr2607
--       https://www.mavic.com/en-us/p/cosmic-ultimate-45-disc-23mm-rr2608
--       https://www.mavic.com/en-us/p/ksyrium-sl-disc-rr1244
--       Cosmic S 42は"Internal width: 21 mm"、Cosmic SL/SLR/Ultimateは23mm、
--       Ksyrium SL Discは19mm。いずれも"Profile: Hooked"、"12X100-142"。
--       Ksyrium SL Discは"can convert to Quick Release with adapters"のため
--       QR(100/135)も登録する
--     Zipp 製品ページ(Web Archiveの2025年スナップショット)
--       https://web.archive.org/web/2025/https://www.zipp.com/wheels/303-s-tubeless-disc-brake/
--       https://web.archive.org/web/2025/https://www.zipp.com/wheels/303-firecrest---carbon-clincher-tubeless-disc-brake
--       https://web.archive.org/web/2025/https://www.zipp.com/wheels/353-nsw-tubeless-disc-brake/
--       https://web.archive.org/web/2025/https://www.zipp.com/wheels/404-firecrest-carbon-clincher-tubeless-disc-brake
--       https://web.archive.org/web/2025/https://www.zipp.com/wheels/454-nsw-carbon-clincher-disc-brake
--       https://web.archive.org/web/2025/https://www.zipp.com/wheels/808-firecrest-carbon-clincher-tubeless-disc-brake
--       https://web.archive.org/web/2025/https://www.zipp.com/wheels/858-nsw-carbon-clincher-disc-brake
--       303 Sは"Internal Width 23mm"、303 Firecrest/353 NSWは25mm、
--       404 Firecrest/454 NSW/808 Firecrest/858 NSWは23mm
--     DT Swiss 製品ページ
--       https://www.dtswiss.com/en/wheels/wheels-road/endurance/erc-1400-dicut
--       https://www.dtswiss.com/en/wheels/wheels-road/endurance/er-1600-spline
--       https://www.dtswiss.com/en/wheels/wheels-road/aero/arc-1100-dicut-db
--       https://www.dtswiss.com/en/wheels/wheels-road/endurance/erc-1100-dicut
--       https://web.archive.org/web/2022/https://www.dtswiss.com/en/wheels/wheels-road/aero/arc-1100-dicut-db
--         (旧世代ARC 1100 DICUT db 50/62/80のアーカイブ)
--       ERC 1400/ERC 1100/ER 1600は"Inner Width 22 mm"、"Tire interface Hooked / Crotchet
--       tubeless TC"。ARC 1100 DICUT 38/50/62/80は20mm。全モデル12x100/12x142
--     Campagnolo 製品ページ
--       https://www.campagnolo.com/jp-en/bora-wto-45-c23-disc-brake/WWRBORAWTO45C23DB.html
--       https://www.campagnolo.com/jp-en/bora-wto-60-c23-disc-brake/WWRBORAWTO60C23DB.html
--       https://www.campagnolo.com/jp-en/bora-ultra-wto-45-c23-disc-brake/WWRBORAULTRAWTO45C23DB.html
--       https://www.campagnolo.com/jp-en/hyperon-ultra/WWRHYPERONULTRADB.html
--       Bora WTO/Ultra WTOは"Internal width of rim: 23 mm"、Hyperon Ultraは21mm。
--       全モデル"Hub width: front: 100 mm, back: 142 mm"、"Axle type: 12mm aluminium thru axle"
--     Roval 製品ページ
--       https://www.specialized.com/us/en/roval-rapide-clx-ii/p/205440
--       https://www.specialized.com/us/en/roval-rapide-clx-iii/p/1000256237
--       https://www.specialized.com/us/en/roval-alpinist-clx-iii/p/1000256320
--       いずれも"Internal Width: 21mm"、"Rim Construction: Hooked"、
--       "Front Hub 12x100mm"、"Rear Hub 12x142mm"
--     ENVE 製品ページ(Web Archiveの2025年スナップショット)
--       https://web.archive.org/web/2025/https://www.enve.com/product/ses-2-3/
--       https://web.archive.org/web/2025/https://www.enve.com/product/ses-3-4/
--       https://web.archive.org/web/2025/https://www.enve.com/product/ses-4-5/
--       https://web.archive.org/web/2025/https://www.enve.com/product/ses-6-7/
--       https://web.archive.org/web/2025/https://www.enve.com/product/enve-45/
--       https://web.archive.org/web/2025/https://www.enve.com/product/enve-65/
--       SES 2.3は21mm、SES 3.4/4.5は25mm、SES 6.7は23mm、Foundation 45/65(ENVE 45/65)は21mm。
--       いずれも"Tubeless Only"かつ公式に"hookless bead design"を採用
--     HUNT 製品ページ(Web Archiveの2025年スナップショット)
--       https://web.archive.org/web/2025/https://www.huntbikewheels.com/products/hunt-44-aerodynamicist-carbon-disc-wheelset
--       https://web.archive.org/web/2025/https://www.huntbikewheels.com/products/hunt-54-aerodynamicist-carbon-disc-wheelset
--       "29mm outer and 20mm internal width"、"Hooked"、
--       "Front: 12x100mm Thru-Axle, 9x100mm Thru-Axle, Quick Release 9x100mm"
--       "Rear: 12x142mm Thru-Axle, 12x135mm Thru-Axle, 10x135mm Thru-Axle, Quick Release 9x135mm"
--       * QRはqr_100/qr_135として登録する。語彙のない9x100/12x135/10x135の
--         スルーアクスルは登録しない
--     Parcours 製品ページ(Web Archiveの2025年スナップショット)
--       https://web.archive.org/web/2025/https://www.parcours.cc/products/strade
--       https://web.archive.org/web/2025/https://www.parcours.cc/products/ronde
--       "Internal rim width 22.5mm (hooked)"、"Front axle: 12 x 100mm thru axle"
--       "Rear axle: 12 x 142mm thru axle"
--     Black Inc 製品ページ(Web Archiveの2025年スナップショット)
--       https://web.archive.org/web/2025/https://blackinc.cc/products/4858-forty-eight-fifty-eight-carbon-aero-wheelset
--       "Rim width internal 23"、"Axle type 12mm Thru Axle"、"Hub width front 100mm / rear 142mm"、
--       "Type interface Tubeless and Clincher (inner tube)"
--     CADEX 製品ページ
--       https://www.cadex-cycling.com/global/showcase/cadex-max-40-wheels
--       https://www.cadex-cycling.com/global/showcase/cadex-max-50-wheelsystem
--       "generous 22.4mm inner rim width"、"hookless rim design"
--     Giant 製品ページ
--       https://www.giant-bicycles.com/global/showcase/slr-1-42-disc
--       "Featuring hookless rim design"、"Hookless Rim Design"
--     Vision プレスリリース
--       https://www.visiontechusa.com/en/news/metron-45-60-sl-disc-world-premiere-tour-de-france
--       "The internal channel of the CH / TLR version is 21mm"、
--       "clincher / tubeless-ready and tubular versions"
--     Reserve 製品ページ
--       https://reservewheels.com/products/reserve-40-44-road-wheel
--       https://reservewheels.com/products/reserve-34-37-road-wheel
--       40|44は"Inner Width Front 25.5mm, Rear 25mm"、34|37は"23mm Front, 22mm Rear"。
--       前後で異なるため広い側を登録する。"Hub Spacing 12X100mm/12X142mm"、
--       "can be set up tubeless or with tubes"
--     Miche 製品ページ
--       https://www.miche.it/it/prodotti/ruote/strada/kleos-rd-36
--       https://www.miche.it/it/prodotti/ruote/strada/kleos-rd-50
--       "canale interno da 21 mm"、"rasamento: 100 - 142"、
--       "tutte le coperture copertoncino e tubeless"
--   非公式(販売店):
--     bike-components 製品ページ
--       Shimano WH-R9270-C36-TL / WH-R8170-C60-TL
--         "Inner Width: 21 mm"、"Rim Flange: with hook"、"12 x 100 mm thru-axle" /
--         "12 x 142 mm thru-axle"
--       * Dura-Ace C50/C60とUltegra C36/C50は販売店に個別ページがないため、
--         同一リムシリーズのC36/C60ページの値(21mm)を各ハイトに適用した
--       Shimano WH-M8100-TL 29"
--         "Inner Width: 23.8 mm"、"Rim Flange: with hook"、"15 x 110 mm thru-axle" /
--         "12 x 148 mm thru-axle"
--       Zipp 303 S / 353 NSW
--         "Rim Flange: hookless"、"12 x 100 mm thru-axle" / "12 x 142 mm thru-axle"
--       公式ページが403(Shimano)・JS描画(Zipp)のため、やむを得ず販売店表記を採用した
-- 未登録(13件):
--   93  Shimano WH-RS710-C46-TL: 公式403。販売店にC32のみでC46の掲載なし
--   99  Campagnolo Zonda GT DB C23: 現行公式サイトにZonda GTの掲載なし
--   120 DT Swiss PRC 1400 SPLINE 35: 公式ページはリムブレーキ(QR100/130)。DBのrotor_mountは
--       center_lockで一致せず、ディスク版の規格を確認できない
--   121 Campagnolo Bora WTO 33 Disc: 現行公式は35mm。旧33mm版ページが見つからない
--   441 Elitewheels Drive 50D II: 公式サイトが502、Web Archiveにも保存なし
--   443 Elitewheels Drive SL 48D CS: 同上
--   550 MASON x HUNT 650B Adventure Sport: 公式製品ページが見つからない
--   560 Syncros Capital SL 40: 公式サイトがIncapsulaで遮断、Archiveも遮断
--   561 Syncros Capital SL Aero 60: 同上
--   575 Bontrager Aeolus RSL 37 TLR Disc: Trek公式ページはJavaScript描画で規格値が取得できず
--   576 Bontrager Aeolus RSL 51 TLR Disc: 同上
--   577 Bontrager Aeolus RSL 62 TLR Disc: 同上
--   578 Bontrager Aeolus RSL 75 TLR Disc: 同上
-- 部分登録(未登録の規格があるホイール):
--   ENVE 6件: リム内幅・タイヤ対応のみ。アクスルは公式ページに記載がなく未登録
--   CADEX 3件: リム内幅・タイヤ対応のみ。アクスルは公式ページに記載がなく未登録
--   Giant 1件: タイヤ対応のみ。リム内幅は公式ページに記載がなく未登録
--   Vision 2件: リム内幅・タイヤ対応のみ。アクスルは公式プレスリリースに記載がなく未登録

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES

    -- Shimano（非公式: bike-components。公式ページは403のため直接確認できず）
    (100, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (100, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (100, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (100, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (101, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (101, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (101, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (101, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (102, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (102, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (102, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (102, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (103, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (103, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (103, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (103, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (104, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (104, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (104, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (104, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (105, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (105, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (105, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (105, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (548, 'front_axle', '15x110', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (548, 'rear_axle', '12x148', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (548, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (548, 'rim_inner_width_mm', '23.8', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Fulcrum（公式）
    (94, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (94, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (94, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (94, 'rim_inner_width_mm', '19', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (106, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (106, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (106, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (106, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (107, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (107, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (107, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (107, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (108, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (108, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (108, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (108, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (109, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (109, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (109, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (109, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (566, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (566, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (566, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (566, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (567, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (567, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (567, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (567, 'rim_inner_width_mm', '19', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Mavic（公式）
    (95, 'front_axle', '12x100,qr_100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (95, 'rear_axle', '12x142,qr_135', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (95, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (95, 'rim_inner_width_mm', '19', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (110, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (110, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (110, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (110, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (111, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (111, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (111, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (111, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (112, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (112, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (112, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (112, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (568, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (568, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (568, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (568, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Zipp（公式アーカイブ + 非公式: bike-components）
    (96, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (96, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (96, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (96, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (113, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (113, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (113, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (113, 'rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (114, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (114, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (114, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (114, 'rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (115, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (115, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (115, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (115, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (116, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (116, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (116, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (116, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (571, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (571, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (571, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (571, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (572, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (572, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (572, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (572, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- DT Swiss（公式）
    (97, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (97, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (97, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (97, 'rim_inner_width_mm', '22', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (98, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (98, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (98, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (98, 'rim_inner_width_mm', '22', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (117, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (117, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (117, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (117, 'rim_inner_width_mm', '20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (118, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (118, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (118, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (118, 'rim_inner_width_mm', '20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (119, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (119, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (119, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (119, 'rim_inner_width_mm', '20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (569, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (569, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (569, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (569, 'rim_inner_width_mm', '20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (570, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (570, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (570, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (570, 'rim_inner_width_mm', '22', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Campagnolo（公式）
    (122, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (122, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (122, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (122, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (123, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (123, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (123, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (123, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (564, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (564, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (564, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (564, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (565, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (565, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (565, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (565, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Roval（公式）
    (126, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (126, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (126, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (126, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (580, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (580, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (580, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (580, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (581, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (581, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (581, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (581, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- ENVE（公式アーカイブ。アクスルは未確認のため未登録）
    (542, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (542, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (543, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (543, 'rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (544, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (544, 'rim_inner_width_mm', '25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (545, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (545, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (573, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (573, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (574, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (574, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- HUNT（公式アーカイブ）
    (128, 'front_axle', '12x100,qr_100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (128, 'rear_axle', '12x142,qr_135', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (128, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (128, 'rim_inner_width_mm', '20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (451, 'front_axle', '12x100,qr_100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (451, 'rear_axle', '12x142,qr_135', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (451, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (451, 'rim_inner_width_mm', '20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Parcours（公式アーカイブ）
    (445, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (445, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (445, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (445, 'rim_inner_width_mm', '22.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (447, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (447, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (447, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (447, 'rim_inner_width_mm', '22.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Black Inc（公式アーカイブ）
    (449, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (449, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (449, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (449, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- CADEX（公式。アクスルは未確認のため未登録）
    (124, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (124, 'rim_inner_width_mm', '22.4', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (562, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (562, 'rim_inner_width_mm', '22.4', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (563, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (563, 'rim_inner_width_mm', '22.4', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Giant（公式。内幅は未確認のため未登録）
    (582, 'rim_tire_interface', 'hookless', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Vision（公式プレスリリース。アクスルは未確認のため未登録）
    (558, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (558, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (559, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (559, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Reserve（公式）
    (125, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (125, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (125, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (125, 'rim_inner_width_mm', '25.5', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (579, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (579, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (579, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (579, 'rim_inner_width_mm', '23', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- Miche（公式）
    (583, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (583, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (583, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (583, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (584, 'front_axle', '12x100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (584, 'rear_axle', '12x142', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (584, 'rim_tire_interface', 'hooked', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (584, 'rim_inner_width_mm', '21', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
