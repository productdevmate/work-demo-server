package com.fastqupload.poc.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/health")
@CrossOrigin(origins = "http://13.222.169.224:5173")
public class HealthController {

    @GetMapping
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
