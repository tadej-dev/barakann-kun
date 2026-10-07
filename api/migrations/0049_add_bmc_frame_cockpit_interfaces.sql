-- BMC フレームのコックピット規格(cockpit_interface)を登録する
-- 理由:
--   cockpit_interface が未登録だと、候補表でコックピットバッジが出ず、
--   ハンドル/ステムの適合判定も「規格未確認」になるため。
-- 出典(2026-10-05 調査):
--   BMC 公式 ICS Integrated Cockpit System 互換ガイドのフレームインターフェース表
--     https://manuals.plus/m/2b04ab3b90b9db75383f85f5cc31c835f89c7fd83649b899139f868cdfeda340
--     - Teammachine SLR 01 Gen5 (MY26)        : ICS
--     - Teammachine SLR 01 Gen4 (MY21-MY24)   : ICS(SLR01 MOD は Gen4)
--     - Teammachine R 01 (MY24-)              : ICS
--     - Roadmachine Gen2 (MY20-MY23)          : ICS(Roadmachine FRS 2023)
--   BMC Japan 各商品ページ(ICS2ステム+ハンドルバー、ICS Carbon EVO/AERO が使用可能)
--     13102 SLR01 FRS VAR4 / 9453 SLR01 MOD / 12903 R 01 FRS VAR1 / 12113 R 01 FRS V1
-- 方針:
--   - 既存の BMC フレーム(id 12/26)と同じ 'bmc_ics' を使う。
--   - Speedmachine 01 MOD は ICS 互換ガイドに記載が無く専用コックピットのため未登録とする。
--   - cockpit_connection / cockpit_system は出典が無いため本マイグレーションでは扱わない。
PRAGMA foreign_keys = ON;

-- 再実行しても重複しないよう、対象フレームの当該規格を先に消す。
DELETE FROM part_specifications
WHERE spec_key = 'cockpit_interface'
  AND part_id IN (
    SELECT id FROM parts
    WHERE brand_id = 11 AND name IN (
        'BMC Teammachine SLR 01 Frameset (Gen 5)',
        'BMC Teammachine SLR01 MOD Frameset',
        'BMC Teammachine R 01 Frameset (VAR)',
        'BMC Teammachine R 01 Frameset (V)',
        'BMC Roadmachine FRS Frameset'
    )
  );

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, 'cockpit_interface', 'bmc_ics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('BMC Teammachine SLR 01 Frameset (Gen 5)'),
    ('BMC Teammachine SLR01 MOD Frameset'),
    ('BMC Teammachine R 01 Frameset (VAR)'),
    ('BMC Teammachine R 01 Frameset (V)'),
    ('BMC Roadmachine FRS Frameset')
) AS v
JOIN parts p
  ON p.brand_id = 11 AND p.name = v.column1;
