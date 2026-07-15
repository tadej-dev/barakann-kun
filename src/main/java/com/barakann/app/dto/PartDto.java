package com.barakann.app.dto;

import com.barakann.app.entity.Part;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Stream;

public class PartDto {

    private Long id;
    private String name;
    private String modelName;
    private String variantName;
    private String brandName;
    private Integer weight;
    private Integer price;
    private LocalDateTime priceUpdatedAt;
    private List<PartIncludedItemDto> includedItems;
    private List<String> blockedCategoryKeys;

    public PartDto() {
    }

    public PartDto(
            Long id,
            String name,
            String modelName,
            String variantName,
            String brandName,
            Integer weight,
            Integer price,
            LocalDateTime priceUpdatedAt,
            List<PartIncludedItemDto> includedItems,
            List<String> blockedCategoryKeys
    ) {
        this.id = id;
        this.name = name;
        this.modelName = modelName;
        this.variantName = variantName;
        this.brandName = brandName;
        this.weight = weight;
        this.price = price;
        this.priceUpdatedAt = priceUpdatedAt;
        this.includedItems = includedItems;
        this.blockedCategoryKeys = blockedCategoryKeys;
    }

    public static PartDto from(Part part) {
        List<PartIncludedItemDto> includedItems = part.getIncludedItems()
                .stream()
                .map(PartIncludedItemDto::from)
                .toList();

        List<String> blockedCategoryKeys = Stream.concat(
                        part.getBlockedCategories()
                                .stream()
                                .map(category -> category.getKey()),
                        part.getIncludedItems()
                                .stream()
                                .filter(item -> item.getIncludedCategory() != null)
                                .map(item -> item.getIncludedCategory().getKey())
                )
                .distinct()
                .sorted()
                .toList();

        return new PartDto(
                part.getId(),
                part.getName(),
                part.getModelName() == null || part.getModelName().isBlank()
                        ? part.getName()
                        : part.getModelName(),
                part.getVariantName(),
                part.getBrand().getName(),
                part.getWeight(),
                part.getPrice(),
                part.getPriceUpdatedAt() == null
                        ? part.getUpdatedAt()
                        : part.getPriceUpdatedAt(),
                includedItems,
                blockedCategoryKeys
        );
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getModelName() {
        return modelName;
    }

    public String getVariantName() {
        return variantName;
    }

    public String getBrandName() {
        return brandName;
    }

    public Integer getWeight() {
        return weight;
    }

    public Integer getPrice() {
        return price;
    }

    public LocalDateTime getPriceUpdatedAt() {
        return priceUpdatedAt;
    }

    public List<PartIncludedItemDto> getIncludedItems() {
        return includedItems;
    }

    public List<String> getBlockedCategoryKeys() {
        return blockedCategoryKeys;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public void setVariantName(String variantName) {
        this.variantName = variantName;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
    }

    public void setWeight(Integer weight) {
        this.weight = weight;
    }

    public void setPrice(Integer price) {
        this.price = price;
    }

    public void setPriceUpdatedAt(LocalDateTime priceUpdatedAt) {
        this.priceUpdatedAt = priceUpdatedAt;
    }

    public void setIncludedItems(List<PartIncludedItemDto> includedItems) {
        this.includedItems = includedItems;
    }

    public void setBlockedCategoryKeys(List<String> blockedCategoryKeys) {
        this.blockedCategoryKeys = blockedCategoryKeys;
    }
}
