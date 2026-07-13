package com.barakann.app.dto;

import com.barakann.app.entity.Part;

import java.util.List;

public class PartDto {

    private Long id;
    private String name;
    private String brandName;
    private Integer weight;
    private Integer price;
    private List<String> blockedCategoryKeys;

    public PartDto() {
    }

    public PartDto(
            Long id,
            String name,
            String brandName,
            Integer weight,
            Integer price,
            List<String> blockedCategoryKeys
    ) {
        this.id = id;
        this.name = name;
        this.brandName = brandName;
        this.weight = weight;
        this.price = price;
        this.blockedCategoryKeys = blockedCategoryKeys;
    }

    public static PartDto from(Part part) {
        return new PartDto(
                part.getId(),
                part.getName(),
                part.getBrand().getName(),
                part.getWeight(),
                part.getPrice(),
                part.getBlockedCategories()
                        .stream()
                        .map(category -> category.getKey())
                        .sorted()
                        .toList()
        );
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
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

    public List<String> getBlockedCategoryKeys() {
        return blockedCategoryKeys;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
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

    public void setBlockedCategoryKeys(List<String> blockedCategoryKeys) {
        this.blockedCategoryKeys = blockedCategoryKeys;
    }
}
