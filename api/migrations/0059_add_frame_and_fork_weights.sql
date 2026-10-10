-- 全フレームの重量を「フレーム＋フロントフォーク」に統一し、重量の範囲と内訳を登録する
-- 目的:
--   フレームの weight がフレーム単体の値か(同梱フォークを含むか)が分からず、完成重量が
--   フォークの分だけ過小になったり、フレーム間の比較がずれたりする問題があった。
--   フレームはフォークとセットで売られ、フォークを単体で選ぶ場面がないため、
--   重量をフレーム＋フロントフォークの合計に統一する。
-- 方針:
--   - フレームの weight は「フレーム＋フロントフォーク」の合計にする。内訳は frame_weight_g /
--     fork_weight_g に登録し、画面では合計の下に「(755g + 378g)」と示す。
--   - 出典は同じソース・同じ条件(サイズ・塗装)のペアを優先する。メーカー公式に無い場合は
--     非公式ソース(主要メディア・正規販売店・スペック集約サイト・実測)を使い、
--     weight_source に reference を登録して画面で「参考値」と分かるようにする。
--   - フレームとフォークのどちらの重量も出典が見つからないフレームは削除する(利用者の指定)。
--   - フロントフォークの規格(コラム規格・フロントアクスル)は、出典が確認できたフレームから
--     順に登録する(重量の内訳とは別に進める)。

