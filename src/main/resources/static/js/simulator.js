// 「構成1〜4」などの構成切り替えボタンをすべて取得する
const configButtons = document.querySelectorAll(".config-button");

// 「フレーム」「コンポ」「ホイール」などのカテゴリ切り替えボタンをすべて取得する
const partCategoryButtons = document.querySelectorAll(".part-category-button");

// 合計金額を表示するHTML要素を取得する
const totalPrice = document.getElementById("total-price");

// 合計重量を表示するHTML要素を取得する
const totalWeight = document.getElementById("total-weight");

// 選択済みパーツ一覧を表示するテーブル本体を取得する
const selectedPartsTable = document.getElementById("selected-parts-table");

// 候補パーツ一覧の見出しを表示するHTML要素を取得する
const candidateTitle = document.getElementById("candidate-title");

// 候補パーツ一覧を表示するテーブル本体を取得する
const candidateTableBody = document.getElementById("candidate-table-body");

// 候補一覧の並び替え対象とするプロパティを表示順に定義する
const candidateSortKeys = ["name", "weight", "price"];

// 並び替え状態に対応する線画SVGアイコンを返す
function createSortIndicatorMarkup(isActive, direction) {
    // 未選択時は上下両方向のシンプルなアイコンを表示する
    if (!isActive) {
        return `
            <svg
                class="h-4 w-4 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m8 9 4-4 4 4m0 6-4 4-4-4"
                />
            </svg>
        `;
    }

    // 選択中は現在の並び順に合わせて上向き・下向きを切り替える
    const path = direction === "asc"
        ? "M12 19V5m0 0-5 5m5-5 5 5"
        : "M12 5v14m0 0 5-5m-5 5-5-5";

    return `
        <svg
            class="h-4 w-4 text-sky-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="${path}"
            />
        </svg>
    `;
}

// HTMLに並び替えボタンがなければ、候補テーブルの見出しから自動生成する
function initializeCandidateSortButtons() {
    // HTML側ですでに用意されているボタンを取得する
    const existingButtons = Array.from(
        document.querySelectorAll(".candidate-sort-button"),
    );

    // すでに存在する場合はそのまま利用する
    if (existingButtons.length > 0) {
        return existingButtons;
    }

    // 候補テーブルが見つからない場合は空配列を返す
    if (!candidateTableBody) {
        return [];
    }

    // 候補テーブルの先頭3列（製品名・重量・価格）の見出しを取得する
    const headers = Array.from(
        candidateTableBody.closest("table")?.querySelectorAll("thead th") || [],
    ).slice(0, candidateSortKeys.length);

    // 各見出しをクリック可能なボタンへ変換する
    return headers.map((header, index) => {
        const label = header.textContent.trim();
        const button = document.createElement("button");
        const indicator = document.createElement("span");

        button.type = "button";
        button.className =
            "candidate-sort-button flex w-full items-center gap-2 text-left";
        button.dataset.sortKey = candidateSortKeys[index];

        indicator.dataset.sortIndicator = "";
        indicator.setAttribute("aria-hidden", "true");
        indicator.innerHTML = createSortIndicatorMarkup(false, "asc");

        button.append(document.createTextNode(label), indicator);

        header.textContent = "";
        header.setAttribute("aria-sort", "none");
        header.appendChild(button);

        return button;
    });
}

// 候補一覧の並び替えボタンを取得または生成する
const candidateSortButtons = initializeCandidateSortButtons();

// 現在の並び替え条件を保持する
let candidateSortKey = null;
let candidateSortDirection = "asc";

// 構成保存ボタンを取得する
const saveConfigButton = document.getElementById("save-config-button");

// 保存済み構成削除ボタンを取得する
const deleteSavedConfigButton = document.getElementById("delete-saved-config-button");

// 保存・削除時のメッセージ表示用HTML要素を取得する
const configSaveMessage = document.getElementById("config-save-message");

// localStorageに保存するときのキー名を定義する
const STORAGE_KEY = "barakann-simulator-configs-v1";

/**
 * Thymeleafで生成されたカテゴリボタンからカテゴリ情報を作る
 */

