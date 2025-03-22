import React, { useState, useCallback, useRef } from 'react';
import './FileUploader.css';

interface FileWithContent {
  name: string;
  path: string;
  content: string;
  language: string; // Auto-detected language
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

  const detectLanguage = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'jsx':
        return 'jsx';
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'rb':
        return 'ruby';
      case 'go':
        return 'go';
      case 'c':
        return 'c';
      case 'cpp':
      case 'cc':
        return 'cpp';
      case 'cs':
        return 'csharp';
      case 'php':
        return 'php';
      case 'swift':
        return 'swift';
      case 'rs':
        return 'rust';
      case 'kt':
      case 'kts':
        return 'kotlin';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'scss':
        return 'scss';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'xml':
        return 'xml';
      case 'sql':
        return 'sql';
      case 'sh':
      case 'bash':
        return 'bash';
      case 'yml':
      case 'yaml':
        return 'yaml';
      default:
        return 'plaintext';
    }
  };

  const processFiles = async (fileList: FileList) => {
    setIsProcessing(true);
    setUploadError(null);
    
    try {
      const filePromises = Array.from(fileList).map(file => {
        return new Promise<FileWithContent>((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onload = (e) => {
            const content = e.target?.result as string;
            resolve({
              name: file.name,
              path: file.name, // Simplified path, just using the filename
              content,
              language: detectLanguage(file.name),
              size: file.size,
              lastModified: file.lastModified
            });
          };
          
          reader.onerror = () => {
            reject(new Error(`Failed to read file: ${file.name}`));
          };
          
          reader.readAsText(file);
        });
      });
      
      const processedFiles = await Promise.all(filePromises);
      setFiles(prevFiles => [...prevFiles, ...processedFiles]);
      onFilesUploaded(processedFiles);
    } catch (error) {
      setUploadError(`Error processing files: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Error processing files:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, []);
  
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
  const removeFile = useCallback((index: number) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="file-uploader">
      <div 
        className={`file-drop-zone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
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
            style={{ display: 'none' }}
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
                    <span className="file-size">{formatFileSize(file.size)}</span>
                    <span className="file-language">{file.language}</span>
                  </div>
                </div>
                <button 
                  className="remove-file-button" 
                  onClick={() => removeFile(index)}
                  aria-label="Remove file"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
// Ensures file is treated as a module
export {};