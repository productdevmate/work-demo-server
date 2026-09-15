package com.fastqupload.poc.service;

import com.fastqupload.poc.dto.BatchFilesResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class StorageService {

    @Value("${fastq.upload.storage:./storage/fastq}")
    private String storageLocation;

    public String saveFile(String batchId, MultipartFile file) throws IOException {
        String fileName = StringUtils.cleanPath(file.getOriginalFilename());
        
        // Basic validation
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw new IllegalArgumentException("Invalid file path sequence in fileName");
        }
        
        File batchDir = new File(storageLocation, batchId);
        if (!batchDir.exists()) {
            batchDir.mkdirs();
        }

        File targetFile = new File(batchDir, fileName);
        file.transferTo(targetFile.toPath());
        
        return targetFile.getAbsolutePath();
    }

    public boolean batchExists(String batchId) {
        File batchDir = new File(storageLocation, batchId);
        return batchDir.exists() && batchDir.isDirectory();
    }

    public BatchFilesResponse getBatchFiles(String batchId) {
        File batchDir = new File(storageLocation, batchId);
        List<BatchFilesResponse.FileInfo> fileInfos = new ArrayList<>();
        
        if (batchDir.exists() && batchDir.isDirectory()) {
            File[] files = batchDir.listFiles();
            if (files != null) {
                for (File f : files) {
                    if (f.isFile()) {
                        double sizeMB = f.length() / (1024.0 * 1024.0);
                        fileInfos.add(BatchFilesResponse.FileInfo.builder()
                                .fileName(f.getName())
                                .sizeMB(sizeMB)
                                .build());
                    }
                }
            }
        }
        
        return BatchFilesResponse.builder()
                .batchId(batchId)
                .totalFiles(fileInfos.size())
                .files(fileInfos)
                .build();
    }
}
