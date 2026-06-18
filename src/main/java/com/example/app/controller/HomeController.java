package com.example.app.controller;

import com.example.app.service.CategoryService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    private final CategoryService categoryService;

    public HomeController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping("/")
    public String home() {
        return "home";
    }

    @GetMapping("/simulator")
    public String simulator(Model model) {
        model.addAttribute("categories", categoryService.findAllCategories());
        model.addAttribute("activeCategory", "frame");

        return "simulator";
    }


    @GetMapping("/terms")
    public String terms() {
        return "terms";
    }

    @GetMapping("/privacy")
    public String privacy() {
        return "privacy";
    }
}