-- 出典(2026-10-10 調査。メーカー公式の商品ページ・データシート・ホワイトペーパーを原文で確認。
--       公式に無い場合は非公式ソースを使い、その旨を各フレームの weight_source に記録):
--   Cervelo Cervelo S5
--     第三者スペックサイト(bikkerr)のフレーム703g／実測(weightisthekey)のフォーク434g
--   Cannondale Cannondale SuperSix EVO Hi-Mod
--     Cannondale公式SNAPシート https://s3.amazonaws.com/sparc.csg.assets/snap-sheet-library/cannondale/road/SuperSix%20EVO%20Snap%20Sheet.pdf 引用: SuperSix EVO Hi-MOD: 810 grams / 410 grams（サイズ56、フォークはカット済み）
--   Trek Trek Madone SLR Gen7
--     Trek公式 https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/madone-slr/madone-slr-gen-7-disc-frameset/p/37307/ "1050g - 56cm (frame-only, painted), 418g (fork-only, painted)"
--   Specialized Specialized Tarmac SL8
--     フレームはSpecialized公式(685g)／フォークは実測(weightisthekey)390g
--   Specialized Specialized Tarmac SL7
--     公式はフレーム800gのみでフォーク重量が無く、他に出典が無いため削除する
--   Canyon Canyon Aeroad CFR
--     公式はフレーム960gのみでフォーク重量が無く、他に出典が無いため削除する
--   Giant Giant Propel Advanced SL
--     フレームは登録値／フォークは実測(weightisthekey, Propel Advanced SL)381g
--   Scott Scott Foil RC
--     フレームは登録値／フォークは実測(weightisthekey, Foil 10 2026)533g
--   Wilier Wilier Filante SLR
--     Wilier公式 https://www.wilier.com/en/bikes/road/filante-slr "Frame weight: 870 g +/- 5%" "Fork weight: 360 g +/- 5%"
--   Pinarello Pinarello Dogma F
--     フレームはPinarello公称(BikeRadar経由, サイズ53・未塗装)／フォークは実測(Weight Weenies)432g
--   BMC BMC Teammachine R 01
--     BMC公式 https://bmc-switzerland.com/pages/platform/platform-teammachine-slr-01 "Teammachine R 01 Frame: 910 Fork: 395 Seatpost: 155 Total: 1460"
--   Merida Merida Scultura
--     フレームはMerida公式(サイズM)／フォークは実測(weightisthekey)407g
--   Colnago Colnago V4Rs
--     フレームは登録値(Colnago公称)／フォークは実測(weightisthekey)403g
--   Cannondale Cannondale SuperSix EVO Carbon Frameset
--     Cannondale公式SNAPシート https://s3.amazonaws.com/sparc.csg.assets/snap-sheet-library/cannondale/road/SuperSix%20EVO%20Snap%20Sheet.pdf 引用: SuperSix EVO Carbon: 915 grams / 450 grams（サイズ56、フォークはカット済み）
--   Cannondale Cannondale SystemSix Hi-MOD Frameset
--     公式・非公式のどちらにも重量の出典が無いため削除する
--   Bianchi Bianchi Specialissima RC Frameset
--     公式に重量の記載が無く、登録値750gの出典も確認できないため削除する
--   Trek Trek Madone SLR Gen 8 Frameset
--     Trek公式スペック "796g - ML (frame-only, painted), 350g (fork-only, painted)"
--   Trek Trek Emonda SLR Disc Frameset
--     Trek公式スペック "760g - 56cm (frame-only, painted), 381g (fork-only, painted)"
--   Specialized Specialized S-Works Aethos Frameset
--     フレームはSpecialized公式／フォークはRoad Bike Actionの実測311g(サイズ54)
--   Canyon Canyon Ultimate CFR Frameset
--     フレーム重量は第三者値のみ、フォーク重量の出典が無いため削除する
--   Giant Giant TCR Advanced SL Frameset
--     Giantは公式にフレーム・フォーク重量を公表せず、他に出典が無いため削除する
--   Scott Scott Addict RC Ultimate Frameset
--     フレームは登録値／フォークは実測(weightisthekey, Addict RC HMX SL)372g
--   Wilier Wilier Verticale SLR Frameset
--     Wilier公式 https://www.wilier.com/en/bikes/road/verticale-slr "Frame weight: 720 g +/- 5%" "Fork weight: 320 g +/- 5%"
--   Pinarello Pinarello Dogma X Frameset
--     Pinarelloは公式にフレーム・フォーク重量を公表せず、他に出典が無いため削除する
--   BMC BMC Teammachine SLR 01 Frameset
--     BMC公式 "The claimed weight for a size 54cm Teammachine SLR 01 frameset is 1'173g. Frame 700g Fork 339g Seatpost 134g"
--   Orbea Orbea Orca OMX Frameset
--     非公式 BikeRadar https://www.bikeradar.com/news/2023-orbea-orca-omx 「750g in a size 53」「the OMX fork is said to weigh 360g with an uncut steerer」
--   Factor Factor OSTRO VAM 2.0 Frameset
--     非公式 BikeRadar掲載のFactor提供表 https://www.bikeradar.com/news/factor-ostro-vam-2024 "Frame (grams, size 54, chrome/black paint) 820 / Fork (grams) 463"
--   Ridley Ridley Falcn RS Frameset
--     公式はフレーム825gのみでフォーク重量が無く、他に出典が無いため削除する
--   LOOK LOOK 795 Blade RS 3 Frameset
--     LOOK公式 https://www.lookcycle.com/us-en/795-blade-rs-3 "890 g frame / 340 g fork"、"Frame only : 890g | frame + fork : 1230g"
--   Argon 18 Argon 18 Nitrogen Pro Frameset
--     Argon 18公式ホワイトペーパー https://storage.googleapis.com/argon18craft/files/White-Paper/White-Paper-Nitrogen-Pro.pdf "a sub 950 g frame, a sub 415 g fork (both frame and fork size medium, painted)"
--   Lapierre Lapierre Xelius DRS Team Replica Frameset
--     公式はフレーム730gのみ。非公式の390gは別グレード・別サイズのため使えない
--   Felt Felt BREED FRD Framekit
--     公式はフレームセット一式1.92kgのみで、フレーム単体とフォークの値が無いため削除する
--   TIME TIME Alpe d'Huez X Frameset
--     公式に重量の記載が無く、非公式もフレームのみのため削除する
--   Basso Basso SV Frame Kit
--     Basso公式 https://bassobikes.com/en/sv-tech "the SV frame weighs just 780g and the fork 370g"
--   Winspace Winspace M6 Frameset
--     フレームはWinspace公式(Size M, unpainted, 900g)／フォークは非公式450g
--   Specialized Specialized Tarmac SL9
--     フレームはSpecialized公式(687g)／フォークは実測(weightisthekey)420g
--   BMC BMC Teammachine SLR 01 Frameset (Gen 5)
--     BMC公式＋BMC日本公式 https://e-ftb.co.jp/bmc/lineup/13102/ 「フレームの重さは塗装済みで54サイズの場合、わずか700gです。」
--   BMC BMC Teammachine R 01 Frameset (VAR)
--     BMC公式＋BMC日本公式 https://e-ftb.co.jp/bmc/lineup/12903/
--   BMC BMC Teammachine R 01 Frameset (V)
--     BMC公式＋BMC日本公式 https://e-ftb.co.jp/bmc/lineup/12113/
--   Cannondale Cannondale SuperSix EVO Carbon Frameset (Gen 5)
--     Cannondale公式SNAPシート https://s3.amazonaws.com/sparc.csg.assets/snap-sheet-library/cannondale/road/SuperSix%20EVO%20Snap%20Sheet.pdf 引用: SuperSix EVO Carbon: 915 grams / 450 grams（サイズ56、フォークはカット済み）
--   Cannondale Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)
--     Cannondale公式 https://www.cannondale.com/ja-jp/bikes/road/race/supersix-evo/supersix-evo-hi-mod-frameset-smu 「789g、399gのフォークと組み合わされる」
--   Cannondale Cannondale SuperSix EVO LAB71 Frameset (Gen 5)
--     Cannondale公式 https://www.cannondale.com/ja-jp/bikes/road/race/supersix-evo/supersix-evo-lab71-frameset 「755g、そして378gのフォークと組み合わされる」

