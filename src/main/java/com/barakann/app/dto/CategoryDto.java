package com.barakann.app.dto;

import com.barakann.app.entity.Category;
import lombok.Getter;

@Getter
public class CategoryDto {

    private Long id;
    private String key;
    private String displayName;

    public CategoryDto() {
    }

    public CategoryDto(Long id, String key, String displayName) {
        this.id = id;
        this.key = key;
        this.displayName = displayName;
    }

    public static CategoryDto from(Category category) {
        return new CategoryDto(
                category.getId(),
                category.getKey(),
                category.getDisplayName()
        );
    }

}