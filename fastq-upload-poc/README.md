# FASTQ Upload POC

This Proof of Concept demonstrates a size-based logical grouping and concurrent queueing system for uploading large numbers of FASTQ files efficiently without exceeding server limits.

## Project Architecture
- **Backend**: Spring Boot 3.x (Java 21) exposing REST APIs for individual file uploads, grouping calculations, and batch validation.
- **Frontend**: React + Vite managing the file queue entirely on the client-side. The frontend creates logical groups based on the `MAX_GROUP_SIZE` setting, and maintains exactly `MAX_CONCURRENT_UPLOADS` active HTTP file transfers simultaneously.

## Local Setup

### Backend (Spring Boot)
1. Navigate to `fastq-upload-backend`
2. Run `mvn spring-boot:run` or open in your IDE and run `FastqUploadApplication`
3. Backend will start on `http://localhost:8081`

### Frontend (React)
1. Navigate to `fastq-upload-frontend`
2. Run `npm install`
3. Run `npm run dev`
4. The web UI will be accessible at `http://localhost:5173`

## Configuration
Backend configurations can be updated in `fastq-upload-backend/src/main/resources/application.properties`.
By default, files are saved to `./storage/fastq` relative to the backend's runtime directory.

## Testing Scenarios
### 1. Simulated 120 Files
In the UI, select "Simulated Mode". Click "Generate 120 Simulated Files". This will dynamically generate 120 files ranging from 15-19 MB. You can toggle between 40 MB and 70 MB group sizes and see the exact logical group assignments instantly without uploading massive physical files. When you click "Start Upload", it uses an artificial 2-second delay per file and has a built-in 10% failure chance to visibly demonstrate the robust retry logic.

### 2. Real Files
Switch to "Real File Mode", input a `Batch ID`, and select actual FASTQ files from your local disk. The system will slice them into the appropriate 40MB or 70MB buckets, maintain a strict 4-concurrent upload limit, and transfer them securely to the backend `/api/fastq/upload` multipart endpoint.