// カテゴリボタンのNodeListを配列に変換し、カテゴリ情報の配列を作成する
const categories = Array.from(partCategoryButtons).map((button) => {
    // 1つのカテゴリボタンからカテゴリキーと表示名を取り出して返す
    return {
        // data-category属性の値をカテゴリキーとして使う
        key: button.dataset.category,

        // data-category-label属性の値をカテゴリ表示名として使う
        label: button.dataset.categoryLabel,
    };
});

// カテゴリ情報からカテゴリキーだけを取り出し、表示順の配列を作る
const categoryOrder = categories.map((category) => category.key);

// カテゴリキーからカテゴリ表示名を取得できるオブジェクトを作る
const categoryLabels = Object.fromEntries(
    // 例: [["frame", "フレーム"], ["component", "コンポ"], ...] の形式に変換する
    categories.map((category) => [category.key, category.label]),
);

// カテゴリごとの候補パーツ一覧を格納するオブジェクトを作る
const partCandidates = Object.fromEntries(
    // 初期状態では各カテゴリの候補パーツを空配列にしておく
    categoryOrder.map((category) => [category, []]),
);

// 初期選択されている構成ボタンを取得する
const initialActiveConfigButton =
    // aria-selected="true" の構成ボタンがあればそれを使う
    document.querySelector(".config-button[aria-selected='true']") ||
    // なければ最初の構成ボタンを使う
    configButtons[0];

// 初期選択されているカテゴリボタンを取得する
const initialActiveCategoryButton =
    // aria-selected="true" のカテゴリボタンがあればそれを使う
    document.querySelector(".part-category-button[aria-selected='true']") ||
    // なければ最初のカテゴリボタンを使う
    partCategoryButtons[0];

// 現在選択中の構成番号を保持する
let activeConfig = initialActiveConfigButton?.dataset.config || "1";

// 現在選択中のカテゴリを保持する
let activeCategory = initialActiveCategoryButton?.dataset.category || categoryOrder[0];

// 構成ごとの選択パーツ状態を作成する
let configStates = Object.fromEntries(
    // 各構成ボタンごとに、空の選択状態を作る
    Array.from(configButtons).map((button) => [
        // 構成番号をキーにする
        button.dataset.config,

        // その構成の初期状態として、すべて未選択の状態を入れる
        createEmptySelectedParts(),
    ]),
);

// 現在選択中の構成に対応する選択パーツ情報を保持する
let selectedParts = configStates[activeConfig];

// すべてのカテゴリが未選択の状態を作成する関数
function createEmptySelectedParts() {
    // カテゴリキーを使って、カテゴリごとの値を null にしたオブジェクトを返す
    return Object.fromEntries(
        // 例: { frame: null, component: null, wheel: null } を作る
        categoryOrder.map((category) => [category, null]),
    );
}

// 指定されたカテゴリのパーツ一覧をAPIから取得する関数
async function fetchPartsByCategory(category) {
    // /api/parts に category クエリパラメータを付けてリクエストする
    const response = await fetch(
        // categoryの値はURL用にエンコードして安全に渡す
        `/api/parts?category=${encodeURIComponent(category)}`,
    );

    // レスポンスが正常でない場合はエラーを投げる
    if (!response.ok) {
        // 呼び出し元の catch で扱えるように例外を発生させる
        throw new Error("パーツデータの取得に失敗しました");
    }

    // レスポンス本文をJSONとして読み取り、呼び出し元へ返す
    return await response.json();
}

// シミュレーター画面の初期化処理を行う関数
async function initializeSimulator() {
    // カテゴリ順にAPIから候補パーツを取得する
    for (const category of categoryOrder) {
        // 取得したパーツ一覧をカテゴリごとの候補データに保存する
        partCandidates[category] = await fetchPartsByCategory(category);
    }

    // localStorageから保存済みのシミュレーター状態を読み込む
    const savedState = loadSavedSimulatorState();

    // 保存済みデータがある場合
    if (savedState) {
        // 保存済みデータを現在の画面状態へ復元する
        restoreSimulatorState(savedState);
    } else {
        // 保存済みデータがなければ、現在の構成の初期状態を使う
        selectedParts = configStates[activeConfig];
    }

    // 構成ボタンの表示状態を更新する
    renderConfigButtons();

    // カテゴリボタンの表示状態を更新する
    renderPartCategoryButtons();

    // 選択済みパーツ表を描画する
    renderSelectedPartsTable();

    // 候補パーツ表を描画する
    renderCandidateTable();

    // 合計金額・合計重量を更新する
    updateSummary();
}

