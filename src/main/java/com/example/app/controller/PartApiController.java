package com.example.app.controller;

import com.example.app.dto.PartDto;
import com.example.app.service.PartService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class PartApiController {

    private final PartService partService;

    public PartApiController(PartService partService) {
        this.partService = partService;
    }

    @GetMapping("/api/parts")
    public List<PartDto> getParts(@RequestParam String category) {
        return partService.findPartsByCategory(category);
    }
}