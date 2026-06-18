const configButtons = document.querySelectorAll(".config-button");
const partCategoryButtons = document.querySelectorAll(".part-category-button");

const totalPrice = document.getElementById("total-price");
const totalWeight = document.getElementById("total-weight");
const selectedPartsTable = document.getElementById("selected-parts-table");
const candidateTitle = document.getElementById("candidate-title");
const candidateTableBody = document.getElementById("candidate-table-body");

const saveConfigButton = document.getElementById("save-config-button");
const deleteSavedConfigButton = document.getElementById("delete-saved-config-button");
const configSaveMessage = document.getElementById("config-save-message");

const STORAGE_KEY = "barakann-simulator-configs-v1";

/**
 * Thymeleafで生成されたカテゴリボタンからカテゴリ情報を作る
 */
const categories = Array.from(partCategoryButtons).map((button) => {
    return {
        key: button.dataset.category,
        label: button.dataset.categoryLabel,
    };
});

const categoryOrder = categories.map((category) => category.key);

const categoryLabels = Object.fromEntries(
    categories.map((category) => [category.key, category.label]),
);

const partCandidates = Object.fromEntries(
    categoryOrder.map((category) => [category, []]),
);

const initialActiveConfigButton =
    document.querySelector(".config-button[aria-selected='true']") ||
    configButtons[0];

const initialActiveCategoryButton =
    document.querySelector(".part-category-button[aria-selected='true']") ||
    partCategoryButtons[0];

let activeConfig = initialActiveConfigButton?.dataset.config || "1";
let activeCategory = initialActiveCategoryButton?.dataset.category || categoryOrder[0];

let configStates = Object.fromEntries(
    Array.from(configButtons).map((button) => [
        button.dataset.config,
        createEmptySelectedParts(),
    ]),
);

let selectedParts = configStates[activeConfig];

function createEmptySelectedParts() {
    return Object.fromEntries(
        categoryOrder.map((category) => [category, null]),
    );
}

async function fetchPartsByCategory(category) {
    const response = await fetch(
        `/api/parts?category=${encodeURIComponent(category)}`,
    );

    if (!response.ok) {
        throw new Error("パーツデータの取得に失敗しました");
    }

    return await response.json();
}

async function initializeSimulator() {
    for (const category of categoryOrder) {
        partCandidates[category] = await fetchPartsByCategory(category);
    }

    const savedState = loadSavedSimulatorState();

    if (savedState) {
        restoreSimulatorState(savedState);
    } else {
        selectedParts = configStates[activeConfig];
    }

    renderConfigButtons();
    renderPartCategoryButtons();
    renderSelectedPartsTable();
    renderCandidateTable();
    updateSummary();
}

function isSamePart(partA, partB) {
    if (!partA || !partB) {
        return false;
    }

    if (partA.id != null && partB.id != null) {
        return partA.id === partB.id;
    }

    return partA.name === partB.name;
}

function formatPrice(price) {
    return `¥${price.toLocaleString("ja-JP")}`;
}

function formatWeightGram(weight) {
    return `${weight.toLocaleString("ja-JP")}g`;
}

function formatTotalWeight(weight) {
    return `${(weight / 1000).toFixed(2)} kg`;
}

function calculateTotalPrice(parts) {
    return categoryOrder.reduce((sum, category) => {
        return sum + (parts?.[category]?.price || 0);
    }, 0);
}

function calculateTotalWeight(parts) {
    return categoryOrder.reduce((sum, category) => {
        return sum + (parts?.[category]?.weight || 0);
    }, 0);
}

function updateSummary() {
    const totalPriceValue = calculateTotalPrice(selectedParts);
    const totalWeightValue = calculateTotalWeight(selectedParts);

    totalPrice.textContent = formatPrice(totalPriceValue);
    totalWeight.textContent = formatTotalWeight(totalWeightValue);
}

function createSerializableConfigStates() {
    return Object.fromEntries(
        Object.entries(configStates).map(([configId, parts]) => {
            return [
                configId,
                Object.fromEntries(
                    categoryOrder.map((category) => {
                        return [category, parts?.[category]?.id || null];
                    }),
                ),
            ];
        }),
    );
}

function hasUnselectedParts() {
    return categoryOrder.some((category) => {
        return !selectedParts[category];
    });
}

function saveSimulatorState() {
    const saveData = {
        version: 1,
        activeConfig,
        configs: createSerializableConfigStates(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));

    if (hasUnselectedParts()) {
        showSaveMessage("未選択のパーツがありますが、構成を保存しました");
    } else {
        showSaveMessage("構成を保存しました");
    }
}

