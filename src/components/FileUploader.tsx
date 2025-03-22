import React, { useState, useCallback, useRef, useEffect } from "react";
import { useProject, FileWithContent } from "../context/ProjectContext";
import "./FileUploader.css";

// Define interfaces for File System Access API types (for TypeScript)
interface FileSystemEntry {
    isFile: boolean;
    isDirectory: boolean;
    name: string;
    fullPath: string;
    filesystem: any;
}

interface FileSystemFileEntry extends FileSystemEntry {
    isFile: true;
    file(successCallback: (file: File) => void, errorCallback?: (error: any) => void): void;
}

interface FileSystemDirectoryEntry extends FileSystemEntry {
    isDirectory: true;
    createReader(): FileSystemDirectoryReader;
}

interface FileSystemDirectoryReader {
    readEntries(
        successCallback: (entries: FileSystemEntry[]) => void,
        errorCallback?: (error: any) => void
    ): void;
}

interface FileUploaderProps {
    onFilesUploaded: (files: FileWithContent[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesUploaded }) => {
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    
    // Get state and methods from ProjectContext
    const { 
        state, 
        selectFileForAnalysis,
        navigateToFolder,
    } = useProject();
    
    const { files, selectedFileForAnalysis, folderStructure, currentFolder } = state;

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
            // Check if this is a folder upload (using webkitdirectory attribute)
            const hasRelativePath = Array.from(fileList).some(file => 'webkitRelativePath' in file && (file as any).webkitRelativePath);
            
            // Create an array of promises for file reading
            const filePromises = Array.from(fileList).map((file) => {
                console.log(`Reading file: ${file.name} (${file.size} bytes)`);
                
                return new Promise<FileWithContent>((resolve, reject) => {
                    const reader = new FileReader();

                    reader.onload = (e) => {
                        console.log(`File ${file.name} read successfully`);
                        const content = e.target?.result as string;
                        const fileLanguage = detectLanguage(file.name);
                        
                        // Handle folder structure if present
                        const path = hasRelativePath ? 
                            (file as any).webkitRelativePath : 
                            file.name;
                        
                        resolve({
                            name: file.name,
                            path: path, // Use the relative path for folder structure
                            content: content,
                            language: fileLanguage,
                            size: file.size,
                            lastModified: file.lastModified,
                            isFolder: false
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

    // Handle folder or file drop event with enhanced directory support
    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        console.log("Items dropped");
        setIsDragging(false);
        setIsProcessing(true);
        setUploadError(null);

        try {
            // Use DataTransferItemList interface for better directory support
            if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
                console.log(`${e.dataTransfer.items.length} items dropped`);
                
                const processedFiles: FileWithContent[] = [];
                const items = Array.from(e.dataTransfer.items);
                
                // Process each dropped item (file or folder)
                for (const item of items) {
                    // Use webkitGetAsEntry for directory access (supported in modern browsers)
                    // This is non-standard but widely supported
                    const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
                    
                    if (entry) {
                        if (entry.isFile) {
                            console.log(`Processing dropped file: ${entry.name}`);
                            const file = await readFileEntry(entry as unknown as FileSystemFileEntry);
                            if (file) {
                                processedFiles.push(file);
                            }
                        } else if (entry.isDirectory) {
                            console.log(`Processing dropped directory: ${entry.name}`);
                            // Process the directory and all its contents
                            const folderFiles = await readDirectoryEntry(entry as unknown as FileSystemDirectoryEntry);
                            processedFiles.push(...folderFiles);
                        }
                    } else if (item.kind === 'file') {
                        // Fallback for browsers without directory support
                        const file = item.getAsFile();
                        if (file) {
                            console.log(`Processing dropped file (fallback): ${file.name}`);
                            const reader = new FileReader();
                            
                            const fileContent = await new Promise<string>((resolve, reject) => {
                                reader.onload = (e) => resolve(e.target?.result as string);
                                reader.onerror = reject;
                                reader.readAsText(file);
                            });
                            
                            processedFiles.push({
                                name: file.name,
                                path: file.name,
                                content: fileContent,
                                language: detectLanguage(file.name),
                                size: file.size,
                                lastModified: file.lastModified,
                                isFolder: false
                            });
                        }
                    }
                }
                
                console.log(`Processed ${processedFiles.length} files from drop`);
                
                // Update with all files (new and existing)
                const updatedFiles = [...files, ...processedFiles];
                
                // Notify parent component
                console.log("Notifying parent component of dropped files/folders");
                onFilesUploaded(updatedFiles);
            } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                // Fallback to traditional file handling
                console.log("Using fallback file processing for drop");
                processFiles(e.dataTransfer.files);
            }
        } catch (error) {
            const errorMessage = `Error processing dropped items: ${error instanceof Error ? error.message : String(error)}`;
            console.error(errorMessage);
            setUploadError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    }, [files, onFilesUploaded]);

    // Helper to read a file entry from the File System API
    const readFileEntry = (fileEntry: FileSystemFileEntry): Promise<FileWithContent | null> => {
        return new Promise((resolve) => {
            fileEntry.file((file) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    const content = e.target?.result as string;
                    const fileLanguage = detectLanguage(file.name);
                    
                    // Clean up the path (remove leading slash if present)
                    const cleanPath = fileEntry.fullPath.startsWith('/') ? 
                        fileEntry.fullPath.substring(1) : fileEntry.fullPath;
                    
                    resolve({
                        name: file.name,
                        path: cleanPath,
                        content: content,
                        language: fileLanguage,
                        size: file.size,
                        lastModified: file.lastModified,
                        isFolder: false
                    });
                };
                
                reader.onerror = () => {
                    console.error(`Error reading file: ${fileEntry.fullPath}`);
                    resolve(null);
                };
                
                reader.readAsText(file);
            }, () => {
                console.error(`Error accessing file: ${fileEntry.fullPath}`);
                resolve(null);
            });
        });
    };

    // Helper to read a directory entry from the File System API
    const readDirectoryEntry = async (directoryEntry: FileSystemDirectoryEntry): Promise<FileWithContent[]> => {
        const files: FileWithContent[] = [];
        
        // Clean up the path (remove leading slash if present)
        const cleanPath = directoryEntry.fullPath.startsWith('/') ? 
            directoryEntry.fullPath.substring(1) : directoryEntry.fullPath;
        
        // Create a folder entry for the directory itself
        files.push({
            name: directoryEntry.name,
            path: cleanPath,
            content: '',
            language: 'folder',
            size: 0,
            lastModified: Date.now(),
            isFolder: true,
            children: []
        });
        
        // Read all entries in the directory
        const entries = await readDirectoryEntries(directoryEntry);
        
        // Process each entry (recursive for subdirectories)
        for (const entry of entries) {
            if (entry.isFile) {
                const file = await readFileEntry(entry as unknown as FileSystemFileEntry);
                if (file) files.push(file);
            } else if (entry.isDirectory) {
                const subDirFiles = await readDirectoryEntry(entry as unknown as FileSystemDirectoryEntry);
                files.push(...subDirFiles);
            }
        }
        
        return files;
    };

    // Helper to read all entries in a directory
    const readDirectoryEntries = (directoryEntry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> => {
        return new Promise((resolve) => {
            const entries: FileSystemEntry[] = [];
            const reader = directoryEntry.createReader();
            
            // Called recursively to get all entries
            const readEntries = () => {
                reader.readEntries((results) => {
                    if (results.length) {
                        entries.push(...results);
                        readEntries(); // Continue reading if there are more entries
                    } else {
                        resolve(entries); // No more entries, resolve with all collected entries
                    }
                }, (error) => {
                    console.error(`Error reading directory entries: ${error}`);
                    resolve(entries); // Resolve with any entries collected so far
                });
            };
            
            readEntries();
        });
    };

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

    // Handle folder input change (when folders are selected)
    const handleFolderInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                console.log(`${e.target.files.length} files selected via folder browse button`);
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

    // Handle browse folder button click
    const handleBrowseFolderClick = useCallback(() => {
        console.log("Browse folder button clicked");
        folderInputRef.current?.click();
    }, []);

    // Handle file selection change
    const handleFileSelectionChange = useCallback((filePath: string | null) => {
        console.log(`File selection changed to: ${filePath}`);
        selectFileForAnalysis(filePath);
    }, [selectFileForAnalysis]);

    // Handle file removal
    const handleRemoveFile = useCallback((filePath: string) => {
        console.log(`Removing file: ${filePath}`);
        
        // Filter out the file to be removed
        const newFiles = files.filter(file => file.path !== filePath);
        
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

    // Get files and folders in the current directory
    const getCurrentFolderItems = (): FileWithContent[] => {
        if (!currentFolder) {
            // At root level, show top-level items
            return folderStructure;
        }
        
        // Find the current folder in the structure
        const pathParts = currentFolder.split('/');
        let current = folderStructure;
        
        // Navigate down the folder tree
        for (const part of pathParts) {
            if (!part) continue;
            const folder = current.find(item => item.isFolder && item.name === part);
            if (folder && folder.children) {
                current = folder.children;
            } else {
                return []; // Folder not found
            }
        }
        
        return current;
    };

    // Navigate to parent folder
    const handleNavigateToParent = () => {
        if (!currentFolder) return;
        
        const pathParts = currentFolder.split('/');
        pathParts.pop();
        const parentFolder = pathParts.join('/');
        navigateToFolder(parentFolder);
    };

    // Get breadcrumb parts for display
    const getBreadcrumbParts = (): {name: string, path: string}[] => {
        if (!currentFolder) return [];
        
        const parts = currentFolder.split('/');
        const breadcrumbs: {name: string, path: string}[] = [];
        
        let currentPath = '';
        for (const part of parts) {
            if (!part) continue;
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            breadcrumbs.push({
                name: part,
                path: currentPath
            });
        }
        
        return breadcrumbs;
    };

    // Get current folder display items
    const currentItems = getCurrentFolderItems();

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
                    <p>Drag and drop your code files or folders here</p>
                    <span>or</span>
                    <div className="browse-buttons">
                        <button className="browse-button" onClick={handleBrowseClick}>
                            Browse Files
                        </button>
                        <button className="browse-button folder-button" onClick={handleBrowseFolderClick}>
                            Browse Folders
                        </button>
                    </div>
                    
                    {/* Hidden inputs for file/folder selection */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        multiple
                        accept=".js,.jsx,.ts,.tsx,.py,.java,.rb,.go,.c,.cpp,.h,.cs,.php,.swift,.rs,.kt,.html,.css,.scss,.json,.md,.xml,.sql,.sh,.bash,.yml,.yaml"
                        style={{ display: "none" }}
                    />
                    <input
                        type="file"
                        ref={folderInputRef}
                        onChange={handleFolderInputChange}
                        multiple
                        {...{ webkitdirectory: "", directory: "" } as any}
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
                        <h3>Uploaded Files ({files.filter(f => !f.isFolder).length})</h3>
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
                    
                    {/* Folder breadcrumb navigation */}
                    {currentFolder && (
                        <div className="folder-breadcrumbs">
                            <span 
                                className="breadcrumb-item root"
                                onClick={() => navigateToFolder("")}
                            >
                                Root
                            </span>
                            
                            {getBreadcrumbParts().map((part, index) => (
                                <React.Fragment key={index}>
                                    <span className="breadcrumb-separator">/</span>
                                    <span 
                                        className="breadcrumb-item"
                                        onClick={() => navigateToFolder(part.path)}
                                    >
                                        {part.name}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                    
                    {/* Folder/file browser */}
                    <div className="folder-structure">
                        {/* Parent folder navigation option */}
                        {currentFolder && (
                            <div 
                                className="folder-item parent-folder"
                                onClick={handleNavigateToParent}
                            >
                                <div className="folder-icon parent">📂</div>
                                <span className="folder-name">..</span>
                            </div>
                        )}
                        
                        {/* Display folders first */}
                        {currentItems
                            .filter(item => item.isFolder)
                            .map((folder, index) => (
                                <div 
                                    key={`folder-${index}`}
                                    className="folder-item"
                                    onClick={() => navigateToFolder(folder.path)}
                                >
                                    <div className="folder-icon">📁</div>
                                    <span className="folder-name">{folder.name}</span>
                                </div>
                            ))
                        }
                        
                        {/* Then display files */}
                        {currentItems
                            .filter(item => !item.isFolder)
                            .map((file, index) => (
                                <div 
                                    key={`file-${index}`}
                                    className={`file-item ${selectedFileForAnalysis === file.path ? 'selected' : ''}`}
                                >
                                    <div className="file-select">
                                        <input 
                                            type="radio"
                                            name="file-selection"
                                            checked={selectedFileForAnalysis === file.path}
                                            onChange={() => handleFileSelectionChange(file.path)}
                                            className="select-file-radio"
                                            aria-label={`Select file ${file.name} for analysis`}
                                        />
                                    </div>
                                    <div className="file-info">
                                        <div className="file-icon">📄</div>
                                        <div className="file-details">
                                            <div className="file-name">{file.name}</div>
                                            <div className="file-meta">
                                                <span className="file-size">
                                                    {formatFileSize(file.size)}
                                                </span>
                                                <span className="file-language">{file.language}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        className="remove-file-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveFile(file.path);
                                        }}
                                        aria-label="Remove file"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        }
                        
                        {/* Empty folder message */}
                        {currentItems.length === 0 && (
                            <div className="empty-folder-message">
                                This folder is empty
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUploader;