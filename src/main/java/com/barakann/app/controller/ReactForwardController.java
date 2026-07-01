package com.barakann.app.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ReactForwardController {

    // React Routerの画面ルートをindex.htmlへ転送
    @GetMapping({
            "/",
            "/simulator",
            "/terms",
            "/privacy"
    })
    public String forwardToReact() {
        return "forward:/index.html";
    }
}