PRAGMA foreign_keys = ON;

-- 1. フロントフォーク重量の出典が無いフレームを削除する(関連行は CASCADE で消える)。
--    保存ビルドから参照されている場合は FK(RESTRICT) で失敗するため、本番適用前に参照を確認する。
DELETE FROM parts
WHERE (brand_id = 5 AND name = 'Specialized Tarmac SL7')
   OR (brand_id = 6 AND name = 'Canyon Aeroad CFR')
   OR (brand_id = 2 AND name = 'Cannondale SystemSix Hi-MOD Frameset')
   OR (brand_id = 3 AND name = 'Bianchi Specialissima RC Frameset')
   OR (brand_id = 6 AND name = 'Canyon Ultimate CFR Frameset')
   OR (brand_id = 7 AND name = 'Giant TCR Advanced SL Frameset')
   OR (brand_id = 10 AND name = 'Pinarello Dogma X Frameset')
   OR (brand_id = 46 AND name = 'Ridley Falcn RS Frameset')
   OR (brand_id = 60 AND name = 'Lapierre Xelius DRS Team Replica Frameset')
   OR (brand_id = 61 AND name = 'Felt BREED FRD Framekit')
   OR (brand_id = 43 AND name = 'TIME Alpe d''Huez X Frameset');

-- 2. 重量を「フレーム＋フロントフォーク」の合計へ更新する。
-- Cervelo S5: フレーム703g + フォーク434g = 1137g
UPDATE parts
SET weight = 1137,
    description = 'HB19一体型コックピットと専用シートポストを含むフレームセット。重量はフレームの登録値です 重量はフレーム＋フロントフォークの合計(フレーム703g＋フォーク434g、条件は不明)。重量の出典: 参考値(非公式・別条件)。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 1 AND name = 'Cervelo S5';
-- Cannondale SuperSix EVO Hi-Mod: フレーム810g + フォーク410g = 1220g
UPDATE parts
SET weight = 1220,
    description = '重量はフレーム＋フロントフォークの合計(フレーム810g＋フォーク410g、サイズ56・塗装済み)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 2 AND name = 'Cannondale SuperSix EVO Hi-Mod';
-- Trek Madone SLR Gen7: フレーム1050g + フォーク418g = 1468g
UPDATE parts
SET weight = 1468,
    description = '重量はフレーム＋フロントフォークの合計(フレーム1050g＋フォーク418g、56cm・塗装済み)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 4 AND name = 'Trek Madone SLR Gen7';
-- Specialized Tarmac SL8: フレーム685g + フォーク390g = 1075g
UPDATE parts
SET weight = 1075,
    description = 'Tarmac Integrated StemとS-Works Tarmac SL8シートポスト付属。重量はフレーム単体の登録値です 重量はフレーム＋フロントフォークの合計(フレーム685g＋フォーク390g、56cm・塗装済み／フォークは実測)。重量の出典: 参考値(非公式・別条件)。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 5 AND name = 'Specialized Tarmac SL8';
-- Giant Propel Advanced SL: フレーム780g + フォーク381g = 1161g
UPDATE parts
SET weight = 1161,
    description = 'OverDrive Aero対応のGiant Contact SLRまたはContact SL Aeroコックピットが必要 重量はフレーム＋フロントフォークの合計(フレーム780g＋フォーク381g、フォークは実測)。重量の出典: 参考値(非公式・別条件)。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 7 AND name = 'Giant Propel Advanced SL';
-- Scott Foil RC: フレーム915g + フォーク533g = 1448g
UPDATE parts
SET weight = 1448,
    description = 'Foil専用Syncros Creston iC SL Aeroコックピットが必要 重量はフレーム＋フロントフォークの合計(フレーム915g＋フォーク533g、フォークは2026年モデルの実測)。重量の出典: 参考値(非公式・別条件)。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 8 AND name = 'Scott Foil RC';
-- Wilier Filante SLR: フレーム870g + フォーク360g = 1230g
UPDATE parts
SET weight = 1230,
    description = '重量はフレーム＋フロントフォークの合計(フレーム870g＋フォーク360g、±5%表記)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 9 AND name = 'Wilier Filante SLR';
-- Pinarello Dogma F: フレーム860g + フォーク432g = 1292g
UPDATE parts
SET weight = 1292,
    description = '重量はフレーム＋フロントフォークの合計(フレーム860g＋フォーク432g、サイズ53・未塗装／フォークは実測)。重量の出典: 参考値(非公式・別条件)。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 10 AND name = 'Pinarello Dogma F';
