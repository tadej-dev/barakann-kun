-- 未登録だったフレームにブレーキマウント規格(brake_mount)を追加する
-- 目的:
--   フレーム31件のうち19件に brake_mount が未登録で、カタログにあるブレーキキャリパー21件を
--   選んでも適合判定が「未確認」になっていた。出典が確認できたフレームから登録する。
-- 方針:
--   - メーカー公式(商品ページ・技術仕様・マニュアル)を優先する(AGENTS.md)。
--     公式に記載が無い場合は非公式ソースを使い、その旨を明記する。
--   - 値は既存の語彙(flat_mount / post_mount)に合わせる。
--   - フォーク側の記載しか無い場合は、その旨を書いたうえで登録する
--     (フレームセットは前後とも同じマウント規格で構成されるため)。
-- 出典(2026-10-27 調査):
--   1 Cervelo S5
--     公式: Cervelo サポート(S5 DISC MK4) https://www.cervelo.com/en-US/support/S5%20DISC%20MK4
--     "Brakes Brake Mount Type Front FLAT MOUNT 140 / Brake Mount Type Rear FLAT MOUNT 140"
--   2 Cannondale SuperSix EVO Hi-Mod
--     非公式: 正規販売店(Westbrook Cycles)が転載したCannondale純正Spec
--     https://www.westbrookcycles.co.uk/cannondale_supersix_evo_hi-mod_frameset_-_smoke_black_2023-23173
--     "Fork: SuperSix EVO Hi-MOD Carbon, integrated crown race, 12x100mm Syntace thru-axle,
--      flat mount disc, ..."（フォーク側の記載）
--   4 Trek Madone SLR Gen7
--     公式: Trek Service Manualのフォーク仕様(99spokesが純正Spec文をミラー)
--     https://99spokes.com/bikes/trek/2024/madone-slr-gen-7-disc-frameset
--     "Madone KVF full carbon, tapered carbon steerer, internal brake routing, flat mount disc,
--      carbon dropouts, 12x100mm thru axle"（フォーク側の記載）
--   5 Specialized Tarmac SL8
--     公式: https://www.specialized.com/us/en/tarmac-sl8-frameset-fact-10r-carbon/p/4221541
--     "FACT 10r Carbon, 12x100mm thru-axle, flat-mount disc"
--   8 Giant Propel Advanced SL
--     非公式: 正規販売店 Performance Bicycle のフレームセットスペック
--     https://www.performancebike.com/giant-propel-advanced-sl-frameset-howlite-s-1906007204/p1869132
--     "Brake Compatibility: Disc Only (Hydraulic or Mechanical) Brake Mounts: Flat Mount"
--   11 Pinarello Dogma F
--     非公式: 正規販売店 Excel Sports のフレームセットスペック
--     https://www.excelsports.com/pinarello-dogma-f-disc-frameset-2025
--     "flat mount brake tabs work with all current disc caliper standards"
--     "Flat mount disc brake standard"
--   13 Merida Scultura
--     非公式: 正規販売店 Swinnerton Cycles が転載したMerida純正スペック
--     https://www.swinnertoncycles.co.uk/merida-road-bike-scultura-team-p121642
--     "Frameset | CF5 carbon ... flat mount rear brakes with Disc Cooler, 1 1/2" to 1 1/4" headtube"
--   14 Colnago V4Rs
--     公式: https://www.colnago.com/en-us/premium-bikes/v4rs-bike/technical-specifications
--     "Brake caliper Standard Flat Mount"
--   15 Cannondale SuperSix EVO Carbon Frameset
--     非公式: 正規販売店(R&M Cycles)が転載したCannondale純正Spec
--     https://www.rmcycles.co.uk/bikes/bike-frames/cannondale-supersix-evo-2023-frameset-black__28962
--     "Fork SuperSix EVO Carbon, integrated crown race, 12x100mm Syntace thru-axle, flat mount disc, ..."
--     （フォーク側の記載）
--   18 Trek Madone SLR Gen 8 Frameset
--     公式: https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/f/F213/madone-slr-gen-8-frameset/46775/
--     "Frame with Fork: 900 Series OCLV Carbon, Full System Foil tube shaping, IsoFlow seat tube,
--      RCS Headset System, electronic-only routing, removable aero chainkeeper, T47 BB,
--      flat mount disc, UDH, 142x12mm thru axle"
--   19 Trek Emonda SLR Disc Frameset
--     公式: Trek Service Manualのフォーク仕様(99spokesが純正Spec文をミラー)
--     https://99spokes.com/bikes/trek/2024/emonda-slr-disc-frameset
--     "Emonda SLR full carbon, tapered carbon steerer, internal brake routing, flat mount disc,
--      12x100mm thru axle"（フォーク側の記載）
--   20 Specialized S-Works Aethos Frameset
--     公式: https://www.specialized.com/gb/en/s-works-aethos-frameset-fact-12r-carbon/p/216929
--     "S-Works FACT Carbon, 12x100mm thru-axle, flat-mount disc"
--   24 Wilier Verticale SLR Frameset
--     非公式: 正規販売店 Mapdec Cycle Works の技術仕様
--     https://mapdec.com/products/verticale-slr
--     "Brake Mount: Flat Mount Disc"
--   28 Orbea Orca OMX Frameset
--     公式: Orbea BLUE PAPER(ORCA OMX-OMR 2024 技術マニュアル) 06 SPECIFICATIONS
--     https://velomarket-cska.ru/resources/manuals/Orbea/ORCA_OMX_OMR_2024_BLUEPAPER_EN_ES_DE_FR_IT_14-07-25.pdf
--     "FRONT BRAKE Disc.FlatMount* / REAR BRAKE Disc.FlatMount*"
--   29 Factor OSTRO VAM 2.0 Frameset
--     非公式: 正規販売店 365rider のフレームスペック
--     https://www.365rider.com/en/bicycle-frames/9127-factor-ostro-vam-disc-carbon-frameset-and-fork-black-chrome.html
--     "Brake mount: Flat Mount"（Frame specifications / Fork specifications とも）
--   23 Scott Addict RC Ultimate Frameset
--     公式: 2025 ADDICT RC マニュアル(ブレーキ取り付けの項)
--     https://asset-misc.scott-sports.com/Add/Addict_RC_Manual_A4_2025_Scott-Sports_EN_2194728.pdf
--     "Sram flat mount adaptor: 00.5318.018.000"
--     "Shimano / Sram flat mount NO ADAPTOR directly mounted"（後輪側の記載）
--   541 Specialized Tarmac SL9
--     公式: https://www.specialized.com/us/en/s-works-tarmac-sl9-frameset-fact-12r-carbon/p/4293537
--     "S-Works FACT 12r Carbon, 12x100mm thru-axle, flat-mount disc"
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象の規格を先に消す。
DELETE FROM part_specifications
WHERE spec_key = 'brake_mount'
  AND part_id IN (
    SELECT id FROM parts
    WHERE category_id = 1
      AND name IN (
        'Cervelo S5',
        'Cannondale SuperSix EVO Hi-Mod',
        'Trek Madone SLR Gen7',
        'Specialized Tarmac SL8',
        'Giant Propel Advanced SL',
        'Pinarello Dogma F',
        'Colnago V4Rs',
        'Cannondale SuperSix EVO Carbon Frameset',
        'Trek Emonda SLR Disc Frameset',
        'Specialized S-Works Aethos Frameset',
        'Scott Addict RC Ultimate Frameset',
        'Specialized Tarmac SL9',
        'Scott Foil RC',
        'Wilier Filante SLR',
        'Merida Scultura',
        'Trek Madone SLR Gen 8 Frameset',
        'Wilier Verticale SLR Frameset',
        'Orbea Orca OMX Frameset',
        'Factor OSTRO VAM 2.0 Frameset'
      )
  );

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, 'brake_mount', 'flat_mount', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('Cervelo S5'),
    ('Cannondale SuperSix EVO Hi-Mod'),
    ('Trek Madone SLR Gen7'),
    ('Specialized Tarmac SL8'),
    ('Giant Propel Advanced SL'),
    ('Pinarello Dogma F'),
    ('Colnago V4Rs'),
    ('Cannondale SuperSix EVO Carbon Frameset'),
    ('Trek Emonda SLR Disc Frameset'),
    ('Specialized S-Works Aethos Frameset'),
    ('Scott Addict RC Ultimate Frameset'),
    ('Specialized Tarmac SL9'),
    ('Scott Foil RC'),
    ('Wilier Filante SLR'),
    ('Merida Scultura'),
    ('Trek Madone SLR Gen 8 Frameset'),
    ('Wilier Verticale SLR Frameset'),
    ('Orbea Orca OMX Frameset'),
    ('Factor OSTRO VAM 2.0 Frameset')
) AS v
JOIN parts p
  ON p.category_id = 1 AND p.name = v.column1;
