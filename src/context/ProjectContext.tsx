// src/context/ProjectContext.tsx - Updated version
import React, {
    createContext,
    useContext,
    useReducer,
    useCallback,
    useEffect,
} from "react";
import CodeAnalyzer, { ProjectAnalysisResult } from "../services/CodeAnalyzer";
import AIService from "../services/AIService";
import { CodeRange } from "../components/CodeViewer";

// File interface with expanded properties for folder support
export interface FileWithContent {
    name: string;
    path: string;         // Full path including folders (e.g., src/components/File.tsx)
    content: string;
    language: string;
    size: number;
    lastModified: number;
    isFolder?: boolean;   // New property to indicate if it's a folder
    children?: FileWithContent[]; // For folders, contains child files/folders
}

// New interface for code optimizations
interface CodeOptimization {
    fileName: string;
    ranges: CodeRange[];
}

// Project state interface with folder structure support
interface ProjectState {
    files: FileWithContent[];
    selectedFileForAnalysis: string | null; // Now uses path instead of just name
    folderStructure: FileWithContent[]; // Root level files/folders for hierarchical view
    currentFolder: string; // Current folder path being viewed
    projectAnalysis: ProjectAnalysisResult | null;
    isAnalyzing: boolean;
    analysisError: string | null;
    explanation: string;
    refactoring: string;
    documentation: string;
    onboardingGuide: string;
    isGeneratingExplanation: boolean;
    isGeneratingRefactoring: boolean;
    isGeneratingDocumentation: boolean;
    isGeneratingOnboardingGuide: boolean;
    question: string;
    answer: string;
    isAskingQuestion: boolean;
    activeTab: string;
    activeVisualization: string;
    analysisScope: 'single-file' | 'all-files';
    codeOptimizations: CodeOptimization[];
    isGeneratingOptimizations: boolean;
}

// Action types with new folder-related actions
type ProjectAction =
    | { type: "ADD_FILES"; payload: FileWithContent[] }
    | { type: "REMOVE_FILE"; payload: string }
    | { type: "CLEAR_FILES" }
    | { type: "SELECT_FILE_FOR_ANALYSIS"; payload: string | null }
    | { type: "SET_PROJECT_ANALYSIS"; payload: ProjectAnalysisResult }
    | { type: "SET_IS_ANALYZING"; payload: boolean }
    | { type: "SET_ANALYSIS_ERROR"; payload: string | null }
    | { type: "SET_EXPLANATION"; payload: string }
    | { type: "SET_REFACTORING"; payload: string }
    | { type: "SET_DOCUMENTATION"; payload: string }
    | { type: "SET_ONBOARDING_GUIDE"; payload: string }
    | { type: "SET_IS_GENERATING_EXPLANATION"; payload: boolean }
    | { type: "SET_IS_GENERATING_REFACTORING"; payload: boolean }
    | { type: "SET_IS_GENERATING_DOCUMENTATION"; payload: boolean }
    | { type: "SET_IS_GENERATING_ONBOARDING_GUIDE"; payload: boolean }
    | { type: "SET_QUESTION"; payload: string }
    | { type: "SET_ANSWER"; payload: string }
    | { type: "SET_IS_ASKING_QUESTION"; payload: boolean }
    | { type: "SET_ACTIVE_TAB"; payload: string }
    | { type: "SET_ACTIVE_VISUALIZATION"; payload: string }
    | { type: "SET_ANALYSIS_SCOPE"; payload: 'single-file' | 'all-files' }
    | { type: "SET_FOLDER_STRUCTURE"; payload: FileWithContent[] }
    | { type: "SET_CURRENT_FOLDER"; payload: string }
    | { type: "SET_CODE_OPTIMIZATIONS"; payload: CodeOptimization }
    | { type: "SET_IS_GENERATING_OPTIMIZATIONS"; payload: boolean };