function loadSavedSimulatorState() {
    const savedText = localStorage.getItem(STORAGE_KEY);

    if (!savedText) {
        return null;
    }

    try {
        return JSON.parse(savedText);
    } catch (error) {
        console.error(error);
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

function restoreSimulatorState(savedState) {
    if (!savedState || !savedState.configs) {
        return;
    }

    Object.keys(configStates).forEach((configId) => {
        const savedConfig = savedState.configs[configId] || {};

        configStates[configId] = Object.fromEntries(
            categoryOrder.map((category) => {
                const savedPartId = savedConfig[category];
                return [category, findPartById(category, savedPartId)];
            }),
        );
    });

    if (configStates[savedState.activeConfig]) {
        activeConfig = savedState.activeConfig;
    }

    activeCategory = initialActiveCategoryButton?.dataset.category || categoryOrder[0];

    selectedParts = configStates[activeConfig];
}

function findPartById(category, partId) {
    if (partId == null) {
        return null;
    }

    return (partCandidates[category] || []).find((part) => {
        return String(part.id) === String(partId);
    }) || null;
}

function isCurrentConfigEmpty() {
    return categoryOrder.every((category) => {
        return !selectedParts[category];
    });
}

function deleteCurrentConfigState() {
    configStates[activeConfig] = createEmptySelectedParts();
    selectedParts = configStates[activeConfig];

    const saveData = {
        version: 1,
        activeConfig,
        configs: createSerializableConfigStates(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));

    renderConfigButtons();
    renderPartCategoryButtons();
    renderSelectedPartsTable();
    renderCandidateTable();
    updateSummary();

    showSaveMessage(`構成${activeConfig}をクリアしました`);
}

function showSaveMessage(message) {
    if (!configSaveMessage) {
        return;
    }

    configSaveMessage.textContent = message;

    setTimeout(() => {
        configSaveMessage.textContent = "";
    }, 3000);
}

function renderConfigButtons() {
    configButtons.forEach((button) => {
        const configId = button.dataset.config;
        const isSelected = configId === activeConfig;

        button.setAttribute("aria-selected", String(isSelected));

        const priceElement =
            button.querySelector("[data-config-price]") ||
            button.querySelectorAll("p")[1];

        if (priceElement) {
            const configTotalPrice = calculateTotalPrice(configStates[configId]);
            priceElement.textContent = formatPrice(configTotalPrice);
        }
    });
}

function renderSelectedPartsTable() {
    selectedPartsTable.innerHTML = "";

    categoryOrder.forEach((category) => {
        const part = selectedParts[category];
        const isActiveCategory = category === activeCategory;

        const row = document.createElement("tr");
        row.className = isActiveCategory
            ? "cursor-pointer bg-sky-50"
            : "cursor-pointer hover:bg-slate-50";

        if (!part) {
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

        row.addEventListener("click", () => {
            setActiveCategory(category);
        });

        selectedPartsTable.appendChild(row);
    });

    const tableCategoryButtons = document.querySelectorAll(
        "[data-table-category]",
    );

    tableCategoryButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            setActiveCategory(button.dataset.tableCategory);
        });
    });
}

function renderCandidateTable() {
    candidateTitle.textContent = `${categoryLabels[activeCategory]}を選択`;

    candidateTableBody.innerHTML = "";

    const parts = partCandidates[activeCategory] || [];

    if (parts.length === 0) {
        candidateTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-4 py-6 text-center text-sm text-slate-500">
                    表示できるパーツデータがありません。
                </td>
            </tr>
        `;
        return;
    }

    parts.forEach((part) => {
        const isSelected = isSamePart(selectedParts[activeCategory], part);

        const row = document.createElement("tr");
        row.className = isSelected
            ? "cursor-pointer bg-sky-100"
            : "cursor-pointer hover:bg-slate-50";

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

        row.addEventListener("click", () => {
            selectPart(activeCategory, part);
        });

        candidateTableBody.appendChild(row);
    });
}

function renderPartCategoryButtons() {
    partCategoryButtons.forEach((button) => {
        const isSelected = button.dataset.category === activeCategory;
        const dot = button.querySelector(".part-category-dot");

        button.setAttribute("aria-selected", String(isSelected));

        dot.classList.remove(
            "bg-slate-500",
            "bg-white",
            "ring-2",
            "ring-sky-200",
            "group-hover:bg-white",
        );

        if (isSelected) {
            dot.classList.add("bg-white", "ring-2", "ring-sky-200");
        } else {
            dot.classList.add("bg-slate-500", "group-hover:bg-white");
        }
    });
}

function setActiveCategory(category) {
    activeCategory = category;

    renderPartCategoryButtons();
    renderSelectedPartsTable();
    renderCandidateTable();
}

function selectPart(category, part) {
    selectedParts[category] = part;
    configStates[activeConfig] = selectedParts;

    renderConfigButtons();
    renderSelectedPartsTable();
    renderCandidateTable();
    updateSummary();
}

function setActiveConfig(configId) {
    activeConfig = configId;

    if (!configStates[activeConfig]) {
        configStates[activeConfig] = createEmptySelectedParts();
    }

    selectedParts = configStates[activeConfig];

    renderConfigButtons();
    renderSelectedPartsTable();
    renderCandidateTable();
    updateSummary();
}

configButtons.forEach((button) => {
    button.addEventListener("click", () => {
        setActiveConfig(button.dataset.config);
    });
});

partCategoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
        setActiveCategory(button.dataset.category);
    });
});

saveConfigButton?.addEventListener("click", () => {
    saveSimulatorState();
});

deleteSavedConfigButton?.addEventListener("click", () => {
    if (isCurrentConfigEmpty()) {
        showSaveMessage(`構成${activeConfig}は未選択です`);
        return;
    }

    const isConfirmed = window.confirm(`構成${activeConfig}の選択内容をクリアしますか？`);

    if (!isConfirmed) {
        return;
    }

    deleteCurrentConfigState();
});

initializeSimulator().catch((error) => {
    console.error(error);

    candidateTableBody.innerHTML = `
        <tr>
            <td colspan="4" class="px-4 py-6 text-center text-sm text-red-500">
                パーツデータの取得に失敗しました。
            </td>
        </tr>
    `;
});