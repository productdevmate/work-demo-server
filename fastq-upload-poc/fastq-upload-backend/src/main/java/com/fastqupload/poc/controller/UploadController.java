package com.fastqupload.poc.controller;

import com.fastqupload.poc.dto.BatchFilesResponse;
import com.fastqupload.poc.dto.UploadResponse;
import com.fastqupload.poc.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/fastq")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class UploadController {

    private final StorageService storageService;

    @PostMapping("/upload")
    public ResponseEntity<UploadResponse> uploadFile(
            @RequestParam("batchId") String batchId,
            @RequestParam("file") MultipartFile file) {
        
        if (batchId == null || batchId.trim().isEmpty() || file.isEmpty()) {
            return ResponseEntity.badRequest().body(UploadResponse.builder()
                    .status("FAILED")
                    .message("BatchId or File is missing/empty")
                    .build());
        }

        try {
            log.info("Receiving file {} for batch {}", file.getOriginalFilename(), batchId);
            String path = storageService.saveFile(batchId, file);
            return ResponseEntity.ok(UploadResponse.builder()
                    .batchId(batchId)
                    .fileName(file.getOriginalFilename())
                    .fileSize(file.getSize())
                    .status("COMPLETED")
                    .storagePath(path)
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(UploadResponse.builder()
                    .fileName(file.getOriginalFilename())
                    .status("FAILED")
                    .message(e.getMessage())
                    .build());
        } catch (Exception e) {
            log.error("Failed to upload file", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(UploadResponse.builder()
                            .fileName(file.getOriginalFilename())
                            .status("FAILED")
                            .message("Unable to store FASTQ file")
                            .build());
        }
    }

    @GetMapping("/batch/{batchId}/files")
    public ResponseEntity<BatchFilesResponse> getBatchFiles(@PathVariable String batchId) {
        return ResponseEntity.ok(storageService.getBatchFiles(batchId));
    }

    @GetMapping("/batch/{batchId}/exists")
    public ResponseEntity<Map<String, Boolean>> batchExists(@PathVariable String batchId) {
        return ResponseEntity.ok(Map.of("exists", storageService.batchExists(batchId)));
    }
}