// 2つのパーツが同じものか判定する関数
function isSamePart(partA, partB) {
    // どちらかが存在しない場合は同じパーツではない
    if (!partA || !partB) {
        // falseを返して処理を終了する
        return false;
    }

    // 両方にidがある場合
    if (partA.id != null && partB.id != null) {
        // idが完全一致するかどうかで同一判定する
        return partA.id === partB.id;
    }

    // idがない場合は名前が一致するかどうかで同一判定する
    return partA.name === partB.name;
}

// 金額を日本円表記に整形する関数
function formatPrice(price) {
    // 例: 128000 → ¥128,000 の形式にして返す
    return `¥${price.toLocaleString("ja-JP")}`;
}

// 重量をグラム表記に整形する関数
function formatWeightGram(weight) {
    // 例: 2500 → 2,500g の形式にして返す
    return `${weight.toLocaleString("ja-JP")}g`;
}

// 合計重量をkg表記に整形する関数
function formatTotalWeight(weight) {
    // グラムをkgに変換し、小数第2位まで表示する
    return `${(weight / 1000).toFixed(2)} kg`;
}

// 選択済みパーツの合計金額を計算する関数
function calculateTotalPrice(parts) {
    // カテゴリごとに金額を足し合わせる
    return categoryOrder.reduce((sum, category) => {
        // パーツが選択されていればpriceを足し、未選択なら0を足す
        return sum + (parts?.[category]?.price || 0);
    }, 0);
}

// 選択済みパーツの合計重量を計算する関数
function calculateTotalWeight(parts) {
    // カテゴリごとに重量を足し合わせる
    return categoryOrder.reduce((sum, category) => {
        // パーツが選択されていればweightを足し、未選択なら0を足す
        return sum + (parts?.[category]?.weight || 0);
    }, 0);
}

// 合計金額・合計重量の表示を更新する関数
function updateSummary() {
    // 現在選択中のパーツから合計金額を計算する
    const totalPriceValue = calculateTotalPrice(selectedParts);

    // 現在選択中のパーツから合計重量を計算する
    const totalWeightValue = calculateTotalWeight(selectedParts);

    // 合計金額のHTML表示を更新する
    totalPrice.textContent = formatPrice(totalPriceValue);

    // 合計重量のHTML表示を更新する
    totalWeight.textContent = formatTotalWeight(totalWeightValue);
}

// localStorageに保存しやすい構成データを作る関数
function createSerializableConfigStates() {
    // configStatesを保存用のオブジェクトに変換する
    return Object.fromEntries(
        // 構成番号と選択パーツ情報を1つずつ処理する
        Object.entries(configStates).map(([configId, parts]) => {
            // 構成番号と、その構成で選択されているパーツID情報を返す
            return [
                // 構成番号をキーにする
                configId,

                // カテゴリごとに、選択済みパーツのidだけを保存する
                Object.fromEntries(
                    // パーツオブジェクト全体ではなく、復元に必要なidだけを保存する
                    categoryOrder.map((category) => {
                        // 選択済みならidを、未選択ならnullを入れる
                        return [category, parts?.[category]?.id || null];
                    }),
                ),
            ];
        }),
    );
}

// 現在の構成に未選択のパーツがあるか判定する関数
function hasUnselectedParts() {
    // 1つでも未選択のカテゴリがあればtrueを返す
    return categoryOrder.some((category) => {
        // selectedParts[category] が空なら未選択と判定する
        return !selectedParts[category];
    });
}

