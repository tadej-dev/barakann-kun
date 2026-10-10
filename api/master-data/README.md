# フレームのマスターデータ登録

この文書は、フレームをマスターデータ（D1）へ登録するときに揃える情報と、その手順をまとめる。対象は `api/migrations` に追加するマイグレーションであり、スキーマが作成済みであることを前提とする。TTバイクは登録しない。

## 登録するもの

フレーム1台は、本体1行と、規格・占有カテゴリ・同梱付属品の行で構成する。内容ごとの置き場所を次に示す。

| 内容 | テーブル |
|---|---|
| 名前・価格・重量・年式 | `parts` |
| 適合判定に使う規格 | `part_specifications` |
| 専用パーツが占有するカテゴリ | `part_blocked_categories` |
| 同梱する付属品 | `part_included_items` |

ブランドが未登録なら、先に `brands` に1行追加する。`brands.name` は一意である。

## フレーム本体（parts）

本体の行では、カテゴリを `frame`、ブランドを登録済みのものに合わせる。列と必須の別を次に示す。

| 列 | 必須 | 内容 |
|---|---|---|
| `category_id` | ○ | `1`（frame） |
| `brand_id` | ○ | `brands.id` |
| `name` | ○ | 表示名 |
| `model_name` | ○ | 製品名。重複判定にも使う |
| `variant_name` | | 色や仕様の別 |
| `model_year` | | 年式。未確認は NULL |
| `edition` | | 世代名（例: `Gen 5`） |
| `price` | ○ | 円・税込の整数 |
| `price_updated_at` | ○ | 価格の時点 |
| `weight` | ○ | グラム |
| `description` | ○ | 重量の基準や出典のメモ |
| `created_at` | ○ | `CURRENT_TIMESTAMP` |
| `updated_at` | ○ | `CURRENT_TIMESTAMP` |

価格と重量は出典のある値だけを登録する。0は値として使わない。見付からない場合はそのフレームを登録しない。重量は、フレーム単体の値か、付属品を含むフレームセット重量かを `description` に書く。この区別は、同梱付属品の重量を完成重量へ加算するかどうか（「同梱付属品」の節）に対応する。

`parts` には `(brand_id, model_name, variant_name, model_year, edition)` の一意制約がある。同じ名称のフレームでも、世代や年式が違えば `edition` や `model_year` を分けて登録する。

## 適合判定に使う規格（part_specifications）

適合判定に使う規格は、次の10件を登録する。値の列はすべて TEXT であり、数値も `"32"` のように文字列として入れる。1パーツにつき同じ `spec_key` は1行だけである。

| `spec_key` | 判定の相手 | 値の例 |
|---|---|---|
| `wheel_diameter` | ホイール | `700C` |
| `bb_standard` | ボトムブラケット | `bb86`、`bsa`、`t47_68` など |
| `brake_mount` | ブレーキキャリパー | `flat_mount`、`post_mount` |
| `max_tire_width_mm` | タイヤ | `32` |
| `cockpit_interface` | ハンドル・ステム | `bmc_ics`、`deda_dcr`、`fsa_acr` など |
| `cockpit_connection` | ステムの選択 | `either`、`integrated_only`、`stem` |
| `cockpit_system` | サードパーティ製コックピット | `deda_dcr`、`fsa_acr` など |
| `cockpit_replaceable` | 付属コックピットの交換 | `true` |
| `seatpost_diameter_mm` | シートポスト | `27.2` |
| `handlebar_clamp_mm` | 専用ステムに付けるハンドル | `31.8` |

`bb_standard`、`brake_mount`、`cockpit_connection`、`cockpit_interface`、`cockpit_system` は、アプリ側が判定に使うトークンを登録する。値を独自に作ると、対応するパーツと一致しない。

## 専用パーツの占有（part_blocked_categories）

専用のシートポストや一体型コックピットが付属するフレームでは、そのカテゴリを他の候補から選べないようにする。`part_id` と `category_id` の組を1行にする。主なカテゴリIDを次に示す。

| `category_id` | カテゴリ |
|---|---|
| `9` | ボトムブラケット |
| `13` | ホイール |
| `14` | タイヤ |
| `16` | ハンドル |
| `17` | ステム |
| `19` | シートポスト |
| `20` | サドル |

専用シートポストが付属するフレームは `19` を、一体型コックピットが付属するフレームは `16` と `17` を占有させる。

## フロントフォーク

