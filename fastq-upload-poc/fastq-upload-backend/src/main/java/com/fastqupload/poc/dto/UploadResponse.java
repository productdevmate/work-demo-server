package com.fastqupload.poc.dto;
import lombok.Builder;
import lombok.Data;
@Data
@Builder
public class UploadResponse {
    private String batchId;
    private String fileName;
    private long fileSize;
    private String status;
    private String storagePath;
    private String message;
}