// 現在のシミュレーター状態を保存する関数
function saveSimulatorState() {
    // 保存するデータをオブジェクトとして作成する
    const saveData = {
        // 保存データのバージョン番号を入れる
        version: 1,

        // 現在選択中の構成番号を保存する
        activeConfig,

        // 構成ごとの選択パーツIDを保存する
        configs: createSerializableConfigStates(),
    };

    // 保存用データをJSON文字列に変換してlocalStorageへ保存する
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));

    // 未選択パーツがある場合
    if (hasUnselectedParts()) {
        // 未選択があることを含めた保存完了メッセージを表示する
        showSaveMessage("未選択のパーツがありますが、構成を保存しました");
    } else {
        // 通常の保存完了メッセージを表示する
        showSaveMessage("構成を保存しました");
    }
}

// localStorageから保存済みのシミュレーター状態を読み込む関数
function loadSavedSimulatorState() {
    // localStorageから保存済み文字列を取得する
    const savedText = localStorage.getItem(STORAGE_KEY);

    // 保存データが存在しない場合
    if (!savedText) {
        // nullを返して保存データなしとして扱う
        return null;
    }

    // JSON変換時のエラーに備える
    try {
        // 保存済み文字列をJavaScriptオブジェクトに変換して返す
        return JSON.parse(savedText);
    } catch (error) {
        // JSONとして壊れている場合はエラー内容をコンソールに出す
        console.error(error);

        // 壊れた保存データをlocalStorageから削除する
        localStorage.removeItem(STORAGE_KEY);

        // 復元できないためnullを返す
        return null;
    }
}

// 保存済みデータを現在の画面状態に復元する関数
function restoreSimulatorState(savedState) {
    // 保存データがない、またはconfigsがない場合は何もしない
    if (!savedState || !savedState.configs) {
        // 処理を終了する
        return;
    }

    // 現在存在する構成番号を1つずつ処理する
    Object.keys(configStates).forEach((configId) => {
        // 保存データ内に該当構成があれば取得し、なければ空オブジェクトを使う
        const savedConfig = savedState.configs[configId] || {};

        // 保存されていたパーツIDを実際のパーツオブジェクトに戻す
        configStates[configId] = Object.fromEntries(
            // カテゴリごとに保存済みパーツIDを復元する
            categoryOrder.map((category) => {
                // そのカテゴリに保存されているパーツIDを取得する
                const savedPartId = savedConfig[category];

                // パーツIDから候補パーツを探し、カテゴリごとの選択状態として返す
                return [category, findPartById(category, savedPartId)];
            }),
        );
    });

    // 保存されていたアクティブ構成が現在も存在する場合
    if (configStates[savedState.activeConfig]) {
        // 保存されていた構成番号を現在のアクティブ構成にする
        activeConfig = savedState.activeConfig;
    }

    // アクティブカテゴリはHTML側の初期選択、または最初のカテゴリに戻す
    activeCategory = initialActiveCategoryButton?.dataset.category || categoryOrder[0];

    // 現在の構成に対応する選択パーツ情報をセットする
    selectedParts = configStates[activeConfig];
}

// カテゴリとパーツIDから該当パーツを探す関数
function findPartById(category, partId) {
    // パーツIDがない場合は復元できない
    if (partId == null) {
        // 未選択としてnullを返す
        return null;
    }

    // 指定カテゴリの候補パーツ一覧からidが一致するパーツを探す
    return (partCandidates[category] || []).find((part) => {
        // 数値と文字列の違いを吸収するため、Stringに変換して比較する
        return String(part.id) === String(partId);
    }) || null;
}

// 現在の構成が空かどうか判定する関数
function isCurrentConfigEmpty() {
    // すべてのカテゴリが未選択ならtrueを返す
    return categoryOrder.every((category) => {
        // パーツが選択されていないかを確認する
        return !selectedParts[category];
    });
}