ロードフレームはフロントフォークとセットで売られ、フォークだけを選ぶ場面はない。そのためフォークはカテゴリにせず、フレームの重量に含めて登録する。フォークを別のカテゴリにすると、選べるフォークが無いまま「未選択」の枠だけが残る。

フレームの `weight` は「フレーム＋フロントフォーク」の合計にする。商品ページにフレームセット重量としての公表値が無い場合は、同じページにあるフレーム重量とフォーク重量を足す。足し算の内訳は画面の重量欄の2行目に「(755g + 378g)」と出るため、`frame_weight_g` と `fork_weight_g` に元の2つの値を登録する。

| `spec_key` | 内容 | 値の例 |
|---|---|---|
| `weight_scope` | 重量に含む範囲 | `frame_and_fork`（フレーム＋フロントフォーク） |
| `frame_weight_g` | フレーム単体の重量 | `755` |
| `fork_weight_g` | フロントフォークの重量 | `378` |
| `weight_source` | 重量の出典 | `official`（メーカー公式）、`reference`（参考値） |
| `steerer_standard` | コラム規格 | `cannondale_delta` など |
| `front_axle` | フロントアクスル | `12x100` |
| `brake_mount` | ブレーキマウント（フォーク側も同じ値） | `flat_mount` |
| `max_tire_width_mm` | 対応タイヤ幅（フレームとフォークの小さい方） | `32` |

`weight_scope` は画面の「フォーク込み」バッジの根拠になる。`weight_scope` を登録したフレームでは、内訳（`frame_weight_g`・`fork_weight_g`）と `weight_source` を必ず揃える。欠落と、内訳の合計が `weight` と一致しない状態は `npm run master:audit` が指摘する。

重量の内訳とフォークの規格は、登録を進める単位が違う。内訳はすべてのフレームで揃えるのに対し、`steerer_standard` と `front_axle` は出典のあるフレームから順に登録する。監査は、内訳が揃っていれば規格の未登録を指摘せず、未登録の件数を進捗として表示する。

出典は、フレームとフォークで同じソース・同じ条件（サイズ・塗装）の組を優先する。メーカー公式に無い場合は、主要メディア・正規販売店・スペック集約サイト・実測値を使い、`weight_source` に `reference` を登録する。画面では「フォーク込み・参考値」と出る。

フォーク重量が公式・非公式のどちらにも無いフレームは、フレーム＋フォークの重量を確定できないため登録しない（既存の登録は削除する）。

## 同梱付属品（part_included_items）

同梱する付属品は1件1行で登録する。列と必須の別を次に示す。

| 列 | 必須 | 内容 |
|---|---|---|
| `part_id` | ○ | フレームのID |
| `item_name` | ○ | 付属品名 |
| `quantity` | ○ | 個数。既定は1 |
| `included_category_id` | ○ | 付属品のカテゴリID |
| `weight` | ○ | グラム。0は使わない |
| `price` | | 参考価格。合計には加算しない |
| `is_set_component` | ○ | 0は完成重量へ加算、1は加算しない |

フレームの `weight` が付属品込みのフレームセット重量のときは、その付属品の `is_set_component` を1にする。1にしないと、完成重量で付属品の分を二重に数える。フレーム単体重量を登録したときは0にする。

## 出典と未確認値

マイグレーションの冒頭に、出典のURLと時点を書く。規格と数値は原文を取得して照合する。出典が見付からない値は推測で埋めず、`weight` と `price` は0のままにし、未登録として報告する。

## 登録手順

1. `brands` に対象ブランドがあるか確認し、無ければ追加する。
2. `parts` に本体1行を追加する。
3. `part_specifications` に10件の規格を追加する。
4. 専用パーツがあれば `part_blocked_categories` に追加する。
5. 同梱付属品を `part_included_items` に追加する（同梱フォークもここへ含める）。
6. 先頭に出典のコメントを書く。
7. `npm run db:migrate:local` でローカルに適用する。
8. `npm run master:export` で `master-data.sql` を更新する。
9. `npm run master:audit` で付属品の登録漏れ・重量0・プラットフォーム内の不揃いがないか確認する。

同じマイグレーションを再適用しても重複しないよう、対象を先に `DELETE` してから `INSERT` する。`parts.id` は自動採番なので、規格から参照するときは名称で引く。

## 登録後の更新

フレームを登録・変更したら、`master-data.sql` を同じ変更に含める。手順は `npm run master:export`（`api` ディレクトリ）である。生成物は毎回同じ内容なら同じバイト列になるため、差分は変更した行だけになる。
