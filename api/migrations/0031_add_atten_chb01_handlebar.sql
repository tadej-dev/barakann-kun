-- Argon 18 ATTEN CHB-01 一体型ハンドルバーを独立パーツとして追加する
-- 目的:
--   Nitrogen Pro(383A) は cockpit_interface=argon_atten_chb_01 の専用・一体型コックピット。
--   対応するハンドルを登録して、フレーム選択後に選べるようにする。
-- 出典:
--   形状: ステム一体型(ハンドルバー+ステム)。Nitrogen Pro の付属コックピット。
--   重量: Nitrogen Pro White Paper「320 g cockpit (380 x 100 mm size)」
--     https://storage.googleapis.com/argon18craft/files/White-Paper/White-Paper-Nitrogen-Pro.pdf
--   価格: フレーム同梱のみで単体販売価格は非公表のため0(未登録)。
-- 備考:
--   ステムを占有する一体型ハンドルとして登録する(EXS AEROVER と同じ扱い)。
PRAGMA foreign_keys = ON;

-- id 615 は既存の最大id(614)に続く番号。
INSERT INTO parts (price, weight, brand_id, category_id, created_at, id, price_updated_at, updated_at, model_name, name, variant_name, description) VALUES
    (0, 320, 59, 16, CURRENT_TIMESTAMP, 615, '2026-09-17 00:00:00', CURRENT_TIMESTAMP, 'Argon 18 ATTEN CHB-01 Aero Handlebar', 'Argon 18 ATTEN CHB-01 Aero Handlebar', NULL, 'ステム一体型ハンドル。Nitrogen Pro(383A)専用。重量は代表サイズ(380x100mm)のメーカー公称値。価格はフレーム同梱のみで未公表のため未登録。');

-- ステムを占有する一体型ハンドルとして登録する
INSERT INTO part_blocked_categories (part_id, category_id) VALUES (615, 17);

-- 一体型のステム部を付属品として明示する
INSERT INTO part_included_items (part_id, item_name, quantity, included_category_id, created_at, updated_at) VALUES
    (615, 'ステム', 1, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Nitrogen Pro(364)の cockpit_interface と一致させる
INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at) VALUES
    (615, 'cockpit_interface', 'argon_atten_chb_01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
