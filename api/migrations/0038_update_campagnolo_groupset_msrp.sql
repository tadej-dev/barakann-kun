-- Campagnoloコンポセットのセット価格を、正規代理店が公表するグループセット標準価格(税込)へ更新する
-- 理由:
--   セット価格が店頭・旧価格のままだったため、合計金額の基準をメーカー(正規代理店)公表の標準価格へ統一する。
--   銘柄ごとに公表媒体が異なるため、SRAMは別マイグレーションで対応する(このファイルでは扱わない)。
-- 出典:
--   BRANDS OF NICHINAO(カンパニョーロ国内正規代理店) Campagnolo 価格表
--     価格表一覧: https://nichinao.jp/archives/category/news/13885
--     SUPER RECORD WIRELESS 12s (2025.12.1更新):
--       https://nichinao.jp/wp/wp-content/uploads/2025/06/campagnolo_20251201_WRL12s.pdf
--       グループセット標準価格 ¥774,620 / パワーメーター付き ¥984,720
--     RECORD 13 ワイヤレス 13s (2026.8.21更新):
--       https://nichinao.jp/wp/wp-content/uploads/2026/04/campagnolo_20260429_RE-WRL-13s_v2.pdf
--       RECORD ROAD 2X13 グループセット標準価格 ¥579,810
--     メカニカル ディスクブレーキ (2025.12.1更新):
--       https://nichinao.jp/wp/wp-content/uploads/2025/06/campagnolo_20251201_m_DB.pdf
--       CHORUS DB 12s ¥401,170 / EKAR DB 13s ¥363,550 / EKAR GT DB 13s ¥235,950 (8点セット標準価格)
--     SUPER RECORD S WIRELESS グループセット:
--       https://nichinao.jp/archives/category/campagnolo/18260
--       グループセット販売価格 ¥744,260～(税込価格/標準的な構成)
--   取得日: 2026-09-26
-- 補足:
--   36 Super Record S Wireless と 37 Record 13 は登録値が既に上記標準価格と一致していたため
--   価格は据え置き、確認日のみ更新する。
--   構成品(エルゴパワー・ディレイラー等)は単品価格の公表形式が列組みのため誤読リスクがあり、
--   今回は登録しない。重量も価格表に掲載が無いため別途調査が必要。
PRAGMA foreign_keys = ON;

-- Shimano 105 R7170/GRX と同じく、セット価格のみを標準価格(税込)へ更新する

UPDATE parts
SET price = 744260,
    price_updated_at = '2026-09-26 00:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 36; -- Campagnolo Super Record S Wireless Disc Groupset (既に標準価格と一致)

UPDATE parts
SET price = 579810,
    price_updated_at = '2026-09-26 00:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 37; -- Campagnolo Record 13 2x13 Road Groupset (既に標準価格と一致)

UPDATE parts
SET price = 401170,
    price_updated_at = '2026-09-26 00:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 38; -- Campagnolo Chorus Disc 12-Speed Groupset

UPDATE parts
SET price = 363550,
    price_updated_at = '2026-09-26 00:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 46; -- Campagnolo Ekar 1X13 Disc Groupset

UPDATE parts
SET price = 774620,
    price_updated_at = '2026-09-26 00:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 47; -- Campagnolo Super Record Wireless 2X12 Disc Groupset

UPDATE parts
SET price = 235950,
    price_updated_at = '2026-09-26 00:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 372; -- Campagnolo Ekar GT Groupset 1x13
