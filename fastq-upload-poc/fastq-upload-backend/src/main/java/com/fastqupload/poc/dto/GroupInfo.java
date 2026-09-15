package com.fastqupload.poc.dto;
import lombok.Builder;
import lombok.Data;
import java.util.List;
@Data
@Builder
public class GroupInfo {
    private int groupNumber;
    private int totalFiles;
    private double totalSizeMB;
    private List<String> files;
}
