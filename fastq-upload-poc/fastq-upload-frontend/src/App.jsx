import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './index.css';

const API_BASE = 'http://localhost:8081/api/fastq';
const MAX_CONCURRENT_GROUPS = 4;
const MAX_RETRIES = 3;

function App() {
  const [batchId, setBatchId] = useState('Workflow/BIOINF');
  const [groupSizeMB, setGroupSizeMB] = useState(70);
  
  const [files, setFiles] = useState([]); // List of { fileObj (null if simulate), name, sizeMB, sizeBytes }
  const [groups, setGroups] = useState([]); // List of { groupNumber, totalSizeMB, files: [...] }
  
  const [fileStatuses, setFileStatuses] = useState({}); // Tracking statuses
  const fileStatusesRef = useRef({}); // For access inside async closures
  
  const [uploadState, setUploadState] = useState('IDLE'); // IDLE, UPLOADING, COMPLETED
  const [activeUploads, setActiveUploads] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const queueRef = useRef([]);
  const activeGroupsCountRef = useRef(0);

  useEffect(() => {
    setFileStatuses(fileStatusesRef.current);
  }, [activeUploads]); 

  const forceRender = () => setFileStatuses({ ...fileStatusesRef.current });

  const processSelectedFiles = (selected) => {
    const validFiles = selected.filter(f => f.name.endsWith('.fastq') || f.name.endsWith('.fastq.gz') || f.name.endsWith('.fq') || f.name.endsWith('.fq.gz'));
    
    const mapped = validFiles.map(f => ({
      fileObj: f,
      name: f.name,
      sizeMB: f.size / (1024 * 1024),
      sizeBytes: f.size
    }));
    setFiles(mapped);
    calculateGroups(mapped, groupSizeMB);
  };

  const handleFileSelect = (e) => {
    processSelectedFiles(Array.from(e.target.files));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const calculateGroups = (fileList, maxMB) => {
    const maxBytes = maxMB * 1024 * 1024;
    const newGroups = [];
    let currentGroupFiles = [];
    let currentSize = 0;
    let gNum = 1;

    for (let f of fileList) {
      if (f.sizeBytes > maxBytes) {
        if (currentGroupFiles.length > 0) {
          newGroups.push({ groupNumber: gNum++, files: currentGroupFiles, totalSizeMB: currentSize / (1024 * 1024) });
          currentGroupFiles = [];
          currentSize = 0;
        }
        newGroups.push({ groupNumber: gNum++, files: [f], totalSizeMB: f.sizeMB });
      } else if (currentSize + f.sizeBytes > maxBytes) {
        newGroups.push({ groupNumber: gNum++, files: currentGroupFiles, totalSizeMB: currentSize / (1024 * 1024) });
        currentGroupFiles = [f];
        currentSize = f.sizeBytes;
      } else {
        currentGroupFiles.push(f);
        currentSize += f.sizeBytes;
      }
    }

    if (currentGroupFiles.length > 0) {
      newGroups.push({ groupNumber: gNum, files: currentGroupFiles, totalSizeMB: currentSize / (1024 * 1024) });
    }

    setGroups(newGroups);
    setUploadState('IDLE');
    
    const initialStatuses = {};
    fileList.forEach(f => {
      initialStatuses[f.name] = { status: 'QUEUED', progress: 0, retries: 0 };
    });
    fileStatusesRef.current = initialStatuses;
    forceRender();
  };

  const updateFileStatus = (name, data) => {
    fileStatusesRef.current[name] = { ...fileStatusesRef.current[name], ...data };
    forceRender();
  };

  const startUpload = () => {
    if (files.length === 0) return;
    setUploadState('UPLOADING');
    queueRef.current = [...groups]; 
    activeGroupsCountRef.current = 0;
    processQueue();
  };

  const processQueue = () => {
    while (activeGroupsCountRef.current < MAX_CONCURRENT_GROUPS && queueRef.current.length > 0) {
      const nextGroup = queueRef.current.shift();
      activeGroupsCountRef.current += 1;
      processGroup(nextGroup);
    }

    if (activeGroupsCountRef.current === 0 && queueRef.current.length === 0) {
      setUploadState('COMPLETED');
    }
  };

  const processGroup = async (group) => {
    for (let f of group.files) {
      await uploadSingleFile(f);
    }
    activeGroupsCountRef.current -= 1;
    processQueue();
  };

  const uploadSingleFile = async (fileItem) => {
    let success = false;
    
    while (!success && fileStatusesRef.current[fileItem.name].retries <= MAX_RETRIES) {
      try {
        const retries = fileStatusesRef.current[fileItem.name].retries;
        if (retries > 0) {
          updateFileStatus(fileItem.name, { status: 'RETRYING' });
        } else {
          updateFileStatus(fileItem.name, { status: 'UPLOADING', progress: 0 });
        }
        
        setActiveUploads(prev => prev + 1);

        const formData = new FormData();
        // Since batchId might contain slashes like "Workflow/BIOINF", we might want to sanitize it on backend,
        // but for now we send it as is.
        formData.append('batchId', batchId.replace(/[^a-zA-Z0-9_-]/g, '_')); // Sanitizing for local folder creation safety
        formData.append('file', fileItem.fileObj);

        await axios.post(`${API_BASE}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            updateFileStatus(fileItem.name, { progress: percentCompleted });
          }
        });

        updateFileStatus(fileItem.name, { status: 'COMPLETED', progress: 100 });
        success = true;
      } catch (err) {
        console.error(`Failed to upload ${fileItem.name}`, err);
        const currentRetries = fileStatusesRef.current[fileItem.name].retries;
        if (currentRetries < MAX_RETRIES) {
          updateFileStatus(fileItem.name, { retries: currentRetries + 1 });
        } else {
          updateFileStatus(fileItem.name, { status: 'FAILED' });
          break; 
        }
      } finally {
        setActiveUploads(prev => prev - 1);
      }
    }
  };

  const retryFailedFile = async (fileItem) => {
    updateFileStatus(fileItem.name, { retries: 0 }); 
    await uploadSingleFile(fileItem);
  };

  const getOverallProgress = () => {
    if (files.length === 0) return 0;
    const completed = files.filter(f => fileStatuses[f.name]?.status === 'COMPLETED').length;
    return Math.round((completed / files.length) * 100);
  };

  const totalCompleted = files.filter(f => fileStatuses[f.name]?.status === 'COMPLETED').length;
  const totalSizeMB = files.reduce((acc, f) => acc + f.sizeMB, 0).toFixed(2);

  return (
    <div className="page-container">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Upload</h2>
          <button className="modal-close">×</button>
        </div>
        
        <div className="modal-body">


          <input 
            type="file" 
            multiple 
            className="hidden-input" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".fastq,.fastq.gz,.fq,.fq.gz"
            disabled={uploadState !== 'IDLE'}
          />

          <div 
            className={`dropzone ${isDragging ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="cloud-icon" viewBox="0 0 24 24">
              <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
            </svg>
            <div>
              Drag your file(s) or <span className="browse-link">browse</span>
            </div>
          </div>

          {files.length > 0 && uploadState !== 'IDLE' && (
            <div className="progress-section" style={{marginTop: '1.5rem'}}>
              <div className="progress-info">
                <span>Overall: {totalCompleted} / {files.length} files</span>
                <span>{getOverallProgress()}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${getOverallProgress()}%` }}></div>
              </div>
              <div style={{fontSize: '0.875rem', color: '#64748b'}}>
                <strong>Active HTTP Uploads:</strong> {activeUploads}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn-upload" 
            onClick={startUpload}
            disabled={files.length === 0 || uploadState !== 'IDLE'}
          >
            Upload
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="split-view">
          <div className="card">
            <h2>Group Preview ({groups.length} Groups)</h2>
            <div className="scroll-list">
              {groups.map(g => {
                const isComplete = g.files.every(f => fileStatuses[f.name]?.status === 'COMPLETED');
                const isUploading = g.files.some(f => fileStatuses[f.name]?.status === 'UPLOADING' || fileStatuses[f.name]?.status === 'RETRYING');
                let statusBadge = uploadState === 'IDLE' ? 'Ready' : 'Waiting';
                if (isUploading) statusBadge = 'Active';
                if (isComplete) statusBadge = 'Done';
                
                return (
                  <div key={g.groupNumber} className={`group-item ${statusBadge.toLowerCase()}`}>
                    <div className="group-header">
                      <strong>Group {g.groupNumber}</strong>
                      <span className={`badge ${statusBadge.toLowerCase()}`}>[{statusBadge}]</span>
                    </div>
                    <div className="group-details">
                      {g.totalFiles} files • {g.totalSizeMB.toFixed(2)} MB
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <h2>File Status ({files.length} files • {totalSizeMB} MB)</h2>
            <div className="scroll-list">
              {files.map(f => {
                const s = fileStatuses[f.name] || { status: 'QUEUED' };
                return (
                  <div key={f.name} className={`file-item ${s.status.toLowerCase()}`}>
                    <div className="file-info">
                      <div className="file-name" title={f.name}>{f.name}</div>
                      <div className="file-size">{f.sizeMB.toFixed(2)} MB</div>
                    </div>
                    <div className="file-state">
                      <span className={`status-text ${s.status.toLowerCase()}`}>
                        {s.status} {s.status === 'UPLOADING' ? `${s.progress}%` : ''}
                      </span>
                      {s.status === 'FAILED' && (
                        <button className="btn-small" onClick={() => retryFailedFile(f)}>Retry</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
