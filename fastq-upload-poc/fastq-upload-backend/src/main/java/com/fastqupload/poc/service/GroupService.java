package com.fastqupload.poc.service;

import com.fastqupload.poc.dto.GroupInfo;
import com.fastqupload.poc.dto.GroupRequest;
import com.fastqupload.poc.dto.GroupResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class GroupService {

    public GroupResponse calculateGroups(GroupRequest request) {
        double maxGroupSizeMB = request.getMaxGroupSizeMB() > 0 ? request.getMaxGroupSizeMB() : 70.0;
        long maxSizeBytes = (long) (maxGroupSizeMB * 1024 * 1024);

        List<GroupInfo> groups = new ArrayList<>();
        List<String> currentGroupFiles = new ArrayList<>();
        long currentGroupSize = 0;
        int groupNumber = 1;

        for (GroupRequest.FileItem file : request.getFiles()) {
            if (file.getSizeBytes() > maxSizeBytes) {
                // Individual file exceeds limit, put it in its own group
                if (!currentGroupFiles.isEmpty()) {
                    groups.add(GroupInfo.builder()
                            .groupNumber(groupNumber++)
                            .totalFiles(currentGroupFiles.size())
                            .totalSizeMB(currentGroupSize / (1024.0 * 1024.0))
                            .files(currentGroupFiles)
                            .build());
                    currentGroupFiles = new ArrayList<>();
                    currentGroupSize = 0;
                }
                groups.add(GroupInfo.builder()
                        .groupNumber(groupNumber++)
                        .totalFiles(1)
                        .totalSizeMB(file.getSizeBytes() / (1024.0 * 1024.0))
                        .files(List.of(file.getFileName()))
                        .build());
            } else if (currentGroupSize + file.getSizeBytes() > maxSizeBytes) {
                groups.add(GroupInfo.builder()
                        .groupNumber(groupNumber++)
                        .totalFiles(currentGroupFiles.size())
                        .totalSizeMB(currentGroupSize / (1024.0 * 1024.0))
                        .files(currentGroupFiles)
                        .build());
                currentGroupFiles = new ArrayList<>();
                currentGroupFiles.add(file.getFileName());
                currentGroupSize = file.getSizeBytes();
            } else {
                currentGroupFiles.add(file.getFileName());
                currentGroupSize += file.getSizeBytes();
            }
        }

        if (!currentGroupFiles.isEmpty()) {
            groups.add(GroupInfo.builder()
                    .groupNumber(groupNumber)
                    .totalFiles(currentGroupFiles.size())
                    .totalSizeMB(currentGroupSize / (1024.0 * 1024.0))
                    .files(currentGroupFiles)
                    .build());
        }

        return GroupResponse.builder()
                .batchId(request.getBatchId())
                .maxGroupSizeMB(maxGroupSizeMB)
                .totalFiles(request.getFiles().size())
                .totalGroups(groups.size())
                .groups(groups)
                .build();
    }
}