-- BMC Teammachine R 01: フレーム910g + フォーク395g = 1305g
UPDATE parts
SET weight = 1305,
    description = '重量はフレーム＋フロントフォークの合計(フレーム910g＋フォーク395g、塗装済み54サイズ・ハードウェアなし)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 11 AND name = 'BMC Teammachine R 01';
-- Merida Scultura: フレーム822g + フォーク407g = 1229g
UPDATE parts
SET weight = 1229,
    description = '重量はフレーム＋フロントフォークの合計(フレーム822g＋フォーク407g、サイズM／フォークは実測)。重量の出典: 参考値(非公式・別条件)。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 12 AND name = 'Merida Scultura';
-- Colnago V4Rs: フレーム790g + フォーク403g = 1193g
UPDATE parts
SET weight = 1193,
    description = '重量はフレーム＋フロントフォークの合計(フレーム790g＋フォーク403g、フォークは実測)。重量の出典: 参考値(非公式・別条件)。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 13 AND name = 'Colnago V4Rs';
-- Cannondale SuperSix EVO Carbon Frameset: フレーム915g + フォーク450g = 1365g
UPDATE parts
SET weight = 1365,
    description = '重量はフレーム＋フロントフォークの合計(フレーム915g＋フォーク450g、サイズ56・塗装済み)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 2 AND name = 'Cannondale SuperSix EVO Carbon Frameset';
-- Trek Madone SLR Gen 8 Frameset: フレーム796g + フォーク350g = 1146g
UPDATE parts
SET weight = 1146,
    description = '重量はフレーム＋フロントフォークの合計(フレーム796g＋フォーク350g、ML・塗装済み)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 4 AND name = 'Trek Madone SLR Gen 8 Frameset';
-- Trek Emonda SLR Disc Frameset: フレーム760g + フォーク381g = 1141g
UPDATE parts
SET weight = 1141,
    description = '重量はフレーム＋フロントフォークの合計(フレーム760g＋フォーク381g、56cm・塗装済み)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 4 AND name = 'Trek Emonda SLR Disc Frameset';
-- Specialized S-Works Aethos Frameset: フレーム585g + フォーク311g = 896g
UPDATE parts
SET weight = 896,
    description = '重量はフレーム＋フロントフォークの合計(フレーム585g＋フォーク311g、フォークはサイズ54の実測)。重量の出典: 参考値(非公式・別条件)。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 5 AND name = 'Specialized S-Works Aethos Frameset';
-- Scott Addict RC Ultimate Frameset: フレーム640g + フォーク372g = 1012g
UPDATE parts
SET weight = 1012,
    description = '重量はフレーム＋フロントフォークの合計(フレーム640g＋フォーク372g、フォークは実測)。重量の出典: 参考値(非公式・別条件)。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 8 AND name = 'Scott Addict RC Ultimate Frameset';
-- Wilier Verticale SLR Frameset: フレーム720g + フォーク320g = 1040g
UPDATE parts
SET weight = 1040,
    description = '重量はフレーム＋フロントフォークの合計(フレーム720g＋フォーク320g、±5%表記)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 9 AND name = 'Wilier Verticale SLR Frameset';
-- BMC Teammachine SLR 01 Frameset: フレーム700g + フォーク339g = 1039g
UPDATE parts
SET weight = 1039,
    description = '重量はフレーム＋フロントフォークの合計(フレーム700g＋フォーク339g、塗装済み54サイズ)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 11 AND name = 'BMC Teammachine SLR 01 Frameset';
-- Orbea Orca OMX Frameset: フレーム750g + フォーク360g = 1110g
UPDATE parts
SET weight = 1110,
    description = '重量はフレーム＋フロントフォークの合計(フレーム750g＋フォーク360g、サイズ53・塗装とハードウェア込み)。重量の出典: 参考値(非公式・別条件)。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 44 AND name = 'Orbea Orca OMX Frameset';
-- Factor OSTRO VAM 2.0 Frameset: フレーム820g + フォーク463g = 1283g
UPDATE parts
SET weight = 1283,
    description = 'Black Inc Integrated Aero Barstemと専用シートポストを含むパッケージ。重量はフレーム単体の登録値です 重量はフレーム＋フロントフォークの合計(フレーム820g＋フォーク463g、サイズ54・chrome/black塗装)。重量の出典: 参考値(非公式・別条件)。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 45 AND name = 'Factor OSTRO VAM 2.0 Frameset';
-- LOOK 795 Blade RS 3 Frameset: フレーム890g + フォーク340g = 1230g
UPDATE parts
SET weight = 1230,
    description = 'メーカー公称の代表サイズ。サイズと塗装により重量が変動します 重量はフレーム＋フロントフォークの合計(フレーム890g＋フォーク340g、代表サイズ)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 35 AND name = 'LOOK 795 Blade RS 3 Frameset';