// 現在の構成の選択状態を削除する関数
function deleteCurrentConfigState() {
    // 現在の構成をすべて未選択の状態に戻す
    configStates[activeConfig] = createEmptySelectedParts();

    // 現在参照している選択状態も、空にした構成へ切り替える
    selectedParts = configStates[activeConfig];

    // 削除後の保存データを作成する
    const saveData = {
        // 保存データのバージョン番号を入れる
        version: 1,

        // 現在選択中の構成番号を保存する
        activeConfig,

        // 構成ごとの選択パーツIDを保存する
        configs: createSerializableConfigStates(),
    };

    // 削除後の状態をlocalStorageへ保存する
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));

    // 構成ボタンの表示状態を更新する
    renderConfigButtons();

    // カテゴリボタンの表示状態を更新する
    renderPartCategoryButtons();

    // 選択済みパーツ表を再描画する
    renderSelectedPartsTable();

    // 候補パーツ表を再描画する
    renderCandidateTable();

    // 合計金額・合計重量を更新する
    updateSummary();

    // 削除完了メッセージを表示する
    showSaveMessage(`構成${activeConfig}をクリアしました`);
}

// 保存・削除メッセージを表示する関数
function showSaveMessage(message) {
    // メッセージ表示用要素が存在しない場合
    if (!configSaveMessage) {
        // 何もせず処理を終了する
        return;
    }

    // メッセージ表示用要素に文言をセットする
    configSaveMessage.textContent = message;

    // 3秒後にメッセージを消す
    setTimeout(() => {
        // メッセージ表示を空にする
        configSaveMessage.textContent = "";
    }, 3000);
}

// 構成ボタンの表示状態を更新する関数
function renderConfigButtons() {
    // すべての構成ボタンを1つずつ処理する
    configButtons.forEach((button) => {
        // ボタンのdata-config属性から構成番号を取得する
        const configId = button.dataset.config;

        // このボタンが現在選択中の構成かどうかを判定する
        const isSelected = configId === activeConfig;

        // aria-selected属性を更新し、選択状態をHTML上にも反映する
        button.setAttribute("aria-selected", String(isSelected));

        // ボタン内の金額表示要素を取得する
        const priceElement =
            // data-config-price属性付きの要素があれば優先して取得する
            button.querySelector("[data-config-price]") ||
            // なければ2番目のp要素を金額表示として扱う
            button.querySelectorAll("p")[1];

        // 金額表示要素が存在する場合
        if (priceElement) {
            // この構成の合計金額を計算する
            const configTotalPrice = calculateTotalPrice(configStates[configId]);

            // 金額表示要素のテキストを更新する
            priceElement.textContent = formatPrice(configTotalPrice);
        }
    });
}

// 選択済みパーツ一覧テーブルを描画する関数
function renderSelectedPartsTable() {
    // 現在のテーブル内容を一度すべて空にする
    selectedPartsTable.innerHTML = "";

    // カテゴリ順に1行ずつ作成する
    categoryOrder.forEach((category) => {
        // このカテゴリで選択されているパーツを取得する
        const part = selectedParts[category];

        // このカテゴリが現在アクティブなカテゴリか判定する
        const isActiveCategory = category === activeCategory;

        // テーブル行tr要素を作成する
        const row = document.createElement("tr");

        // アクティブカテゴリの場合は背景色を付け、それ以外はホバー時の背景色を付ける
        row.className = isActiveCategory
            ? "cursor-pointer bg-sky-50"
            : "cursor-pointer hover:bg-slate-50";

        // パーツが未選択の場合
        if (!part) {
            // 未選択状態の行HTMLを作成する
            row.innerHTML = `
                <td class="px-4 py-4">${categoryLabels[category]}</td>
                <td class="px-4 py-4 font-semibold text-slate-400">未選択</td>
                <td class="px-4 py-4 whitespace-nowrap">-</td>
                <td class="px-4 py-4 whitespace-nowrap">-</td>
                <td class="px-4 py-4">
                    <button
                        type="button"
                        class="inline-flex h-9 w-20 items-center justify-center rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:border-sky-500 hover:bg-sky-50 hover:text-sky-700"
                        data-table-category="${category}"
                    >
                        選択
                    </button>
                </td>
            `;
        } else {
            // パーツ選択済み状態の行HTMLを作成する
            row.innerHTML = `
                <td class="px-4 py-4">${categoryLabels[category]}</td>
                <td class="px-4 py-4 font-semibold truncate">${part.name}</td>
                <td class="px-4 py-4 whitespace-nowrap">${formatWeightGram(part.weight)}</td>
                <td class="px-4 py-4 whitespace-nowrap">${formatPrice(part.price)}</td>
                <td class="px-4 py-4">
                    <button
                        type="button"
                        class="${
                isActiveCategory
                    ? "inline-flex h-9 w-20 items-center justify-center rounded-md border border-sky-500 bg-sky-500 text-xs font-bold text-white"
                    : "inline-flex h-9 w-20 items-center justify-center rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:border-sky-500 hover:bg-sky-50 hover:text-sky-700"
            }"
                        data-table-category="${category}"
                    >
                        ${isActiveCategory ? "選択中" : "選択"}
                    </button>
                </td>
            `;
        }

        // 行クリック時に、そのカテゴリをアクティブカテゴリにする
        row.addEventListener("click", () => {
            // クリックされた行のカテゴリへ切り替える
            setActiveCategory(category);
        });

        // 作成した行を選択済みパーツテーブルへ追加する
        selectedPartsTable.appendChild(row);
    });

    // 選択済みパーツ表の中にあるカテゴリ選択ボタンをすべて取得する
    const tableCategoryButtons = document.querySelectorAll(
        // data-table-category属性が付いたボタンを対象にする
        "[data-table-category]",
    );

    // 選択済みパーツ表のボタンを1つずつ処理する
    tableCategoryButtons.forEach((button) => {
        // ボタンクリック時の処理を登録する
        button.addEventListener("click", (event) => {
            // 行クリックの処理まで同時に発火しないようにする
            event.stopPropagation();

            // ボタンに設定されているカテゴリをアクティブカテゴリにする
            setActiveCategory(button.dataset.tableCategory);
        });
    });
}

