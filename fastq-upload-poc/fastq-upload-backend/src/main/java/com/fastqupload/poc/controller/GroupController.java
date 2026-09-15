package com.fastqupload.poc.controller;

import com.fastqupload.poc.dto.GroupRequest;
import com.fastqupload.poc.dto.GroupResponse;
import com.fastqupload.poc.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fastq")
@CrossOrigin(origins = "http://13.222.169.224:5173")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @PostMapping("/group")
    public ResponseEntity<GroupResponse> groupFiles(@RequestBody GroupRequest request) {
        return ResponseEntity.ok(groupService.calculateGroups(request));
    }
}
