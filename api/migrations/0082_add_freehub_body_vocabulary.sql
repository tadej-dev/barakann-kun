-- フリーボディ規格(freehub_body)を公式スペックに合わせて整備する
-- 確認日: 2026-11-27
-- 対象: ホイール74件・カセット19件・コンポセット22件の計115件
-- 現状の語彙: shimano_hg / shimano_micro_spline / sram_xd / sram_xdr / campagnolo_n3w
--   sram_xd はカセット549(SRAM GX Eagle XG-1275)で登録済み
--   新しい語彙の追加は不要
-- 欠落: ホイール・カセット・コンポセットは0件(2026-11-27時点)
--   全件に値があるため追加はなく、既存行のUPDATEで修正する
-- 修正: 4件(96, 570, 571, 572)。それ以外は公式で誤りを確認できず変更しない
--
-- 出典(Zipp、すべて公式サポートページ):
--   303 S(A1)は176/76ハブ
--   https://support.zipp.com/hc/en-us/articles/56632300938651-Which-hub-is-used-in-the-303-S-Tubeless-Disc-brake-A1-wheelset
--   176/76ハブのドライバーはXDR・11/12速スプライン(HG)・11速Campagnolo(N3Wなし)
--   https://support.zipp.com/hc/en-us/articles/57008510978843-Which-drive-body-and-end-caps-are-compatible-with-the-176-76-177-77-Rim-Brake-and-Disc-Brake-hubs
--   303 Firecrest(A1)はZR1ハブ
--   https://support.zipp.com/hc/en-us/articles/56621171987867-Which-hub-is-used-in-the-303-Firecrest-Tubeless-Disc-brake-A1-wheelset
--   404 Firecrest(B1)はZR1ハブ
--   https://support.zipp.com/hc/en-us/articles/56957690417947-Which-hub-is-used-in-the-404-Firecrest-Tubeless-Disc-Brake-B1-wheelset
--   808 Firecrest(A1/B1)はZR1ハブ
--   https://support.zipp.com/hc/en-us/articles/56958537165595-Which-hub-is-used-in-the-808-Firecrest-Tubeless-Disc-Brake-A1-wheelset
--   https://support.zipp.com/hc/en-us/articles/56958830146715-Which-hub-is-used-in-the-808-Firecrest-Tubeless-Disc-Brake-B1-wheelset
--   858 NSW(B1/C1)はCognition V2ハブ
--   https://support.zipp.com/hc/en-us/articles/56960075931291-Which-hub-is-used-in-the-858-NSW-Tubeless-Disc-Brake-B1-wheelset
--   https://support.zipp.com/hc/en-us/articles/56960224570523-Which-hub-is-used-in-the-858-NSW-Tubeless-Disc-Brake-C1-wheelset
--   ZR1ハブのドライバーはXDR・11/12速スプライン・N3W(クラシックCampagnoloの記載なし)
--   Cognition V2ハブのドライバーはXDR・11/12速スプライン・Campagnoloクラシック・N3W
--   ZR1とCognition V2のN3Wドライバーは追加部品が必要
--   https://support.zipp.com/hc/en-us/articles/7868738199067-Is-there-a-Campagnolo-N3W-driver-body-available-for-Zipp-Cognition-V2-or-ZR1-hubs
--
-- 出典(DT Swiss、公式):
--   ERC 1100 DICUT 45 DBは180 DICUTハブ(Ratchet EXP)
--   https://www.dtswiss.com/en/wheels/wheels-road/endurance/erc-1100-dicut
--   ERC 1100 DICUT db 45 12/142mmの製品サポートにN3W変換キットあり
--   https://www.dtswiss.com/en/support/product-support?matnr=WERC110NIDJCA18207
--
-- 未変更の理由:
--   - ARC 1100 DICUT 80 DB(569)のN3W対応は確認できず未登録のまま
--   - Campagnoloクラシックは語彙に無いため登録しない
--     176/76ハブが対応するCampagnoloは11速クラシックでN3Wではない
--     Cognition V2はクラシックとN3Wの両方に対応するため、N3Wありとして扱う
--   - 年式が未登録の機種は現行世代(A1/B1/C1)の公式ページを根拠にする
PRAGMA foreign_keys = ON;

-- Zipp 303 S(part 96): 176/76ハブはN3W非対応のため外す
UPDATE part_specifications
SET spec_value = 'shimano_hg,sram_xdr', updated_at = CURRENT_TIMESTAMP
WHERE part_id = 96 AND spec_key = 'freehub_body'
  AND spec_value = 'shimano_hg,sram_xdr,campagnolo_n3w';

-- Zipp 808 Firecrest(part 572): ZR1ハブはN3Wドライバーに対応するため追加する
UPDATE part_specifications
SET spec_value = 'shimano_hg,sram_xdr,campagnolo_n3w', updated_at = CURRENT_TIMESTAMP
WHERE part_id = 572 AND spec_key = 'freehub_body'
  AND spec_value = 'shimano_hg,sram_xdr';

-- Zipp 858 NSW(part 571): Cognition V2ハブはN3Wドライバーに対応するため追加する
UPDATE part_specifications
SET spec_value = 'shimano_hg,sram_xdr,campagnolo_n3w', updated_at = CURRENT_TIMESTAMP
WHERE part_id = 571 AND spec_key = 'freehub_body'
  AND spec_value = 'shimano_hg,sram_xdr';

-- DT Swiss ERC 1100 DICUT 45 DB(part 570): N3W変換キットがあるため追加する
UPDATE part_specifications
SET spec_value = 'shimano_hg,sram_xdr,campagnolo_n3w', updated_at = CURRENT_TIMESTAMP
WHERE part_id = 570 AND spec_key = 'freehub_body'
  AND spec_value = 'shimano_hg,sram_xdr';
