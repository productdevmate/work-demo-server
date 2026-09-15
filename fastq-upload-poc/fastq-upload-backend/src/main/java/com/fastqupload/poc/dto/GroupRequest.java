package com.fastqupload.poc.dto;
import lombok.Data;
import java.util.List;
@Data
public class GroupRequest {
    private String batchId;
    private double maxGroupSizeMB;
    private List<FileItem> files;

    @Data
    public static class FileItem {
        private String fileName;
        private long sizeBytes;
    }
}
