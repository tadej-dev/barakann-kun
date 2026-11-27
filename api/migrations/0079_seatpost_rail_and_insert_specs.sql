-- シートポストの対応サドルレール形状と最小挿入長を登録する
-- 目的:
--   サドルとシートポストの組み合わせで必要な「レール形状」と、
--   フレームへ差し込む「最小挿入長」を登録する
-- 対象:
--   シートポスト16件(parts 289-296, 507-514)
--   サドル38件のうち既存値がある9件(parts 515-522, 556)は変更しない
-- 方針:
--   - メーカー公式(製品ページ・取扱説明書・仕様書)を優先する(AGENTS.md)
--   - 公式に記載が無い値は推測で埋めず、未登録のまま残す
--   - 既存値を壊さないよう INSERT OR IGNORE にする
--   - レール形状は既存の語彙(alloy_7mm / carbon_7x9 / carbon_7x9_3 / carbon_7x9_6)に合わせる
--   - 複数のレール形状に対応するシートポストはカンマ区切りで登録する
-- 出典(2026-11-26 確認。Wayback Machine の保存版は保存日を併記):
--   Deda(公式):
--     Deda Elementi「Reggisella Seatpost 取扱説明書」Ver.1 02.2025
--       https://dedaelementi.com/media/catalog/product/attachment//d/e/deda_seatpost_manual.pdf
--       (保存版 2026-01-16)
--       "Deda seat posts are designed to suit sport saddles with a 7 mm rail diameter,
--        and 43 mm rail spacing, as well as with slightly ovalized rails
--        (7 mm width/9 mm max height)"
--     Deda Elementi FAQ(保存版 2021-03-01)
--       https://www.dedaelementi.com/en/faq-seatpost/
--       "designed to fit sport saddles with 7 mm rail diameter"
--       "compatible with oval-type carbon rails : 7 mm width / 9,5 mm max height"
--   PRO(公式):
--     PRO Vibe Carbon Seatpost 製品ページ
--       https://www.pro-bikegear.com/products/pro-vibe-carbon-seatpost
--       "compatible with saddles with both 7x7 alloy and 7x9 carbon rails"
--     PRO Discover Carbon Seatpost 製品ページ(未登録値の確認用)
--       https://www.pro-bikegear.com/global/gravel/seatposts/discover-carbon-seatpost
--       "Length: 320mm" "Minimum insertion: 80mm" "Weight: from 190g"
--   Ritchey(公式):
--     WCS Carbon Link FlexLogic Seatpost 製品ページ(保存版 2025-06-24)
--       https://ritcheylogic.com/product/wcs-carbon-link-flexlogic-seatpost
--       "Total length 300, 350, 400mm (including 100mm of minimum insert)"
--       "standard rails (fits round alloy or Ti rails, as well as carbon rails
--        in all sizes, including 7x10mm)"
--     SuperLogic 1-Bolt Seatpost 製品ページ(保存版 2022-10-10)
--       https://ritcheylogic.com/product/superlogic-1-bolt-seatpost
--       "Total length 300, 350, 400mm (including 100mm of minimum insert)"
--       "7x7mm saddle rail clamp included
--        (interchangeable clamps available for carbon rail saddles)"
--   ENVE(公式):
--     ENVE Seatpost 製品ページ(保存版 2025-08-20)
--       https://enve.com/products/seatpost
--       "Saddle Rail Compatibility | 7x9mm Carbon Rails, 7mm Round Alloy Rails"
--       "Includes 7mm and 7x9mm upper rail clamp plates"
--     ENVE Seatpost Spec Sheet Gen2(保存版 2023-06-06)
--       https://support.enve.com/hc/en-us/article_attachments/7272937552283/ENVE_Seatpost_SpecSheet_Gen2.pdf
--       "Standard and Oversize rail compatible" "*Minimum insertion 75mm"
--     ENVE Seatpost 旧製品ページ(保存版 2015-05-05)
--       http://enve.com/products/seatpost/
--       "One craddle accomodates standard round rail saddles
--        while the other cradle may be used with oversize saddle rails"
--   Easton(公式):
--     EC70 ISA Seatpost 製品ページ(保存版 2021-02-26)
--       https://eastoncycling.com/collections/seatposts/products/ec70-isa-seatpost
--       "LENGTH: 350mm WITH 80mm MIN INSERT" "SEATPOST WEIGHT: ZERO - 210g"
--     Easton ISA Seat Post 取扱説明書(2014)
--       https://cdn.shopify.com/s/files/1/0061/9216/9050/files/Easton-ISA-Post-Install.pdf
--       "OVAL RAILS 7MM X 9MM" "ROUND RAILS 7MM DIAMETER"
--   Black Inc(公式):
--     Black Inc Seatpost 製品ページ
--       https://blackinc.cc/products/seatpost
--       "The clamps are available for 7x7 metal and 7x9 carbon rail saddles"
--     Black Inc Seatpost Outer Rail Clamp Set 製品ページ
--       https://blackinc.cc/products/seatpost-outer-rail-clamp-set
--       "clamps are offered in both 7x9 (oval) and 7x7 (round) versions"
--   Darimo(公式):
--     Darimo T1 Loop Seatpost 製品ページ
--       http://darimo.eu/en/darimo-t1-loop-seatpost-aero-not-round
--       "This system is good for all kind of rails, including carbon rails 7*9mm"
--   Zipp(公式):
--     Zipp SL Speed Seatpost 製品ページ(保存版 2016-04-09)
--       http://zipp.com/seatposts/sl-speed-seatpost--0-/
--       "Minimum insertion length is 100mm"
--       "Rail Compatibility | Round and Square Rails"
--       ("Square Rails" は角型(7x9)カーボンレールの表記として扱う)

