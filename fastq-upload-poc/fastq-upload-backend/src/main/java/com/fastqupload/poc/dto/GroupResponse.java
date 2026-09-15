package com.fastqupload.poc.dto;
import lombok.Builder;
import lombok.Data;
import java.util.List;
@Data
@Builder
public class GroupResponse {
    private String batchId;
    private double maxGroupSizeMB;
    private int totalFiles;
    private int totalGroups;
    private List<GroupInfo> groups;
}
