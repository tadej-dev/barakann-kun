package com.example.app.repository;

import com.example.app.entity.Part;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartRepository extends JpaRepository<Part, Long> {

    List<Part> findByCategoryId(Long categoryId);

    List<Part> findByBrandId(Long brandId);

    List<Part> findByCategory_KeyOrderByIdAsc(String key);
}