import React, { useState, useCallback, useRef } from "react";
import "./FileUploader.css";

export interface FileWithContent {
  name: string;
  path: string;
  content: string;
  language: string;
  size: number;
  lastModified: number;
}

interface FileUploaderProps {
  onFilesUploaded: (files: FileWithContent[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesUploaded }) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [files, setFiles] = useState<FileWithContent[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect language based on file extension – matches other parts of your code
  const detectLanguage = (fileName: string): string => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "js":
        return "javascript";
      case "ts":
      case "tsx":
        return "typescript";
      case "jsx":
        return "jsx";
      case "py":
        return "python";
      case "java":
        return "java";
      // Add additional cases as needed
      default:
        return "plaintext";
    }
  };

  // Process files asynchronously using FileReader
  const processFiles = async (fileList: FileList) => {
    setIsProcessing(true);
    setUploadError(null);

    try {
      const filePromises = Array.from(fileList).map((file) =>
        new Promise<FileWithContent>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            resolve({
              name: file.name,
              path: file.name,
              content,
              language: detectLanguage(file.name),
              size: file.size,
              lastModified: file.lastModified,
            });
          };
          reader.onerror = () =>
            reject(new Error(`Failed to read file: ${file.name}`));
          reader.readAsText(file);
        })
      );
      const processedFiles = await Promise.all(filePromises);
      const updatedFiles = [...files, ...processedFiles];
      setFiles(updatedFiles);
      // Notify parent component with the updated file list
      onFilesUploaded(updatedFiles);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Error processing files"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag event handlers to update state and prevent default behavior
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    []
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // This handler explicitly triggers analysis, matching other parts of your code
  const handleAnalyzeClick = useCallback(() => {
    onFilesUploaded(files);
  }, [files, onFilesUploaded]);

  return (
    <div className="file-uploader">
      <div
        className={`file-drop-zone ${isDragging ? "dragging" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="drop-zone-content">
          <i className="file-icon">📁</i>
          <p>Drag and drop your code files here</p>
          <span>or</span>
          <button className="browse-button" onClick={handleBrowseClick}>
            Browse Files
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            accept=".js,.jsx,.ts,.tsx,.py,.java,.rb,.go,.c,.cpp,.h,.cs,.php,.swift,.rs,.kt,.html,.css,.scss,.json,.md,.xml,.sql,.sh,.bash,.yml,.yaml"
            style={{ display: "none" }}
          />
        </div>
      </div>

      {isProcessing && (
        <div className="processing-indicator">
          <div className="spinner"></div>
          <p>Processing files...</p>
        </div>
      )}

      {uploadError && (
        <div className="upload-error">
          <p>{uploadError}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="uploaded-files">
          <h3>Uploaded Files ({files.length})</h3>
          <div className="file-list">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-details">
                    <span className="file-size">{file.size} bytes</span>
                    <span className="file-language">{file.language}</span>
                  </div>
                </div>
                {/* Optionally, add a remove file button if needed */}
              </div>
            ))}
          </div>
          <button
            className="analyze-button"
            onClick={handleAnalyzeClick}
            disabled={files.length === 0}
          >
            Analyze Files
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