// Initial state with folder structure properties
const initialState: ProjectState = {
    files: [],
    selectedFileForAnalysis: null,
    folderStructure: [],
    currentFolder: "",
    projectAnalysis: null,
    isAnalyzing: false,
    analysisError: null,
    explanation: "",
    refactoring: "",
    documentation: "",
    onboardingGuide: "",
    isGeneratingExplanation: false,
    isGeneratingRefactoring: false,
    isGeneratingDocumentation: false,
    isGeneratingOnboardingGuide: false,
    question: "",
    answer: "",
    isAskingQuestion: false,
    activeTab: "dashboard",
    activeVisualization: "project",
    analysisScope: 'all-files',  // Default to all-files scope
    codeOptimizations: [],
    isGeneratingOptimizations: false
};

// Reducer function with new folder-related cases
function projectReducer(
    state: ProjectState,
    action: ProjectAction
): ProjectState {
    console.log(`Reducer received action: ${action.type}`);
    
    switch (action.type) {
        case "ADD_FILES":
            console.log(`Adding/replacing ${action.payload.length} files`);
            return {
                ...state,
                files: action.payload,
                selectedFileForAnalysis: null, // Reset selection
                analysisError: null,
                analysisScope: 'all-files', // Reset to all-files scope when adding files
            };
            
        case "REMOVE_FILE":
            console.log(`Removing file: ${action.payload}`);
            const isRemovedFileSelected = state.selectedFileForAnalysis === action.payload;
            
            return {
                ...state,
                files: state.files.filter((file) => file.path !== action.payload),
                // Reset selection if the removed file was selected
                selectedFileForAnalysis: isRemovedFileSelected ? null : state.selectedFileForAnalysis,
                // Update scope if the selected file was removed
                analysisScope: isRemovedFileSelected ? 'all-files' : state.analysisScope
            };
            
        case "CLEAR_FILES":
            console.log("Clearing all files and results");
            return {
                ...state,
                files: [],
                folderStructure: [],
                currentFolder: "",
                selectedFileForAnalysis: null,
                projectAnalysis: null,
                explanation: "",
                refactoring: "",
                documentation: "",
                onboardingGuide: "",
                question: "",
                answer: "",
                analysisError: null,
                analysisScope: 'all-files',
                codeOptimizations: [],
            };
            
        case "SELECT_FILE_FOR_ANALYSIS":
            console.log(`Selecting file for analysis: ${action.payload}`);
            // Set the scope based on the selection
            const newScope = action.payload ? 'single-file' : 'all-files';
            console.log(`Setting analysis scope to: ${newScope}`);
            
            return {
                ...state,
                selectedFileForAnalysis: action.payload,
                analysisScope: newScope // Update scope based on selection
            };
            
        case "SET_FOLDER_STRUCTURE":
            console.log(`Setting folder structure with ${action.payload.length} root items`);
            return {
                ...state,
                folderStructure: action.payload
            };
            
        case "SET_CURRENT_FOLDER":
            console.log(`Navigating to folder: ${action.payload}`);
            return {
                ...state,
                currentFolder: action.payload
            };
            
        case "SET_PROJECT_ANALYSIS":
            console.log("Setting project analysis results");
            return {
                ...state,
                projectAnalysis: action.payload,
            };
            
        case "SET_IS_ANALYZING":
            console.log(`Setting isAnalyzing: ${action.payload}`);
            return {
                ...state,
                isAnalyzing: action.payload,
            };
            
        case "SET_ANALYSIS_ERROR":
            if (action.payload) {
                console.error(`Setting analysis error: ${action.payload}`);
            } else {
                console.log("Clearing analysis error");
            }
            return {
                ...state,
                analysisError: action.payload,
            };
            
        case "SET_EXPLANATION":
            console.log(`Setting explanation (${action.payload.length} chars)`);
            return {
                ...state,
                explanation: action.payload,
            };
            
        case "SET_REFACTORING":
            console.log(`Setting refactoring suggestions (${action.payload.length} chars)`);
            return {
                ...state,
                refactoring: action.payload,
            };
            
        case "SET_DOCUMENTATION":
            console.log(`Setting documentation (${action.payload.length} chars)`);
            return {
                ...state,
                documentation: action.payload,
            };
            
        case "SET_ONBOARDING_GUIDE":
            console.log(`Setting onboarding guide (${action.payload.length} chars)`);
            return {
                ...state,
                onboardingGuide: action.payload,
            };
            
        case "SET_IS_GENERATING_EXPLANATION":
            console.log(`Setting isGeneratingExplanation: ${action.payload}`);
            return {
                ...state,
                isGeneratingExplanation: action.payload,
            };
            
        case "SET_IS_GENERATING_REFACTORING":
            console.log(`Setting isGeneratingRefactoring: ${action.payload}`);
            return {
                ...state,
                isGeneratingRefactoring: action.payload,
            };
            
        case "SET_IS_GENERATING_DOCUMENTATION":
            console.log(`Setting isGeneratingDocumentation: ${action.payload}`);
            return {
                ...state,
                isGeneratingDocumentation: action.payload,
            };
            
        case "SET_IS_GENERATING_ONBOARDING_GUIDE":
            console.log(`Setting isGeneratingOnboardingGuide: ${action.payload}`);
            return {
                ...state,
                isGeneratingOnboardingGuide: action.payload,
            };
            
        case "SET_QUESTION":
            return {
                ...state,
                question: action.payload,
            };
            
        case "SET_ANSWER":
            console.log(`Setting answer (${action.payload.length} chars)`);
            return {
                ...state,
                answer: action.payload,
            };
            
        case "SET_IS_ASKING_QUESTION":
            console.log(`Setting isAskingQuestion: ${action.payload}`);
            return {
                ...state,
                isAskingQuestion: action.payload,
            };
            
        case "SET_ACTIVE_TAB":
            console.log(`Setting activeTab: ${action.payload}`);
            return {
                ...state,
                activeTab: action.payload,
            };
            
        case "SET_ACTIVE_VISUALIZATION":
            console.log(`Setting activeVisualization: ${action.payload}`);
            return {
                ...state,
                activeVisualization: action.payload,
            };
            
        case "SET_ANALYSIS_SCOPE":
            console.log(`Setting analysis scope: ${action.payload}`);
            return {
                ...state,
                analysisScope: action.payload,
            };
            
        case "SET_CODE_OPTIMIZATIONS":
            console.log(`Setting code optimizations for: ${action.payload.fileName}`);
            return {
                ...state,
                codeOptimizations: [
                    ...state.codeOptimizations.filter(opt => opt.fileName !== action.payload.fileName), 
                    action.payload
                ]
            };
            
        case "SET_IS_GENERATING_OPTIMIZATIONS":
            console.log(`Setting isGeneratingOptimizations: ${action.payload}`);
            return {
                ...state,
                isGeneratingOptimizations: action.payload
            };
            
        default:
            console.warn(`Unknown action type: ${(action as any).type}`);
            return state;
    }
}

