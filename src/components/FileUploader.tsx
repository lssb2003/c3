import React, { useState, useCallback, useRef } from "react";
import { useProject } from "../context/ProjectContext";
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
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Get state and methods from ProjectContext
    const { 
        state, 
        selectFileForAnalysis,
    } = useProject();
    
    const { files, selectedFileForAnalysis } = state;

    // Detect language based on file extension
    const detectLanguage = (fileName: string): string => {
        console.log(`Detecting language for file: ${fileName}`);
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
            case "rb":
                return "ruby";
            case "go":
                return "go";
            case "c":
                return "c";
            case "cpp":
            case "cc":
                return "cpp";
            case "cs":
                return "csharp";
            case "php":
                return "php";
            case "swift":
                return "swift";
            case "rs":
                return "rust";
            case "kt":
            case "kts":
                return "kotlin";
            case "html":
                return "html";
            case "css":
                return "css";
            case "scss":
                return "scss";
            case "json":
                return "json";
            case "md":
                return "markdown";
            case "xml":
                return "xml";
            case "sql":
                return "sql";
            case "sh":
            case "bash":
                return "bash";
            case "yml":
            case "yaml":
                return "yaml";
            default:
                console.log(`Unknown extension: ${extension}, defaulting to plaintext`);
                return "plaintext";
        }
    };

    // Process the uploaded files
    const processFiles = async (fileList: FileList) => {
        console.log(`Processing ${fileList.length} files...`);
        setIsProcessing(true);
        setUploadError(null);

        try {
            // Create an array of promises for file reading
            const filePromises = Array.from(fileList).map((file) => {
                console.log(`Reading file: ${file.name} (${file.size} bytes)`);
                
                return new Promise<FileWithContent>((resolve, reject) => {
                    const reader = new FileReader();

                    reader.onload = (e) => {
                        console.log(`File ${file.name} read successfully`);
                        const content = e.target?.result as string;
                        const fileLanguage = detectLanguage(file.name);
                        
                        resolve({
                            name: file.name,
                            path: file.name,
                            content: content,
                            language: fileLanguage,
                            size: file.size,
                            lastModified: file.lastModified,
                        });
                    };

                    reader.onerror = (error) => {
                        console.error(`Error reading file ${file.name}:`, error);
                        reject(new Error(`Failed to read file: ${file.name}`));
                    };

                    // Start reading the file as text
                    reader.readAsText(file);
                });
            });

            // Wait for all files to be processed
            const processedFiles = await Promise.all(filePromises);
            console.log(`Successfully processed ${processedFiles.length} files`);
            
            // Update with all files (new and existing)
            const updatedFiles = [...files, ...processedFiles];
            
            // Notify parent component
            console.log("Notifying parent component of file uploads");
            onFilesUploaded(updatedFiles);
            
        } catch (error) {
            const errorMessage = `Error processing files: ${error instanceof Error ? error.message : String(error)}`;
            console.error(errorMessage);
            setUploadError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle file drop event
    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        console.log("Files dropped");
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            console.log(`${e.dataTransfer.files.length} files dropped`);
            processFiles(e.dataTransfer.files);
        }
    }, [files, onFilesUploaded]);

    // Handle drag over event
    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    // Handle drag leave event
    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    // Handle file input change (when files are selected through the browse button)
    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                console.log(`${e.target.files.length} files selected via browse button`);
                processFiles(e.target.files);
            }
        },
        [files, onFilesUploaded]
    );

    // Handle browse button click
    const handleBrowseClick = useCallback(() => {
        console.log("Browse button clicked");
        fileInputRef.current?.click();
    }, []);

    // Handle file selection change
    const handleFileSelectionChange = useCallback((fileName: string | null) => {
        console.log(`File selection changed to: ${fileName}`);
        selectFileForAnalysis(fileName);
    }, [selectFileForAnalysis]);

    // Handle file removal
    const handleRemoveFile = useCallback((fileName: string) => {
        console.log(`Removing file: ${fileName}`);
        
        // Filter out the file to be removed
        const newFiles = files.filter(file => file.name !== fileName);
        
        // Notify parent of updated file list
        console.log("Notifying parent of file removal");
        onFilesUploaded(newFiles);
    }, [files, onFilesUploaded]);

    // Format file size for display
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    return (
        <div className="file-uploader">
            <div
                className={`file-drop-zone ${isDragging ? "dragging" : ""}`}
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
                    <div className="files-header">
                        <h3>Uploaded Files ({files.length})</h3>
                        <div className="file-selection-controls">
                            <div className="selection-option">
                                <input 
                                    type="radio" 
                                    id="analyze-all" 
                                    name="file-selection" 
                                    checked={selectedFileForAnalysis === null}
                                    onChange={() => handleFileSelectionChange(null)}
                                />
                                <label htmlFor="analyze-all">Analyze All Files</label>
                            </div>
                        </div>
                    </div>
                    
                    <div className="file-list">
                        {files.map((file, index) => (
                            <div 
                                key={index} 
                                className={`file-item ${selectedFileForAnalysis === file.name ? 'selected' : ''}`}
                            >
                                <div className="file-select">
                                    <input 
                                        type="radio"
                                        name="file-selection"
                                        checked={selectedFileForAnalysis === file.name}
                                        onChange={() => handleFileSelectionChange(file.name)}
                                        className="select-file-radio"
                                        aria-label={`Select file ${file.name} for analysis`}
                                    />
                                </div>
                                <div className="file-info">
                                    <div className="file-name">{file.name}</div>
                                    <div className="file-details">
                                        <span className="file-size">
                                            {formatFileSize(file.size)}
                                        </span>
                                        <span className="file-language">{file.language}</span>
                                    </div>
                                </div>
                                <button
                                    className="remove-file-button"
                                    onClick={() => handleRemoveFile(file.name)}
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