-- Argon 18 Nitrogen Pro Frameset: フレーム950g + フォーク415g = 1365g
UPDATE parts
SET weight = 1365,
    description = 'ATTEN CHB-01一体型コックピット対応。専用エアロシートポスト付属。重量はフレーム単体(Mサイズ・塗装)のメーカー公称値。 重量はフレーム＋フロントフォークの合計(フレーム950g＋フォーク415g、Mサイズ・塗装。sub表記の上限値)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 59 AND name = 'Argon 18 Nitrogen Pro Frameset';
-- Basso SV Frame Kit: フレーム780g + フォーク370g = 1150g
UPDATE parts
SET weight = 1150,
    description = 'Fuga一体型コックピットとPiuma専用シートポスト付属。重量はサイズ53のフレーム単体公称値です 重量はフレーム＋フロントフォークの合計(フレーム780g＋フォーク370g、サイズ条件の記載なし)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 84 AND name = 'Basso SV Frame Kit';
-- Winspace M6 Frameset: フレーム900g + フォーク450g = 1350g
UPDATE parts
SET weight = 1350,
    description = '専用エアロシートポスト付属。重量はMサイズのフレーム単体公称値です 重量はフレーム＋フロントフォークの合計(フレーム900g＋フォーク450g、フレームはSize M・未塗装)。重量の出典: 参考値(非公式・別条件)。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 89 AND name = 'Winspace M6 Frameset';
-- Specialized Tarmac SL9: フレーム687g + フォーク420g = 1107g
UPDATE parts
SET weight = 1107,
    description = 'S-Works Rapide Post付属。重量はフレーム単体の公称値です 重量はフレーム＋フロントフォークの合計(フレーム687g＋フォーク420g、フォークは実測)。重量の出典: 参考値(非公式・別条件)。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 5 AND name = 'Specialized Tarmac SL9';
-- BMC Teammachine SLR 01 Frameset (Gen 5): フレーム700g + フォーク339g = 1039g
UPDATE parts
SET weight = 1039,
    description = 'BMC日本公式(13102等)。重量はフレーム単体(塗装済み54サイズ、公式)。フレームセット重量(付属品込み)は1455〜1565g。コックピットは別売。 重量はフレーム＋フロントフォークの合計(フレーム700g＋フォーク339g、塗装済み54サイズ)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 11 AND name = 'BMC Teammachine SLR 01 Frameset (Gen 5)';
-- BMC Teammachine R 01 Frameset (VAR): フレーム910g + フォーク395g = 1305g
UPDATE parts
SET weight = 1305,
    description = 'BMC日本公式(12903等)。重量はフレーム単体(BMC公称値、54サイズ。フォーク345gは別)。フレームセット重量(付属品込み)は1780g。コックピットは別売。 重量はフレーム＋フロントフォークの合計(フレーム910g＋フォーク395g、塗装済み54サイズ)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 11 AND name = 'BMC Teammachine R 01 Frameset (VAR)';
-- BMC Teammachine R 01 Frameset (V): フレーム910g + フォーク395g = 1305g
UPDATE parts
SET weight = 1305,
    description = 'BMC日本公式(12113等)。重量はフレーム単体(BMC公称値、54サイズ。フォーク345gは別)。フレームセット重量(付属品込み)は1805g。コックピットは別売。既存の Teammachine R 01(id 12, 913,000円)とは別行として登録。 重量はフレーム＋フロントフォークの合計(フレーム910g＋フォーク395g、塗装済み54サイズ)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 11 AND name = 'BMC Teammachine R 01 Frameset (V)';
-- Cannondale SuperSix EVO Carbon Frameset (Gen 5): フレーム915g + フォーク450g = 1365g
UPDATE parts
SET weight = 1365,
    description = 'Cannondale公式(C11284U)。価格はページ内JSON-LD(JPY)。重量はフレーム単体(56cm・塗装済み)。BSA 68mm、flat mount、Deltaステアラー、タイヤ最大30mm。C1 Aero 40 CarbonシートポストとAeroボトル/ケージ付属。 重量はフレーム＋フロントフォークの合計(フレーム915g＋フォーク450g、56cm・塗装済み)。フレームはCannondale公式商品ページの915g、フォークは公式SNAPシートの450g。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 2 AND name = 'Cannondale SuperSix EVO Carbon Frameset (Gen 5)';
-- Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5): フレーム789g + フォーク399g = 1188g
UPDATE parts
SET weight = 1188,
    description = 'Cannondale公式(C1133GU, Gen 5)。価格はページ内JSON-LD(JPY)。重量はフレーム＋フロントフォークの合計(フレーム789g＋フォーク399g、56cm・塗装済み)。BSA 68mm、flat mount、UDH、Deltaステアラー、タイヤ最大32mm。C1 Aero 40 Carbon V2(Ti)シートポストとAeroボトル/ケージ付属。 重量はフレーム＋フロントフォークの合計(フレーム789g＋フォーク399g、56cm・塗装済み)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 2 AND name = 'Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)';
