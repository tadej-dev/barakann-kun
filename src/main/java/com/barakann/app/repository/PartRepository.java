package com.barakann.app.repository;

import com.barakann.app.entity.Part;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartRepository extends JpaRepository<Part, Long> {

    List<Part> findByCategoryId(Long categoryId);

    List<Part> findByBrandId(Long brandId);

    @EntityGraph(attributePaths = {
            "brand",
            "blockedCategories",
            "includedItems",
            "includedItems.includedCategory"
    })
    List<Part> findByCategory_KeyOrderByIdAsc(String key);
}
