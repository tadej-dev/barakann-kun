package com.barakann.app.controller;

import com.barakann.app.dto.CategoryDto;
import com.barakann.app.service.CategoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class CategoryApiController {

    private final CategoryService categoryService;

    public CategoryApiController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping("/api/categories")
    public List<CategoryDto> getCategories() {
        return categoryService.findAllCategories()
                .stream()
                .map(CategoryDto::from)
                .toList();
    }
}