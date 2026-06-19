package com.example.app.controller;

import com.example.app.service.CategoryService;
import com.example.app.service.PartService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    private final CategoryService categoryService;
    private final PartService partService;

    public HomeController(CategoryService categoryService, PartService partService) {
        this.categoryService = categoryService;
        this.partService = partService;
    }

    @GetMapping("/")
    public String home() {
        return "home";
    }


    @GetMapping("/simulator")
    public String simulator(Model model) {
        // 初期表示時に選択状態にするパーツカテゴリを指定する
        String activeCategory = "frame";

        // シミュレーター画面で使用するカテゴリ一覧・初期選択カテゴリ・初期表示パーツを画面に渡す
        model.addAttribute("categories", categoryService.findAllCategories());
        model.addAttribute("activeCategory", activeCategory);
        model.addAttribute("activeCategoryDisplayName", "フレーム");
        model.addAttribute("initialParts", partService.findPartsByCategory(activeCategory));

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