// 候補パーツを現在の条件で並び替える関数
function sortCandidateParts(parts) {
    // 並び替え未選択の場合は元の表示順を維持する
    if (!candidateSortKey) {
        return [...parts];
    }

    // 元の候補配列を変更しないようコピーしてから並び替える
    return [...parts].sort((partA, partB) => {
        let comparison;

        // 製品名は日本語ロケールを使って文字列として比較する
        if (candidateSortKey === "name") {
            comparison = String(partA.name).localeCompare(
                String(partB.name),
                "ja",
                {
                    numeric: true,
                    sensitivity: "base",
                },
            );
        } else {
            // 重量と価格は数値として比較する
            comparison =
                Number(partA[candidateSortKey]) -
                Number(partB[candidateSortKey]);
        }

        // 同じ値の場合は製品名の昇順で表示順を安定させる
        if (comparison === 0) {
            return String(partA.name).localeCompare(
                String(partB.name),
                "ja",
                {
                    numeric: true,
                    sensitivity: "base",
                },
            );
        }

        // 現在の昇順・降順設定に合わせて比較結果を返す
        return candidateSortDirection === "asc"
            ? comparison
            : -comparison;
    });
}

// 候補一覧の見出しと矢印表示を更新する関数
function updateCandidateSortHeaders() {
    candidateSortButtons.forEach((button) => {
        const isActive =
            button.dataset.sortKey === candidateSortKey;
        const indicator = button.querySelector(
            "[data-sort-indicator]",
        );

        // スクリーンリーダー向けに現在の並び順を設定する
        button.closest("th")?.setAttribute(
            "aria-sort",
            isActive
                ? candidateSortDirection === "asc"
                    ? "ascending"
                    : "descending"
                : "none",
        );

        // 現在の並び替え状態に合う線画アイコンを表示する
        if (indicator) {
            indicator.innerHTML = createSortIndicatorMarkup(
                isActive,
                candidateSortDirection,
            );
        }
    });
}

