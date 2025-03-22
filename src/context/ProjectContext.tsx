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
    selectedFile: string | null;
    selectedFunction: string | null;
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
}

// Action types
type ProjectAction =
    | { type: "ADD_FILES"; payload: FileWithContent[] }
    | { type: "REMOVE_FILE"; payload: string }
    | { type: "CLEAR_FILES" }
    | { type: "SET_SELECTED_FILE"; payload: string | null }
    | { type: "SET_SELECTED_FUNCTION"; payload: string | null }
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
    | { type: "SET_ACTIVE_VISUALIZATION"; payload: string };

// Initial state
const initialState: ProjectState = {
    files: [],
    selectedFile: null,
    selectedFunction: null,
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
                analysisError: null,
            };
            
        case "REMOVE_FILE":
            console.log(`Removing file: ${action.payload}`);
            return {
                ...state,
                files: state.files.filter((file) => file.name !== action.payload),
            };
            
        case "CLEAR_FILES":
            console.log("Clearing all files and results");
            return {
                ...state,
                files: [],
                projectAnalysis: null,
                explanation: "",
                refactoring: "",
                documentation: "",
                onboardingGuide: "",
                question: "",
                answer: "",
                analysisError: null,
            };
            
        case "SET_SELECTED_FILE":
            console.log(`Setting selected file: ${action.payload}`);
            return {
                ...state,
                selectedFile: action.payload,
                // Reset selected function when changing file
                selectedFunction: null,
            };
            
        case "SET_SELECTED_FUNCTION":
            console.log(`Setting selected function: ${action.payload}`);
            return {
                ...state,
                selectedFunction: action.payload,
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
    selectFile: (fileName: string | null) => void;
    selectFunction: (functionName: string | null) => void;
    analyzeProject: () => Promise<void>;
    generateExplanation: (fileName?: string) => Promise<void>;
    generateRefactoring: (fileName?: string) => Promise<void>;
    generateDocumentation: (fileName?: string) => Promise<void>;
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
        
        dispatch({ type: "ADD_FILES", payload: files });
    }, []);

    // Remove file
    const removeFile = useCallback((fileName: string) => {
        console.log(`removeFile called for: ${fileName}`);
        dispatch({ type: "REMOVE_FILE", payload: fileName });
    }, []);

    // Clear files
    const clearFiles = useCallback(() => {
        console.log("clearFiles called");
        dispatch({ type: "CLEAR_FILES" });
    }, []);

    // Select file
    const selectFile = useCallback((fileName: string | null) => {
        console.log(`selectFile called with: ${fileName}`);
        dispatch({ type: "SET_SELECTED_FILE", payload: fileName });
    }, []);

    // Select function
    const selectFunction = useCallback((functionName: string | null) => {
        console.log(`selectFunction called with: ${functionName}`);
        dispatch({ type: "SET_SELECTED_FUNCTION", payload: functionName });
    }, []);

    // Analyze project
    const analyzeProject = useCallback(async () => {
        console.log("analyzeProject called");
        
        if (state.files.length === 0) {
            console.warn("Cannot analyze: no files!");
            return;
        }
        
        // Log file count and names
        console.log(`Analyzing ${state.files.length} files:`);
        state.files.forEach((file, i) => {
            console.log(`${i + 1}. ${file.name} (${file.size} bytes)`);
        });
        
        dispatch({ type: "SET_IS_ANALYZING", payload: true });
        dispatch({ type: "SET_ANALYSIS_ERROR", payload: null });

        try {
            console.log("Calling CodeAnalyzer.analyzeProject...");
            const result = CodeAnalyzer.analyzeProject(state.files);
            
            console.log("Analysis completed successfully!");
            console.log(`Result contains: ${result.files.length} files, ${result.functions.length} functions`);
            
            // Dispatch results to state
            dispatch({ type: "SET_PROJECT_ANALYSIS", payload: result });

            // Generate explanation
            try {
                console.log("Generating initial explanation...");
                dispatch({ type: "SET_IS_GENERATING_EXPLANATION", payload: true });
                
                const explanation = await AIService.generateCodeExplanation(result);
                console.log(`Explanation generated (${explanation.length} chars)`);
                
                dispatch({ type: "SET_EXPLANATION", payload: explanation });
                dispatch({ type: "SET_IS_GENERATING_EXPLANATION", payload: false });
            } catch (explanationError) {
                console.error("Error generating explanation:", explanationError);
                dispatch({ type: "SET_IS_GENERATING_EXPLANATION", payload: false });
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
    }, [state.files]);

    // Generate explanation
    const generateExplanation = useCallback(async (fileName?: string) => {
        console.log(`generateExplanation called for: ${fileName || "entire project"}`);
        
        if (!state.projectAnalysis) {
            console.warn("Cannot generate explanation: no analysis results!");
            return;
        }

        dispatch({ type: "SET_IS_GENERATING_EXPLANATION", payload: true });

        try {
            console.log("Calling AIService.generateCodeExplanation...");
            const explanation = await AIService.generateCodeExplanation(
                state.projectAnalysis,
                fileName
            );
            
            console.log(`Explanation generated (${explanation.length} chars)`);
            dispatch({ type: "SET_EXPLANATION", payload: explanation });
            
        } catch (error) {
            console.error("Error generating explanation:", error);
        } finally {
            dispatch({ type: "SET_IS_GENERATING_EXPLANATION", payload: false });
        }
    }, [state.projectAnalysis]);

    // Generate refactoring
    const generateRefactoring = useCallback(async (fileName?: string) => {
        console.log(`generateRefactoring called for: ${fileName || "entire project"}`);
        
        if (!state.projectAnalysis) {
            console.warn("Cannot generate refactoring: no analysis results!");
            return;
        }

        dispatch({ type: "SET_IS_GENERATING_REFACTORING", payload: true });

        try {
            console.log("Calling AIService.generateRefactoringSuggestions...");
            const refactoring = await AIService.generateRefactoringSuggestions(
                state.projectAnalysis,
                fileName
            );
            
            console.log(`Refactoring suggestions generated (${refactoring.length} chars)`);
            dispatch({ type: "SET_REFACTORING", payload: refactoring });
            
        } catch (error) {
            console.error("Error generating refactoring suggestions:", error);
        } finally {
            dispatch({ type: "SET_IS_GENERATING_REFACTORING", payload: false });
        }
    }, [state.projectAnalysis]);

    // Generate documentation
    const generateDocumentation = useCallback(async (fileName?: string) => {
        console.log(`generateDocumentation called for: ${fileName || "entire project"}`);
        
        if (!state.projectAnalysis) {
            console.warn("Cannot generate documentation: no analysis results!");
            return;
        }

        dispatch({ type: "SET_IS_GENERATING_DOCUMENTATION", payload: true });

        try {
            console.log("Calling AIService.suggestDocumentation...");
            const documentation = await AIService.suggestDocumentation(
                state.projectAnalysis,
                fileName
            );
            
            console.log(`Documentation generated (${documentation.length} chars)`);
            dispatch({ type: "SET_DOCUMENTATION", payload: documentation });
            
        } catch (error) {
            console.error("Error generating documentation:", error);
        } finally {
            dispatch({ type: "SET_IS_GENERATING_DOCUMENTATION", payload: false });
        }
    }, [state.projectAnalysis]);

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
                state.selectedFile || undefined
            );
            
            console.log(`Answer generated (${answer.length} chars)`);
            dispatch({ type: "SET_ANSWER", payload: answer });
            
        } catch (error) {
            console.error("Error getting answer:", error);
        } finally {
            dispatch({ type: "SET_IS_ASKING_QUESTION", payload: false });
        }
    }, [state.projectAnalysis, state.selectedFile]);

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

    // Generate file-specific content when selectedFile changes
    useEffect(() => {
        if (state.projectAnalysis && state.selectedFile) {
            console.log(`Selected file changed to: ${state.selectedFile}`);
            
            // Generate file-specific content
            generateExplanation(state.selectedFile);
            generateRefactoring(state.selectedFile);
            generateDocumentation(state.selectedFile);
        }
    }, [state.selectedFile, state.projectAnalysis, generateExplanation, generateRefactoring, generateDocumentation]);

    // Context value
    const value = {
        state,
        addFiles,
        removeFile,
        clearFiles,
        selectFile,
        selectFunction,
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