// Context interface with folder-related methods
interface ProjectContextType {
    state: ProjectState;
    addFiles: (files: FileWithContent[]) => void;
    removeFile: (filePath: string) => void;
    clearFiles: () => void;
    selectFileForAnalysis: (filePath: string | null) => void;
    analyzeProject: () => Promise<void>;
    generateExplanation: () => Promise<void>;
    generateRefactoring: () => Promise<void>;
    generateDocumentation: () => Promise<void>;
    generateOnboardingGuide: () => Promise<void>;
    askQuestion: (question: string) => Promise<void>;
    setQuestion: (question: string) => void;
    setActiveTab: (tab: string) => void;
    setActiveVisualization: (visualization: string) => void;
    setFolderStructure: (structure: FileWithContent[]) => void;
    navigateToFolder: (folderPath: string) => void;
    generateCodeOptimizations: (fileName: string) => Promise<void>;
}

// Create context
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Helper function to build folder structure from flat file list
const buildFolderStructure = (files: FileWithContent[]): FileWithContent[] => {
    const root: FileWithContent[] = [];
    const folderMap: Record<string, FileWithContent> = {};
    
    // First pass: create all folders
    files.forEach(file => {
        // Skip folders that are already processed
        if (file.isFolder) {
            // Only add to root if it's a top-level folder
            if (!file.path.includes('/')) {
                root.push(file);
            }
            folderMap[file.path] = file;
            return;
        }
        
        const pathParts = file.path.split('/');
        const fileName = pathParts.pop() || '';
        let currentPath = '';
        
        // Create folder hierarchy
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (!part) continue;
            
            const parentPath = currentPath;
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            
            if (!folderMap[currentPath]) {
                const folder: FileWithContent = {
                    name: part,
                    path: currentPath,
                    content: '',
                    language: 'folder',
                    size: 0,
                    lastModified: Date.now(),
                    isFolder: true,
                    children: []
                };
                
                folderMap[currentPath] = folder;
                
                if (!parentPath) {
                    root.push(folder);
                } else if (folderMap[parentPath]) {
                    folderMap[parentPath].children = folderMap[parentPath].children || [];
                    folderMap[parentPath].children!.push(folder);
                }
            }
        }
    });
    
    // Second pass: add files to appropriate folders
    files.forEach(file => {
        // Skip folders
        if (file.isFolder) return;
        
        const pathParts = file.path.split('/');
        const fileName = pathParts.pop() || '';
        const folderPath = pathParts.join('/');
        
        const fileItem: FileWithContent = {
            ...file,
            name: fileName,
            isFolder: false
        };
        
        if (!folderPath) {
            root.push(fileItem);
        } else if (folderMap[folderPath]) {
            folderMap[folderPath].children = folderMap[folderPath].children || [];
            folderMap[folderPath].children!.push(fileItem);
        }
    });
    
    return root;
};

