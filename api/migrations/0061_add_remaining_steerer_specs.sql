-- 未登録だったフレームにコラム規格(steerer_standard)を追加する
-- 目的:
--   重量をフレーム＋フロントフォークに統一し、フロントアクスルとコラム規格を登録してきたが、
--   メーカーが径を公表していない9機種が未登録のまま残っていた。そのうち、公式マニュアル・
--   公式プレスブック・非公式のヘッドセット/ベアリング適合表から規格を特定できた6機種を追加する。
-- 方針:
--   - メーカー公式を最優先し、公式に情報が無い場合はブログ・自転車店の計測記事・
--     スペック集約サイトも確認する(AGENTS.md)。使った出典が公式か非公式かはここに明記する。
--   - ヘッドセットのベアリング寸法だけからコラム径を逆算するような推定はしない。
--     上下のベアリング構成が分かり、一般的なテーパー規格と一致する場合に限り、
--     その旨を「推定」と書いて登録する。
-- 出典(2026-10-14 調査):
--   Scott Foil RC (id 9)
--     非公式: Aire Velo Bearings の Scott Foil RC ヘッドセットベアリングキット
--       https://www.airevelobearings.com/product/scott-foil-rc-headset-bearing-kit/
--       "Upper Bearing - MH-P08H7 (30.15 x 41.8 x 7 - 45/45) Lower Bearing - ACB519H7 (40 x 51.9 x 7 - 45/45)"
--       上側が1-1/8インチ級、下側が1.5インチ級の構成であることから tapered_1_1_8_1_5 と推定する。
--     非公式: r2-bike の CeramicSpeed ヘッドセットキット(Scott Foil 2023)
--       "Fork steerer Ø: 1" - 1.5""（原文の表記が不完全なため、径の確定には使わない）
--   Specialized S-Works Aethos Frameset (id 20) / Tarmac SL9 (id 541)
--     公式: Specialized S-Works Tarmac SL9 ユーザーマニュアル(AES暗号化PDFを復号して確認)
--       https://media.specialized.com/support/collateral/TARMAC_SL9_USER_MANUAL_ENGLISH.pdf
--       "Front Thru-axle 12 mm x 100 mm" / "Compression Ring 44.5 mm OD x 28.6 mm ID x 9 mm"
--       "Upper Headset Bearing SBC Custom (49.5 mm OD x 40.5 mm ID x 6.5 mm x 45°)"(上下とも同一)
--       上部の圧縮リング内径28.6mm(1-1/8インチ)は公式の記載。下側は独自ベアリングのため径は非公表。
--     非公式: Aire Velo Bearings の Aethos / Tarmac SL7・SL8 キット(上下49.5×40.5)、
--       Road Bike Action の Aethos 実測記事、r2-bike の Tarmac SL7/SL8 キット
--       "Fork steerer Ø: Tapered 1 1/2" to 1 1/8""。SL8と共通の部品構成から tapered_1_1_8_1_5 と推定する。
--   Factor OSTRO VAM 2.0 Frameset (id 29)
--     公式: Factor OSTRO VAM バイクビルダーのスペック表(公式JSON)
--       https://factorbikes.com/bike-builder/ostro-vam-premium-package
--       "Head Tube Diameter":"1-1/8" upper and 1-3/8" lower" / "Headset":"1-1/8" and 1-3/8" bearings"
--       "Front Axle":"12 x 100mm thru-axle"
--       ヘッドチューブ径・ヘッドセットのベアリング径が上下とも明記されているため、
--       コラム規格は1-1/8→1-3/8インチとして登録する。
--   Scott Addict RC Ultimate Frameset (id 23)
--     公式: 2025 ADDICT RC マニュアル(技術データ表)
--       https://asset-misc.scott-sports.com/Add/Addict_RC_Manual_A4_2025_Scott-Sports_EN_2194728.pdf
--       "FORK STEERER in 1 1/4" / "HEADSET mm IS44/35 - IS52/42" / "FRONT AXLE mm 12 x 100"
--       コラム規格は原文どおり1-1/4インチとして登録する(下側ベアリングはIS52/42で、
--       テーパー構成の可能性は残るが、原文に上下の径の記載が無いため断定しない)。
--   LOOK 795 Blade RS 3 Frameset (id 363)
--     公式: LOOK 795 BLADE RS プレスブック(LOOK Combo Aero ステムのスペック欄)
--       https://www.lookcycle.com/download/products-bikes-2023/new-795-blade-rs/catalogue/PRESS-BOOK-795-BLADE-RS-EN.pdf
--       "Stem Structure Steerer tub H-Bar Accessory Weight / LOOK Combo Aero Carbon / Carbon HM 28,6 mm Compatible 1.1/8°"
--       専用ステムが28.6mm(1-1/8インチ)のコラムに対応することは公式に確認できる。
--     非公式: Holland Bike Shop の「LOOK Headset Bearing 1 1/2" For 795 Blade」(下側ベアリング1-1/2インチ)
--       上側1-1/8インチ・下側1-1/2インチの構成から tapered_1_1_8_1_5 と推定する。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象の規格を先に消す。
DELETE FROM part_specifications
WHERE spec_key = 'steerer_standard'
  AND part_id IN (
    SELECT id FROM parts
    WHERE category_id = 1
      AND name IN (
        'Scott Foil RC',
        'Specialized S-Works Aethos Frameset',
        'Scott Addict RC Ultimate Frameset',
        'LOOK 795 Blade RS 3 Frameset',
        'Specialized Tarmac SL9',
        'Factor OSTRO VAM 2.0 Frameset'
      )
  );

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, 'steerer_standard', v.column2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('Scott Foil RC',                      'tapered_1_1_8_1_5'),
    ('Specialized S-Works Aethos Frameset', 'tapered_1_1_8_1_5'),
    ('Scott Addict RC Ultimate Frameset',   'straight_1_1_4'),
    ('LOOK 795 Blade RS 3 Frameset',        'tapered_1_1_8_1_5'),
    ('Specialized Tarmac SL9',              'tapered_1_1_8_1_5'),
    ('Factor OSTRO VAM 2.0 Frameset',       'tapered_1_1_8_1_3_8')
) AS v
JOIN parts p
  ON p.category_id = 1 AND p.name = v.column1;
