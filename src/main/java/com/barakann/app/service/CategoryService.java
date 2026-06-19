package com.barakann.app.service;

import com.barakann.app.entity.Category;
import com.barakann.app.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<Category> findAllCategories() {
        return categoryRepository.findAllByOrderByIdAsc();
    }
}