// Provider component
export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [state, dispatch] = useReducer(projectReducer, initialState);

    // Add files (updated to handle folder structure)
    const addFiles = useCallback((files: FileWithContent[]) => {
        console.log(`addFiles called with ${files.length} files`);
        if (files.length === 0) {
            console.warn("No files to add!");
            return;
        }
        
        // Log file information for debugging
        files.forEach((file, index) => {
            console.log(`File ${index + 1}: ${file.path} (${file.size} bytes, ${file.content.length} chars)`);
        });
        
        // Load files into AIService to make content available for analysis
        // Filter out folders for AIService since it only needs actual files
        const actualFiles = files.filter(file => !file.isFolder);
        AIService.loadFiles(actualFiles);
        
        // Build folder structure
        const folderStructure = buildFolderStructure(files);
        
        // Update state
        dispatch({ type: "ADD_FILES", payload: files });
        dispatch({ type: "SET_FOLDER_STRUCTURE", payload: folderStructure });
    }, []);

    // Remove file (updated to use path)
    const removeFile = useCallback((filePath: string) => {
        console.log(`removeFile called for: ${filePath}`);
        
        // Filter the files to exclude the removed file
        const updatedFiles = state.files.filter((file) => file.path !== filePath);
        
        // Load the updated files into AIService
        const actualFiles = updatedFiles.filter(file => !file.isFolder);
        AIService.loadFiles(actualFiles);
        
        // Rebuild folder structure
        const updatedFolderStructure = buildFolderStructure(updatedFiles);
        
        // Update state
        dispatch({ type: "REMOVE_FILE", payload: filePath });
        dispatch({ type: "SET_FOLDER_STRUCTURE", payload: updatedFolderStructure });
    }, [state.files]);

    // Clear files
    const clearFiles = useCallback(() => {
        console.log("clearFiles called");
        
        // Clear files from AIService
        AIService.loadFiles([]);
        
        dispatch({ type: "CLEAR_FILES" });
    }, []);

    // Set folder structure directly
    const setFolderStructure = useCallback((structure: FileWithContent[]) => {
        console.log(`setFolderStructure called with ${structure.length} root items`);
        dispatch({ type: "SET_FOLDER_STRUCTURE", payload: structure });
    }, []);

    // Navigate to a folder
    const navigateToFolder = useCallback((folderPath: string) => {
        console.log(`navigateToFolder called with: ${folderPath}`);
        dispatch({ type: "SET_CURRENT_FOLDER", payload: folderPath });
    }, []);

    // Select file for analysis (now uses path)
    const selectFileForAnalysis = useCallback((filePath: string | null) => {
        console.log(`selectFileForAnalysis called with: ${filePath}`);
        dispatch({ type: "SELECT_FILE_FOR_ANALYSIS", payload: filePath });
    }, []);

    // Generate code optimizations for a specific file
    const generateCodeOptimizations = useCallback(async (fileName: string) => {
        console.log(`generateCodeOptimizations called for: ${fileName}`);
        
        const fileObj = state.files.find(file => file.path === fileName);
        
        if (!fileObj) {
            console.warn(`Cannot generate optimizations: file not found: ${fileName}`);
            return;
        }

        dispatch({ type: "SET_IS_GENERATING_OPTIMIZATIONS", payload: true });

        try {
            console.log("Calling AIService.generateCodeOptimizations...");
            const optimizationRanges = await AIService.generateCodeOptimizations(
                fileName,
                fileObj.content
            );
            
            console.log(`Optimization suggestions generated with ${optimizationRanges.length} ranges`);
            
            dispatch({ 
                type: "SET_CODE_OPTIMIZATIONS", 
                payload: {
                    fileName,
                    ranges: optimizationRanges
                }
            });
        } catch (error) {
            console.error("Error generating code optimizations:", error);
        } finally {
            dispatch({ type: "SET_IS_GENERATING_OPTIMIZATIONS", payload: false });
        }
    }, [state.files]);

    // Generate explanation based on current analysis scope
    const generateExplanation = useCallback(async () => {
        console.log(`generateExplanation called for ${state.analysisScope}`);
        
        if (!state.projectAnalysis) {
            console.warn("Cannot generate explanation: no analysis results!");
            return;
        }

        dispatch({ type: "SET_IS_GENERATING_EXPLANATION", payload: true });

        try {
            console.log("Calling AIService.generateCodeExplanation...");
            const explanation = await AIService.generateCodeExplanation(
                state.projectAnalysis,
                state.analysisScope === 'single-file' ? state.selectedFileForAnalysis || undefined : undefined
            );
            
            console.log(`Explanation generated (${explanation.length} chars)`);
            dispatch({ type: "SET_EXPLANATION", payload: explanation });
            
        } catch (error) {
            console.error("Error generating explanation:", error);
        } finally {
            dispatch({ type: "SET_IS_GENERATING_EXPLANATION", payload: false });
        }
    }, [state.projectAnalysis, state.selectedFileForAnalysis, state.analysisScope]);

    // Generate refactoring based on current analysis scope
    const generateRefactoring = useCallback(async () => {
        console.log(`generateRefactoring called for ${state.analysisScope}`);
        
        if (!state.projectAnalysis) {
            console.warn("Cannot generate refactoring: no analysis results!");
            return;
        }

        dispatch({ type: "SET_IS_GENERATING_REFACTORING", payload: true });

        try {
            console.log("Calling AIService.generateRefactoringSuggestions...");
            const refactoring = await AIService.generateRefactoringSuggestions(
                state.projectAnalysis,
                state.analysisScope === 'single-file' ? state.selectedFileForAnalysis || undefined : undefined
            );
            
            console.log(`Refactoring suggestions generated (${refactoring.length} chars)`);
            dispatch({ type: "SET_REFACTORING", payload: refactoring });
            
        } catch (error) {
            console.error("Error generating refactoring suggestions:", error);
        } finally {
            dispatch({ type: "SET_IS_GENERATING_REFACTORING", payload: false });
        }
    }, [state.projectAnalysis, state.selectedFileForAnalysis, state.analysisScope]);

    // Generate documentation based on current analysis scope
    const generateDocumentation = useCallback(async () => {
        console.log(`generateDocumentation called for ${state.analysisScope}`);
        
        if (!state.projectAnalysis) {
            console.warn("Cannot generate documentation: no analysis results!");
            return;
        }

        dispatch({ type: "SET_IS_GENERATING_DOCUMENTATION", payload: true });

        try {
            console.log("Calling AIService.suggestDocumentation...");
            const documentation = await AIService.suggestDocumentation(
                state.projectAnalysis,
                state.analysisScope === 'single-file' ? state.selectedFileForAnalysis || undefined : undefined
            );
            
            console.log(`Documentation generated (${documentation.length} chars)`);
            dispatch({ type: "SET_DOCUMENTATION", payload: documentation });
            
        } catch (error) {
            console.error("Error generating documentation:", error);
        } finally {
            dispatch({ type: "SET_IS_GENERATING_DOCUMENTATION", payload: false });
        }
    }, [state.projectAnalysis, state.selectedFileForAnalysis, state.analysisScope]);

    // Generate onboarding guide
    const generateOnboardingGuide = useCallback(async () => {
        console.log("generateOnboardingGuide called");
        
        if (!state.projectAnalysis) {
            console.warn("Cannot generate onboarding guide: no analysis results!");
            return;
        }

        dispatch({ type: "SET_IS_GENERATING_ONBOARDING_GUIDE", payload: true });

        try {
            console.log("Calling AIService.generateOnboardingGuide...");
            const guide = await AIService.generateOnboardingGuide(
                state.projectAnalysis
            );
            
            console.log(`Onboarding guide generated (${guide.length} chars)`);
            dispatch({ type: "SET_ONBOARDING_GUIDE", payload: guide });
            
        } catch (error) {
            console.error("Error generating onboarding guide:", error);
        } finally {
            dispatch({ type: "SET_IS_GENERATING_ONBOARDING_GUIDE", payload: false });
        }
    }, [state.projectAnalysis]);

    // Ask question
    const askQuestion = useCallback(async (questionText: string) => {
        console.log(`askQuestion called with: "${questionText}"`);
        
        if (!state.projectAnalysis) {
            console.warn("Cannot ask question: no analysis results!");
            return;
        }
        
        if (!questionText.trim()) {
            console.warn("Cannot ask empty question!");
            return;
        }

        dispatch({ type: "SET_IS_ASKING_QUESTION", payload: true });

        try {
            console.log("Calling AIService.generateAnswer...");
            const answer = await AIService.generateAnswer(
                state.projectAnalysis,
                questionText,
                state.analysisScope === 'single-file' ? state.selectedFileForAnalysis || undefined : undefined
            );
            
            console.log(`Answer generated (${answer.length} chars)`);
            dispatch({ type: "SET_ANSWER", payload: answer });
            
        } catch (error) {
            console.error("Error getting answer:", error);
        } finally {
            dispatch({ type: "SET_IS_ASKING_QUESTION", payload: false });
        }
    }, [state.projectAnalysis, state.selectedFileForAnalysis, state.analysisScope]);

    // Set question
    const setQuestion = useCallback((question: string) => {
        dispatch({ type: "SET_QUESTION", payload: question });
    }, []);

    // Set active tab
    const setActiveTab = useCallback((tab: string) => {
        console.log(`setActiveTab called with: ${tab}`);
        dispatch({ type: "SET_ACTIVE_TAB", payload: tab });
    }, []);

    // Set active visualization
    const setActiveVisualization = useCallback((visualization: string) => {
        console.log(`setActiveVisualization called with: ${visualization}`);
        dispatch({ type: "SET_ACTIVE_VISUALIZATION", payload: visualization });
    }, []);

    // Analyze project (updated to use path instead of name)
    const analyzeProject = useCallback(async () => {
        console.log("analyzeProject called");
        
        if (state.files.length === 0) {
            console.warn("Cannot analyze: no files!");
            return;
        }
        
        // Determine which files to analyze based on selection
        // Filter out folders, as we only analyze actual files
        let filesToAnalyze = state.files.filter(file => !file.isFolder);
        let scope: 'single-file' | 'all-files' = 'all-files';
        
        if (state.selectedFileForAnalysis) {
            // If a specific file is selected, only analyze that file
            filesToAnalyze = filesToAnalyze.filter(file => file.path === state.selectedFileForAnalysis);
            scope = 'single-file';
            console.log(`Analyzing single file: ${state.selectedFileForAnalysis}`);
        } else {
            console.log(`Analyzing all ${filesToAnalyze.length} files`);
        }
        
        // Ensure scope is correctly set based on file selection
        if (scope !== state.analysisScope) {
            console.log(`Updating analysis scope from ${state.analysisScope} to ${scope}`);
            dispatch({ type: "SET_ANALYSIS_SCOPE", payload: scope });
        }
        
        dispatch({ type: "SET_IS_ANALYZING", payload: true });
        dispatch({ type: "SET_ANALYSIS_ERROR", payload: null });
        
        // Reset all content
        dispatch({ type: "SET_EXPLANATION", payload: "" });
        dispatch({ type: "SET_REFACTORING", payload: "" });
        dispatch({ type: "SET_DOCUMENTATION", payload: "" });
        dispatch({ type: "SET_ONBOARDING_GUIDE", payload: "" });
        dispatch({ type: "SET_ANSWER", payload: "" });

        try {
            console.log("Calling CodeAnalyzer.analyzeProject...");
            const result = CodeAnalyzer.analyzeProject(filesToAnalyze);
            
            console.log("Analysis completed successfully!");
            console.log(`Result contains: ${result.files.length} files, ${result.functions.length} functions`);
            
            // Make sure AIService has the files loaded
            AIService.loadFiles(filesToAnalyze);
            
            // Dispatch results to state
            dispatch({ type: "SET_PROJECT_ANALYSIS", payload: result });

            // Generate all content types based on the analyzed scope
            try {
                // Generate explanation
                await generateExplanation();
                
                // Generate refactoring
                await generateRefactoring();
                
                // Generate documentation
                await generateDocumentation();
                
                // Only generate onboarding guide for all-files scope
                if (scope === 'all-files') {
                    await generateOnboardingGuide();
                }
                
            } catch (error) {
                console.error("Error generating content:", error);
            }
            
        } catch (error) {
            console.error("Error analyzing project:", error);
            
            const errorMessage = error instanceof Error
                ? error.message
                : "Unknown error analyzing project";
                
            console.error(errorMessage);
            dispatch({ type: "SET_ANALYSIS_ERROR", payload: errorMessage });
            
        } finally {
            dispatch({ type: "SET_IS_ANALYZING", payload: false });
        }
    }, [state.files, state.selectedFileForAnalysis, state.analysisScope, generateExplanation, generateRefactoring, generateDocumentation, generateOnboardingGuide]);

    // Effect to load files into AIService when they change
    useEffect(() => {
        if (state.files.length > 0) {
            console.log(`Loading files into AIService...`);
            // Filter out folders, as AIService only needs actual files
            const actualFiles = state.files.filter(file => !file.isFolder);
            console.log(`Loading ${actualFiles.length} actual files into AIService (excluding folders)`);
            AIService.loadFiles(actualFiles);
        }
    }, []);

    // Context value
    const value = {
        state,
        addFiles,
        removeFile,
        clearFiles,
        selectFileForAnalysis,
        analyzeProject,
        generateExplanation,
        generateRefactoring,
        generateDocumentation,
        generateOnboardingGuide,
        askQuestion,
        setQuestion,
        setActiveTab,
        setActiveVisualization,
        setFolderStructure,
        navigateToFolder,
        generateCodeOptimizations,
    };

    return (
        <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
    );
};

// Hook to use the project context
export const useProject = (): ProjectContextType => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error("useProject must be used within a ProjectProvider");
    }
    return context;
};

export default ProjectContext;