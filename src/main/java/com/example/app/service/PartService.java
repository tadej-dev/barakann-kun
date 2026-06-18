package com.example.app.service;

import com.example.app.dto.PartDto;
import com.example.app.repository.PartRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PartService {

    private final PartRepository partRepository;

    public PartService(PartRepository partRepository) {
        this.partRepository = partRepository;
    }

    @Transactional(readOnly = true)
    public List<PartDto> findPartsByCategory(String key) {
        return partRepository.findByCategory_KeyOrderByIdAsc(key)
                .stream()
                .map(PartDto::from)
                .toList();
    }
}