-- Cannondale SuperSix EVO LAB71 Frameset (Gen 5): フレーム755g + フォーク378g = 1133g
UPDATE parts
SET weight = 1133,
    description = 'Cannondale公式(C1102GU, Gen 5)。価格はページ内JSON-LD(JPY)。重量はフレーム＋フロントフォークの合計(フレーム755g＋フォーク378g、56cm・塗装済み)。BSA 68mm、flat mount、UDH、Deltaステアラー、タイヤ最大32mm。C1 Aero 40 Carbon V2(Ti)シートポストとAeroボトル/ケージ付属。 重量はフレーム＋フロントフォークの合計(フレーム755g＋フォーク378g、56cm・塗装済み)。重量の出典: メーカー公式。',
    updated_at = CURRENT_TIMESTAMP
WHERE brand_id = 2 AND name = 'Cannondale SuperSix EVO LAB71 Frameset (Gen 5)';

-- 3. 重量の範囲と内訳を規格として登録する(再実行できるよう対象を先に消す)。
DELETE FROM part_specifications
WHERE spec_key IN ('weight_scope', 'frame_weight_g', 'fork_weight_g', 'weight_source')
  AND part_id IN (SELECT id FROM parts WHERE category_id = 1);

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, v.column3, v.column4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    (1, 'Cervelo S5', 'weight_scope', 'frame_and_fork'),
    (1, 'Cervelo S5', 'frame_weight_g', '703'),
    (1, 'Cervelo S5', 'fork_weight_g', '434'),
    (1, 'Cervelo S5', 'weight_source', 'reference'),
    (2, 'Cannondale SuperSix EVO Hi-Mod', 'weight_scope', 'frame_and_fork'),
    (2, 'Cannondale SuperSix EVO Hi-Mod', 'frame_weight_g', '810'),
    (2, 'Cannondale SuperSix EVO Hi-Mod', 'fork_weight_g', '410'),
    (2, 'Cannondale SuperSix EVO Hi-Mod', 'weight_source', 'official'),
    (4, 'Trek Madone SLR Gen7', 'weight_scope', 'frame_and_fork'),
    (4, 'Trek Madone SLR Gen7', 'frame_weight_g', '1050'),
    (4, 'Trek Madone SLR Gen7', 'fork_weight_g', '418'),
    (4, 'Trek Madone SLR Gen7', 'weight_source', 'official'),
    (5, 'Specialized Tarmac SL8', 'weight_scope', 'frame_and_fork'),
    (5, 'Specialized Tarmac SL8', 'frame_weight_g', '685'),
    (5, 'Specialized Tarmac SL8', 'fork_weight_g', '390'),
    (5, 'Specialized Tarmac SL8', 'weight_source', 'reference'),
    (7, 'Giant Propel Advanced SL', 'weight_scope', 'frame_and_fork'),
    (7, 'Giant Propel Advanced SL', 'frame_weight_g', '780'),
    (7, 'Giant Propel Advanced SL', 'fork_weight_g', '381'),
    (7, 'Giant Propel Advanced SL', 'weight_source', 'reference'),
    (8, 'Scott Foil RC', 'weight_scope', 'frame_and_fork'),
    (8, 'Scott Foil RC', 'frame_weight_g', '915'),
    (8, 'Scott Foil RC', 'fork_weight_g', '533'),
    (8, 'Scott Foil RC', 'weight_source', 'reference'),
    (9, 'Wilier Filante SLR', 'weight_scope', 'frame_and_fork'),
    (9, 'Wilier Filante SLR', 'frame_weight_g', '870'),
    (9, 'Wilier Filante SLR', 'fork_weight_g', '360'),
    (9, 'Wilier Filante SLR', 'weight_source', 'official'),
    (10, 'Pinarello Dogma F', 'weight_scope', 'frame_and_fork'),
    (10, 'Pinarello Dogma F', 'frame_weight_g', '860'),
    (10, 'Pinarello Dogma F', 'fork_weight_g', '432'),
    (10, 'Pinarello Dogma F', 'weight_source', 'reference'),
    (11, 'BMC Teammachine R 01', 'weight_scope', 'frame_and_fork'),
    (11, 'BMC Teammachine R 01', 'frame_weight_g', '910'),
    (11, 'BMC Teammachine R 01', 'fork_weight_g', '395'),
    (11, 'BMC Teammachine R 01', 'weight_source', 'official'),
    (12, 'Merida Scultura', 'weight_scope', 'frame_and_fork'),
    (12, 'Merida Scultura', 'frame_weight_g', '822'),
    (12, 'Merida Scultura', 'fork_weight_g', '407'),
    (12, 'Merida Scultura', 'weight_source', 'reference'),
    (13, 'Colnago V4Rs', 'weight_scope', 'frame_and_fork'),
    (13, 'Colnago V4Rs', 'frame_weight_g', '790'),
    (13, 'Colnago V4Rs', 'fork_weight_g', '403'),
    (13, 'Colnago V4Rs', 'weight_source', 'reference'),
    (2, 'Cannondale SuperSix EVO Carbon Frameset', 'weight_scope', 'frame_and_fork'),
    (2, 'Cannondale SuperSix EVO Carbon Frameset', 'frame_weight_g', '915'),
    (2, 'Cannondale SuperSix EVO Carbon Frameset', 'fork_weight_g', '450'),
    (2, 'Cannondale SuperSix EVO Carbon Frameset', 'weight_source', 'official'),
    (4, 'Trek Madone SLR Gen 8 Frameset', 'weight_scope', 'frame_and_fork'),
    (4, 'Trek Madone SLR Gen 8 Frameset', 'frame_weight_g', '796'),
    (4, 'Trek Madone SLR Gen 8 Frameset', 'fork_weight_g', '350'),
    (4, 'Trek Madone SLR Gen 8 Frameset', 'weight_source', 'official'),
    (4, 'Trek Emonda SLR Disc Frameset', 'weight_scope', 'frame_and_fork'),
    (4, 'Trek Emonda SLR Disc Frameset', 'frame_weight_g', '760'),
    (4, 'Trek Emonda SLR Disc Frameset', 'fork_weight_g', '381'),
    (4, 'Trek Emonda SLR Disc Frameset', 'weight_source', 'official'),
    (5, 'Specialized S-Works Aethos Frameset', 'weight_scope', 'frame_and_fork'),
    (5, 'Specialized S-Works Aethos Frameset', 'frame_weight_g', '585'),
    (5, 'Specialized S-Works Aethos Frameset', 'fork_weight_g', '311'),
    (5, 'Specialized S-Works Aethos Frameset', 'weight_source', 'reference'),
    (8, 'Scott Addict RC Ultimate Frameset', 'weight_scope', 'frame_and_fork'),
    (8, 'Scott Addict RC Ultimate Frameset', 'frame_weight_g', '640'),
    (8, 'Scott Addict RC Ultimate Frameset', 'fork_weight_g', '372'),
    (8, 'Scott Addict RC Ultimate Frameset', 'weight_source', 'reference'),
    (9, 'Wilier Verticale SLR Frameset', 'weight_scope', 'frame_and_fork'),
    (9, 'Wilier Verticale SLR Frameset', 'frame_weight_g', '720'),
    (9, 'Wilier Verticale SLR Frameset', 'fork_weight_g', '320'),
    (9, 'Wilier Verticale SLR Frameset', 'weight_source', 'official'),
    (11, 'BMC Teammachine SLR 01 Frameset', 'weight_scope', 'frame_and_fork'),
    (11, 'BMC Teammachine SLR 01 Frameset', 'frame_weight_g', '700'),
    (11, 'BMC Teammachine SLR 01 Frameset', 'fork_weight_g', '339'),
    (11, 'BMC Teammachine SLR 01 Frameset', 'weight_source', 'official'),
    (44, 'Orbea Orca OMX Frameset', 'weight_scope', 'frame_and_fork'),
    (44, 'Orbea Orca OMX Frameset', 'frame_weight_g', '750'),
    (44, 'Orbea Orca OMX Frameset', 'fork_weight_g', '360'),
    (44, 'Orbea Orca OMX Frameset', 'weight_source', 'reference'),
    (45, 'Factor OSTRO VAM 2.0 Frameset', 'weight_scope', 'frame_and_fork'),
    (45, 'Factor OSTRO VAM 2.0 Frameset', 'frame_weight_g', '820'),
    (45, 'Factor OSTRO VAM 2.0 Frameset', 'fork_weight_g', '463'),
    (45, 'Factor OSTRO VAM 2.0 Frameset', 'weight_source', 'reference'),
    (35, 'LOOK 795 Blade RS 3 Frameset', 'weight_scope', 'frame_and_fork'),
    (35, 'LOOK 795 Blade RS 3 Frameset', 'frame_weight_g', '890'),
    (35, 'LOOK 795 Blade RS 3 Frameset', 'fork_weight_g', '340'),
    (35, 'LOOK 795 Blade RS 3 Frameset', 'weight_source', 'official'),
    (59, 'Argon 18 Nitrogen Pro Frameset', 'weight_scope', 'frame_and_fork'),
    (59, 'Argon 18 Nitrogen Pro Frameset', 'frame_weight_g', '950'),
    (59, 'Argon 18 Nitrogen Pro Frameset', 'fork_weight_g', '415'),
    (59, 'Argon 18 Nitrogen Pro Frameset', 'weight_source', 'official'),
    (84, 'Basso SV Frame Kit', 'weight_scope', 'frame_and_fork'),
    (84, 'Basso SV Frame Kit', 'frame_weight_g', '780'),
    (84, 'Basso SV Frame Kit', 'fork_weight_g', '370'),
    (84, 'Basso SV Frame Kit', 'weight_source', 'official'),
    (89, 'Winspace M6 Frameset', 'weight_scope', 'frame_and_fork'),
    (89, 'Winspace M6 Frameset', 'frame_weight_g', '900'),
    (89, 'Winspace M6 Frameset', 'fork_weight_g', '450'),
    (89, 'Winspace M6 Frameset', 'weight_source', 'reference'),
    (5, 'Specialized Tarmac SL9', 'weight_scope', 'frame_and_fork'),
    (5, 'Specialized Tarmac SL9', 'frame_weight_g', '687'),
    (5, 'Specialized Tarmac SL9', 'fork_weight_g', '420'),
    (5, 'Specialized Tarmac SL9', 'weight_source', 'reference'),
    (11, 'BMC Teammachine SLR 01 Frameset (Gen 5)', 'weight_scope', 'frame_and_fork'),
    (11, 'BMC Teammachine SLR 01 Frameset (Gen 5)', 'frame_weight_g', '700'),
    (11, 'BMC Teammachine SLR 01 Frameset (Gen 5)', 'fork_weight_g', '339'),
    (11, 'BMC Teammachine SLR 01 Frameset (Gen 5)', 'weight_source', 'official'),
    (11, 'BMC Teammachine R 01 Frameset (VAR)', 'weight_scope', 'frame_and_fork'),
    (11, 'BMC Teammachine R 01 Frameset (VAR)', 'frame_weight_g', '910'),
    (11, 'BMC Teammachine R 01 Frameset (VAR)', 'fork_weight_g', '395'),
    (11, 'BMC Teammachine R 01 Frameset (VAR)', 'weight_source', 'official'),
    (11, 'BMC Teammachine R 01 Frameset (V)', 'weight_scope', 'frame_and_fork'),
    (11, 'BMC Teammachine R 01 Frameset (V)', 'frame_weight_g', '910'),
    (11, 'BMC Teammachine R 01 Frameset (V)', 'fork_weight_g', '395'),
    (11, 'BMC Teammachine R 01 Frameset (V)', 'weight_source', 'official'),
    (2, 'Cannondale SuperSix EVO Carbon Frameset (Gen 5)', 'weight_scope', 'frame_and_fork'),
    (2, 'Cannondale SuperSix EVO Carbon Frameset (Gen 5)', 'frame_weight_g', '915'),
    (2, 'Cannondale SuperSix EVO Carbon Frameset (Gen 5)', 'fork_weight_g', '450'),
    (2, 'Cannondale SuperSix EVO Carbon Frameset (Gen 5)', 'weight_source', 'official'),
    (2, 'Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)', 'weight_scope', 'frame_and_fork'),
    (2, 'Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)', 'frame_weight_g', '789'),
    (2, 'Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)', 'fork_weight_g', '399'),
    (2, 'Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)', 'weight_source', 'official'),
    (2, 'Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'weight_scope', 'frame_and_fork'),
    (2, 'Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'frame_weight_g', '755'),
    (2, 'Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'fork_weight_g', '378'),
    (2, 'Cannondale SuperSix EVO LAB71 Frameset (Gen 5)', 'weight_source', 'official')
) AS v
JOIN parts p
  ON p.brand_id = v.column1 AND p.name = v.column2;

-- 4. フロントフォークの規格(コラム規格・フロントアクスル)。出典が確認できたフレームから順に登録する。
DELETE FROM part_specifications
WHERE spec_key IN ('steerer_standard', 'front_axle')
  AND part_id IN (
    SELECT id FROM parts
    WHERE brand_id = 2
      AND name IN (
        'Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)',
        'Cannondale SuperSix EVO LAB71 Frameset (Gen 5)'
      )
  );

INSERT INTO part_specifications (part_id, spec_key, spec_value, created_at, updated_at)
SELECT p.id, v.column2, v.column3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
    ('Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)', 'steerer_standard', 'cannondale_delta'),
    ('Cannondale SuperSix EVO Hi-MOD Frameset (Gen 5)', 'front_axle',       '12x100'),
    ('Cannondale SuperSix EVO LAB71 Frameset (Gen 5)',  'steerer_standard', 'cannondale_delta'),
    ('Cannondale SuperSix EVO LAB71 Frameset (Gen 5)',  'front_axle',       '12x100')
) AS v
JOIN parts p
  ON p.brand_id = 2 AND p.name = v.column1;