// 候補パーツ一覧テーブルを描画する関数
function renderCandidateTable() {
    // 現在のアクティブカテゴリの表示名を取得する
    const categoryLabel = categoryLabels[activeCategory] || activeCategory;

    // 候補一覧の見出し要素が存在する場合
    if (candidateTitle) {
        // 見出しを「フレームを選択」などの文言に更新する
        candidateTitle.textContent = `${categoryLabel}を選択`;
    }

    // 現在の候補テーブル内容を一度すべて空にする
    candidateTableBody.innerHTML = "";

    // 現在のアクティブカテゴリに対応する候補パーツ一覧を取得して並び替える
    const parts = sortCandidateParts(
        partCandidates[activeCategory] || [],
    );

    // 見出しの並び替え状態を更新する
    updateCandidateSortHeaders();

    // 候補パーツが1件もない場合
    if (parts.length === 0) {
        // データなし表示の行をテーブルに入れる
        candidateTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-4 py-6 text-center text-sm text-slate-500">
                    表示できるパーツデータがありません。
                </td>
            </tr>
        `;

        // 候補がないため、ここで描画処理を終了する
        return;
    }

    // 候補パーツを1件ずつ行として描画する
    parts.forEach((part) => {
        // この候補パーツが現在選択中かどうかを判定する
        const isSelected = isSamePart(selectedParts[activeCategory], part);

        // テーブル行tr要素を作成する
        const row = document.createElement("tr");

        // 選択中なら背景色を付け、未選択ならホバー時の背景色を付ける
        row.className = isSelected
            ? "cursor-pointer bg-sky-100"
            : "cursor-pointer hover:bg-slate-50";

        // 候補パーツ1行分のHTMLを作成する
        row.innerHTML = `
            <td class="px-4 py-4 font-bold text-slate-900 truncate">
                <span
                    class="mr-2 inline-block h-2.5 w-2.5 rounded-full ${
            isSelected ? "bg-sky-600 ring-2 ring-sky-200" : "bg-slate-300"
        }"
                ></span>
                ${part.name}
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
                ${formatWeightGram(part.weight)}
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
                ${formatPrice(part.price)}
            </td>
            <td class="px-4 py-4">
                <button
                    type="button"
                    class="${
            isSelected
                ? "inline-flex h-9 w-20 items-center justify-center rounded-md border border-sky-500 bg-sky-500 text-xs font-bold text-white"
                : "inline-flex h-9 w-20 items-center justify-center rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:border-sky-500 hover:bg-sky-50 hover:text-sky-700"
        }"
                >
                    ${isSelected ? "選択中" : "選択"}
                </button>
            </td>
        `;

        // 候補パーツの行クリック時に、そのパーツを選択する
        row.addEventListener("click", () => {
            // 現在のカテゴリに対して、この候補パーツを選択する
            selectPart(activeCategory, part);
        });

        // 作成した候補行を候補テーブルへ追加する
        candidateTableBody.appendChild(row);
    });
}

// カテゴリボタンの表示状態を更新する関数
function renderPartCategoryButtons() {
    // すべてのカテゴリボタンを1つずつ処理する
    partCategoryButtons.forEach((button) => {
        // このボタンが現在のアクティブカテゴリかどうかを判定する
        const isSelected = button.dataset.category === activeCategory;

        // ボタン内の丸いドット要素を取得する
        const dot = button.querySelector(".part-category-dot");

        // aria-selected属性を更新し、選択状態をHTML上にも反映する
        button.setAttribute("aria-selected", String(isSelected));

        // ドットに付いている状態関連のクラスを一度削除する
        dot.classList.remove(
            // 未選択時のドット色を削除する
            "bg-slate-500",

            // 選択時のドット色を削除する
            "bg-white",

            // 選択時のリング指定を削除する
            "ring-2",

            // 選択時のリング色を削除する
            "ring-sky-200",

            // ホバー時のドット色を削除する
            "group-hover:bg-white",
        );

        // このカテゴリが選択中の場合
        if (isSelected) {
            // 選択中用の白いドットとリングを付ける
            dot.classList.add("bg-white", "ring-2", "ring-sky-200");
        } else {
            // 未選択用のドット色とホバー時の色を付ける
            dot.classList.add("bg-slate-500", "group-hover:bg-white");
        }
    });
}

// アクティブカテゴリを切り替える関数
function setActiveCategory(category) {
    // 現在のアクティブカテゴリを更新する
    activeCategory = category;

    // カテゴリボタンの選択状態を再描画する
    renderPartCategoryButtons();

    // 選択済みパーツ表を再描画する
    renderSelectedPartsTable();

    // 候補パーツ表を再描画する
    renderCandidateTable();
}

// 指定カテゴリにパーツを選択する関数
function selectPart(category, part) {
    // 現在の選択状態に、指定カテゴリのパーツを保存する
    selectedParts[category] = part;

    // 現在の構成番号に紐づく状態として反映する
    configStates[activeConfig] = selectedParts;

    // 構成ボタンの金額表示などを更新する
    renderConfigButtons();

    // 選択済みパーツ表を再描画する
    renderSelectedPartsTable();

    // 候補パーツ表を再描画する
    renderCandidateTable();

    // 合計金額・合計重量を更新する
    updateSummary();
}

// アクティブ構成を切り替える関数
function setActiveConfig(configId) {
    // 現在選択中の構成番号を更新する
    activeConfig = configId;

    // 指定された構成番号の状態がまだ存在しない場合
    if (!configStates[activeConfig]) {
        // 空の選択状態を作成する
        configStates[activeConfig] = createEmptySelectedParts();
    }

    // 現在の選択パーツ情報を、切り替え後の構成の状態にする
    selectedParts = configStates[activeConfig];

    // 構成ボタンの表示状態を更新する
    renderConfigButtons();

    // 選択済みパーツ表を再描画する
    renderSelectedPartsTable();

    // 候補パーツ表を再描画する
    renderCandidateTable();

    // 合計金額・合計重量を更新する
    updateSummary();
}

// すべての構成ボタンを1つずつ処理する
configButtons.forEach((button) => {
    // 構成ボタンがクリックされたときの処理を登録する
    button.addEventListener("click", () => {
        // クリックされた構成ボタンの構成番号へ切り替える
        setActiveConfig(button.dataset.config);
    });
});

// すべてのカテゴリボタンを1つずつ処理する
partCategoryButtons.forEach((button) => {
    // カテゴリボタンがクリックされたときの処理を登録する
    button.addEventListener("click", () => {
        // クリックされたカテゴリボタンのカテゴリへ切り替える
        setActiveCategory(button.dataset.category);
    });
});

// 候補一覧の並び替えボタンへクリック処理を登録する
candidateSortButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const clickedKey = button.dataset.sortKey;

        // 同じ見出しをクリックした場合は昇順と降順を切り替える
        if (candidateSortKey === clickedKey) {
            candidateSortDirection =
                candidateSortDirection === "asc"
                    ? "desc"
                    : "asc";
        } else {
            // 別の見出しをクリックした場合は昇順から開始する
            candidateSortKey = clickedKey;
            candidateSortDirection = "asc";
        }

        // 新しい並び順で候補一覧を再描画する
        renderCandidateTable();
    });
});

// 保存ボタンが存在する場合、クリック時の処理を登録する
saveConfigButton?.addEventListener("click", () => {
    // 現在のシミュレーター状態を保存する
    saveSimulatorState();
});

// 削除ボタンが存在する場合、クリック時の処理を登録する
deleteSavedConfigButton?.addEventListener("click", () => {
    // 現在の構成が空の場合
    if (isCurrentConfigEmpty()) {
        // 未選択であることをメッセージ表示する
        showSaveMessage(`構成${activeConfig}は未選択です`);

        // 削除処理を行わず終了する
        return;
    }

    // 本当に削除してよいか確認ダイアログを表示する
    const isConfirmed = window.confirm(`構成${activeConfig}の選択内容をクリアしますか？`);

    // キャンセルされた場合
    if (!isConfirmed) {
        // 削除処理を行わず終了する
        return;
    }

    // 現在の構成の選択状態を削除する
    deleteCurrentConfigState();
});

// シミュレーターの初期化処理を実行する
initializeSimulator().catch((error) => {
    // 初期化中に発生したエラーをコンソールへ出力する
    console.error(error);

    // 候補テーブルにエラーメッセージを表示する
    candidateTableBody.innerHTML = `
        <tr>
            <td colspan="4" class="px-4 py-6 text-center text-sm text-red-500">
                パーツデータの取得に失敗しました。
            </td>
        </tr>
    `;
});
