package com.fastqupload.poc.dto;
import lombok.Builder;
import lombok.Data;
import java.util.List;
@Data
@Builder
public class BatchFilesResponse {
    private String batchId;
    private int totalFiles;
    private List<FileInfo> files;
    
    @Data
    @Builder
    public static class FileInfo {
        private String fileName;
        private double sizeMB;
    }
}
