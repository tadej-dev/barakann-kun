package com.barakann.app.dto;

import com.barakann.app.entity.PartIncludedItem;

public class PartIncludedItemDto {

    private String name;
    private Integer quantity;
    private String categoryKey;

    public PartIncludedItemDto() {
    }

    public PartIncludedItemDto(String name, Integer quantity, String categoryKey) {
        this.name = name;
        this.quantity = quantity;
        this.categoryKey = categoryKey;
    }

    public static PartIncludedItemDto from(PartIncludedItem includedItem) {
        return new PartIncludedItemDto(
                includedItem.getItemName(),
                includedItem.getQuantity(),
                includedItem.getIncludedCategory() == null
                        ? null
                        : includedItem.getIncludedCategory().getKey()
        );
    }

    public String getName() {
        return name;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public String getCategoryKey() {
        return categoryKey;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public void setCategoryKey(String categoryKey) {
        this.categoryKey = categoryKey;
    }
}