PRAGMA foreign_keys = ON;

-- 対応サドルレール形状(12件)
-- Deda: 丸7mmと7x9mmまでの楕円レールに対応
--   (2025年版取扱説明書の上限9mm。FAQは9,5mm表記のため7x9.3は登録しない)
-- PRO Vibe Carbon: 7x7アロイと7x9カーボンに対応(製品ページ)
-- Ritchey WCS Carbon Link: 丸アロイ・チタンと全サイズのカーボンレールに対応(製品ページ)
-- ENVE: 294は2015年版の標準+オーバーサイズ、511は現行版の7mm+7x9mmで確認
--   (製品ページ・仕様書)
-- Easton EC70 ISA: 丸7mmと7x9mmの楕円レールに対応(取扱説明書)
--   DBの重量204gは保存版の210〜225gと一致しないためモデル年式は要確認
-- Black Inc: 7x7(丸)と7x9(楕円)のクランプを用意(製品ページ)
-- Darimo T1 Loop: 7x9mmまでのレールに対応(製品ページ。7x9.3/7x9.6の個別記載は無い)
-- Zipp SL Speed: 丸形と角形(7x9mm)に対応(製品ページ)
-- Ritchey SuperLogic: 同梱クランプは7x7mmのみ。カーボン用は別売7x10mmのため登録しない
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (289, 'saddle_rail', 'alloy_7mm,carbon_7x9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (290, 'saddle_rail', 'alloy_7mm,carbon_7x9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (291, 'saddle_rail', 'alloy_7mm,carbon_7x9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (292, 'saddle_rail', 'alloy_7mm,carbon_7x9,carbon_7x9_3,carbon_7x9_6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (294, 'saddle_rail', 'alloy_7mm,carbon_7x9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (295, 'saddle_rail', 'alloy_7mm,carbon_7x9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (507, 'saddle_rail', 'alloy_7mm,carbon_7x9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (508, 'saddle_rail', 'alloy_7mm,carbon_7x9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (509, 'saddle_rail', 'alloy_7mm,carbon_7x9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (510, 'saddle_rail', 'alloy_7mm', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (511, 'saddle_rail', 'alloy_7mm,carbon_7x9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (514, 'saddle_rail', 'alloy_7mm,carbon_7x9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 最小挿入長(5件)
-- Ritchey WCS Carbon Link / SuperLogic: 全長に100mmの最小挿入長を含む(製品ページ)
-- Zipp SL Speed: 100mm(製品ページ)
-- Easton EC70 ISA: 80mm(製品ページ)
-- ENVE Two-Bolt(Gen2): 75mm(仕様書)
INSERT OR IGNORE INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
VALUES
    (292, 'seatpost_min_insert_mm', '100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (295, 'seatpost_min_insert_mm', '80', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (509, 'seatpost_min_insert_mm', '100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (510, 'seatpost_min_insert_mm', '100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (511, 'seatpost_min_insert_mm', '75', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 未登録(公式値が確認できないため、推測で埋めない)
--   saddle_rail:
--     293 3T Dorico Pro: 公式製品ページ・取扱説明書を確認できず
--     296/513 FSA K-Force Light: 公式製品ページにレール対応の記載なし
--     512 PRO Discover Carbon: 公式製品ページにレール対応の記載なし
--   seatpost_min_insert_mm:
--     289/290/514 Deda: 取扱説明書に最小挿入長の数値記載なし
--     291 PRO Vibe Carbon: 製品ページに記載なし
--     293 3T Dorico Pro: 公式資料を確認できず
--     294 ENVE Carbon: 旧世代の仕様書で最小挿入長を確認できず
--     296/513 FSA K-Force Light: 公式製品ページに記載なし
--     507 Black Inc: 製品ページに記載なし
--     508 Darimo T1 Loop: 製品ページに記載なし
--     512 PRO Discover Carbon: 公式の320mm版は80mmだが、DBの重量265gは
--           公式重量(320mm 190g / 400mm 205g)と一致せず長さ版を特定できない
