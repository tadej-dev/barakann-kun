-- Cannondale SuperSix EVO Hi-MOD / LAB71 Frameset(Gen 5)に同梱シートポストを登録する
-- 名称: Cannondale C1 Aero 40 Carbon V2(Ti Hardware, 365mm)
-- 重量 154g:
--   利用者からの情報(2026-10-05)。公式ページ・部品販売店・小売・ホワイトペーパーでは
--   数値の出典を確認できなかったため、出典未確認の値として登録する。
-- 方針:
--   フレームの weight はフレーム単体(56cm・塗装済み)のため、シートポストは完成重量へ
--   加算する(is_set_component=0)。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象のシートポスト付属品を先に消す。
DELETE FROM part_included_items
WHERE included_category_id = 19
  AND part_id IN (
    SELECT id FROM parts
    WHERE brand_id = 2 AND name IN (
        'Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)',
        'Cannondale SuperSix EVO LAB71 Frameset (Gen 5)'
    )
  );

INSERT INTO part_included_items (part_id, item_name, quantity, included_category_id, created_at, updated_at, weight, is_set_component)
SELECT p.id, 'Cannondale C1 Aero 40 Carbon V2 Seatpost', 1, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 154, 0
FROM parts p
WHERE p.brand_id = 2
  AND p.name IN (
    'Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)',
    'Cannondale SuperSix EVO LAB71 Frameset (Gen 5)'
  );
