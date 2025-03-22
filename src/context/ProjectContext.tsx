import React, {
    createContext,
    useContext,
    useReducer,
    useCallback,
    useEffect,
} from "react";
import CodeAnalyzer, { ProjectAnalysisResult } from "../services/CodeAnalyzer";
import AIService from "../services/AIService";

// File interface
export interface FileWithContent {
    name: string;
    path: string;
    content: string;
    language: string;
    size: number;
    lastModified: number;
}

// Project state interface
interface ProjectState {
    files: FileWithContent[];
    selectedFileForAnalysis: string | null; // Changed: Now only one file can be selected
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
    analysisScope: 'single-file' | 'all-files'; // New: Track what was analyzed
}

// Action types
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
    | { type: "SET_ANALYSIS_SCOPE"; payload: 'single-file' | 'all-files' };

// Initial state
const initialState: ProjectState = {
    files: [],
    selectedFileForAnalysis: null,
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
    analysisScope: 'all-files' // Default scope
};

// Reducer function
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
            };
            
        case "REMOVE_FILE":
            console.log(`Removing file: ${action.payload}`);
            const isRemovedFileSelected = state.selectedFileForAnalysis === action.payload;
            
            return {
                ...state,
                files: state.files.filter((file) => file.name !== action.payload),
                // Reset selection if the removed file was selected
                selectedFileForAnalysis: isRemovedFileSelected ? null : state.selectedFileForAnalysis
            };
            
        case "CLEAR_FILES":
            console.log("Clearing all files and results");
            return {
                ...state,
                files: [],
                selectedFileForAnalysis: null,
                projectAnalysis: null,
                explanation: "",
                refactoring: "",
                documentation: "",
                onboardingGuide: "",
                question: "",
                answer: "",
                analysisError: null,
                analysisScope: 'all-files'
            };
            
        case "SELECT_FILE_FOR_ANALYSIS":
            console.log(`Selecting file for analysis: ${action.payload}`);
            return {
                ...state,
                selectedFileForAnalysis: action.payload
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
            
        default:
            console.warn(`Unknown action type: ${(action as any).type}`);
            return state;
    }
}

// Context interface
interface ProjectContextType {
    state: ProjectState;
    addFiles: (files: FileWithContent[]) => void;
    removeFile: (fileName: string) => void;
    clearFiles: () => void;
    selectFileForAnalysis: (fileName: string | null) => void;
    analyzeProject: () => Promise<void>;
    generateExplanation: () => Promise<void>;
    generateRefactoring: () => Promise<void>;
    generateDocumentation: () => Promise<void>;
    generateOnboardingGuide: () => Promise<void>;
    askQuestion: (question: string) => Promise<void>;
    setQuestion: (question: string) => void;
    setActiveTab: (tab: string) => void;
    setActiveVisualization: (visualization: string) => void;
}

// Create context
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Provider component
export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [state, dispatch] = useReducer(projectReducer, initialState);

    // Add files
    const addFiles = useCallback((files: FileWithContent[]) => {
        console.log(`addFiles called with ${files.length} files`);
        if (files.length === 0) {
            console.warn("No files to add!");
            return;
        }
        
        // Log file names for debugging
        files.forEach((file, index) => {
            console.log(`File ${index + 1}: ${file.name} (${file.size} bytes, ${file.content.length} chars)`);
        });
        
        // Load files into AIService to make content available for analysis
        AIService.loadFiles(files);
        
        dispatch({ type: "ADD_FILES", payload: files });
    }, []);

    // Remove file
    const removeFile = useCallback((fileName: string) => {
        console.log(`removeFile called for: ${fileName}`);
        
        // Update files and reload into AIService
        const updatedFiles = state.files.filter((file) => file.name !== fileName);
        AIService.loadFiles(updatedFiles);
        
        dispatch({ type: "REMOVE_FILE", payload: fileName });
    }, [state.files]);

    // Clear files
    const clearFiles = useCallback(() => {
        console.log("clearFiles called");
        
        // Clear files from AIService
        AIService.loadFiles([]);
        
        dispatch({ type: "CLEAR_FILES" });
    }, []);

    // Select file for analysis
    const selectFileForAnalysis = useCallback((fileName: string | null) => {
        console.log(`selectFileForAnalysis called with: ${fileName}`);
        dispatch({ type: "SELECT_FILE_FOR_ANALYSIS", payload: fileName });
    }, []);

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

    // Analyze project
    const analyzeProject = useCallback(async () => {
        console.log("analyzeProject called");
        
        if (state.files.length === 0) {
            console.warn("Cannot analyze: no files!");
            return;
        }
        
        // Determine which files to analyze based on selection
        let filesToAnalyze = state.files;
        let scope: 'single-file' | 'all-files' = 'all-files';
        
        if (state.selectedFileForAnalysis) {
            // If a specific file is selected, only analyze that file
            filesToAnalyze = state.files.filter(file => file.name === state.selectedFileForAnalysis);
            scope = 'single-file';
            console.log(`Analyzing single file: ${state.selectedFileForAnalysis}`);
        } else {
            console.log(`Analyzing all ${state.files.length} files`);
        }
        
        dispatch({ type: "SET_ANALYSIS_SCOPE", payload: scope });
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
    }, [state.files, state.selectedFileForAnalysis, generateExplanation, generateRefactoring, generateDocumentation, generateOnboardingGuide]);

    // Effect to load files into AIService when they change
    useEffect(() => {
        if (state.files.length > 0) {
            console.log(`Loading ${state.files.length} files into AIService...`);
            AIService.loadFiles(state.files);
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