import React, { createContext, useContext, useReducer, useState, useEffect } from 'react';
import CodeAnalyzer, { ProjectAnalysisResult } from '../services/CodeAnalyzer';
import AIService from '../services/AIService';

export interface FileWithContent {
  name: string;
  path: string;
  content: string;
  language: string;
  size: number;
  lastModified: number;
}

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

type ProjectAction =
  | { type: 'ADD_FILES'; payload: FileWithContent[] }
  | { type: 'REMOVE_FILE'; payload: string }
  | { type: 'CLEAR_FILES' }
  | { type: 'SET_SELECTED_FILE'; payload: string | null }
  | { type: 'SET_SELECTED_FUNCTION'; payload: string | null }
  | { type: 'SET_PROJECT_ANALYSIS'; payload: ProjectAnalysisResult }
  | { type: 'SET_IS_ANALYZING'; payload: boolean }
  | { type: 'SET_ANALYSIS_ERROR'; payload: string | null }
  | { type: 'SET_EXPLANATION'; payload: string }
  | { type: 'SET_REFACTORING'; payload: string }
  | { type: 'SET_DOCUMENTATION'; payload: string }
  | { type: 'SET_ONBOARDING_GUIDE'; payload: string }
  | { type: 'SET_IS_GENERATING_EXPLANATION'; payload: boolean }
  | { type: 'SET_IS_GENERATING_REFACTORING'; payload: boolean }
  | { type: 'SET_IS_GENERATING_DOCUMENTATION'; payload: boolean }
  | { type: 'SET_IS_GENERATING_ONBOARDING_GUIDE'; payload: boolean }
  | { type: 'SET_QUESTION'; payload: string }
  | { type: 'SET_ANSWER'; payload: string }
  | { type: 'SET_IS_ASKING_QUESTION'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SET_ACTIVE_VISUALIZATION'; payload: string };

const initialState: ProjectState = {
  files: [],
  selectedFile: null,
  selectedFunction: null,
  projectAnalysis: null,
  isAnalyzing: false,
  analysisError: null,
  explanation: '',
  refactoring: '',
  documentation: '',
  onboardingGuide: '',
  isGeneratingExplanation: false,
  isGeneratingRefactoring: false,
  isGeneratingDocumentation: false,
  isGeneratingOnboardingGuide: false,
  question: '',
  answer: '',
  isAskingQuestion: false,
  activeTab: 'dashboard',
  activeVisualization: 'project',
};

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'ADD_FILES':
      return {
        ...state,
        files: [...state.files, ...action.payload]
      };
    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter(file => file.name !== action.payload)
      };
    case 'CLEAR_FILES':
      return {
        ...state,
        files: [],
        projectAnalysis: null,
        explanation: '',
        refactoring: '',
        documentation: '',
        onboardingGuide: '',
        question: '',
        answer: '',
      };
    case 'SET_SELECTED_FILE':
      return {
        ...state,
        selectedFile: action.payload,
        // Reset selected function when changing file
        selectedFunction: null
      };
    case 'SET_SELECTED_FUNCTION':
      return {
        ...state,
        selectedFunction: action.payload
      };
    case 'SET_PROJECT_ANALYSIS':
      return {
        ...state,
        projectAnalysis: action.payload
      };
    case 'SET_IS_ANALYZING':
      return {
        ...state,
        isAnalyzing: action.payload
      };
    case 'SET_ANALYSIS_ERROR':
      return {
        ...state,
        analysisError: action.payload
      };
    case 'SET_EXPLANATION':
      return {
        ...state,
        explanation: action.payload
      };
    case 'SET_REFACTORING':
      return {
        ...state,
        refactoring: action.payload
      };
    case 'SET_DOCUMENTATION':
      return {
        ...state,
        documentation: action.payload
      };
    case 'SET_ONBOARDING_GUIDE':
      return {
        ...state,
        onboardingGuide: action.payload
      };
    case 'SET_IS_GENERATING_EXPLANATION':
      return {
        ...state,
        isGeneratingExplanation: action.payload
      };
    case 'SET_IS_GENERATING_REFACTORING':
      return {
        ...state,
        isGeneratingRefactoring: action.payload
      };
    case 'SET_IS_GENERATING_DOCUMENTATION':
      return {
        ...state,
        isGeneratingDocumentation: action.payload
      };
    case 'SET_IS_GENERATING_ONBOARDING_GUIDE':
      return {
        ...state,
        isGeneratingOnboardingGuide: action.payload
      };
    case 'SET_QUESTION':
      return {
        ...state,
        question: action.payload
      };
    case 'SET_ANSWER':
      return {
        ...state,
        answer: action.payload
      };
    case 'SET_IS_ASKING_QUESTION':
      return {
        ...state,
        isAskingQuestion: action.payload
      };
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.payload
      };
    case 'SET_ACTIVE_VISUALIZATION':
      return {
        ...state,
        activeVisualization: action.payload
      };
    default:
      return state;
  }
}

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

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  // Actions
  const addFiles = (files: FileWithContent[]) => {
    dispatch({ type: 'ADD_FILES', payload: files });
  };

  const removeFile = (fileName: string) => {
    dispatch({ type: 'REMOVE_FILE', payload: fileName });
  };

  const clearFiles = () => {
    dispatch({ type: 'CLEAR_FILES' });
  };

  const selectFile = (fileName: string | null) => {
    dispatch({ type: 'SET_SELECTED_FILE', payload: fileName });
  };

  const selectFunction = (functionName: string | null) => {
    dispatch({ type: 'SET_SELECTED_FUNCTION', payload: functionName });
  };

  const analyzeProject = async () => {
    if (state.files.length === 0) return;

    dispatch({ type: 'SET_IS_ANALYZING', payload: true });
    dispatch({ type: 'SET_ANALYSIS_ERROR', payload: null });

    try {
      const result = CodeAnalyzer.analyzeProject(state.files);
      dispatch({ type: 'SET_PROJECT_ANALYSIS', payload: result });
      
      // Auto-generate explanation for the entire project
      await generateExplanation();
    } catch (error) {
      console.error('Error analyzing project:', error);
      dispatch({ 
        type: 'SET_ANALYSIS_ERROR', 
        payload: error instanceof Error ? error.message : 'Unknown error analyzing project' 
      });
    } finally {
      dispatch({ type: 'SET_IS_ANALYZING', payload: false });
    }
  };

  const generateExplanation = async (fileName?: string) => {
    if (!state.projectAnalysis) return;

    dispatch({ type: 'SET_IS_GENERATING_EXPLANATION', payload: true });

    try {
      const explanation = await AIService.generateCodeExplanation(state.projectAnalysis, fileName);
      dispatch({ type: 'SET_EXPLANATION', payload: explanation });
    } catch (error) {
      console.error('Error generating explanation:', error);
    } finally {
      dispatch({ type: 'SET_IS_GENERATING_EXPLANATION', payload: false });
    }
  };

  const generateRefactoring = async (fileName?: string) => {
    if (!state.projectAnalysis) return;

    dispatch({ type: 'SET_IS_GENERATING_REFACTORING', payload: true });

    try {
      const refactoring = await AIService.generateRefactoringSuggestions(state.projectAnalysis, fileName);
      dispatch({ type: 'SET_REFACTORING', payload: refactoring });
    } catch (error) {
      console.error('Error generating refactoring suggestions:', error);
    } finally {
      dispatch({ type: 'SET_IS_GENERATING_REFACTORING', payload: false });
    }
  };

  const generateDocumentation = async (fileName?: string) => {
    if (!state.projectAnalysis) return;

    dispatch({ type: 'SET_IS_GENERATING_DOCUMENTATION', payload: true });

    try {
      const documentation = await AIService.suggestDocumentation(state.projectAnalysis, fileName);
      dispatch({ type: 'SET_DOCUMENTATION', payload: documentation });
    } catch (error) {
      console.error('Error generating documentation:', error);
    } finally {
      dispatch({ type: 'SET_IS_GENERATING_DOCUMENTATION', payload: false });
    }
  };

  const generateOnboardingGuide = async () => {
    if (!state.projectAnalysis) return;

    dispatch({ type: 'SET_IS_GENERATING_ONBOARDING_GUIDE', payload: true });

    try {
      const guide = await AIService.generateOnboardingGuide(state.projectAnalysis);
      dispatch({ type: 'SET_ONBOARDING_GUIDE', payload: guide });
    } catch (error) {
      console.error('Error generating onboarding guide:', error);
    } finally {
      dispatch({ type: 'SET_IS_GENERATING_ONBOARDING_GUIDE', payload: false });
    }
  };

  const askQuestion = async (questionText: string) => {
    if (!state.projectAnalysis) return;
    if (!questionText.trim()) return;

    dispatch({ type: 'SET_IS_ASKING_QUESTION', payload: true });

    try {
      const answer = await AIService.generateAnswer(
        state.projectAnalysis,
        questionText,
        state.selectedFile || undefined
      );
      dispatch({ type: 'SET_ANSWER', payload: answer });
    } catch (error) {
      console.error('Error getting answer:', error);
    } finally {
      dispatch({ type: 'SET_IS_ASKING_QUESTION', payload: false });
    }
  };

  const setQuestion = (question: string) => {
    dispatch({ type: 'SET_QUESTION', payload: question });
  };

  const setActiveTab = (tab: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  };

  const setActiveVisualization = (visualization: string) => {
    dispatch({ type: 'SET_ACTIVE_VISUALIZATION', payload: visualization });
  };

  // Auto-analyze when files change
  useEffect(() => {
    if (state.files.length > 0) {
      analyzeProject();
    }
  }, [state.files]);

  // Generate file-specific content when selectedFile changes
  useEffect(() => {
    if (state.projectAnalysis && state.selectedFile) {
      generateExplanation(state.selectedFile);
      generateRefactoring(state.selectedFile);
      generateDocumentation(state.selectedFile);
    }
  }, [state.selectedFile]);

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

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export default ProjectContext;
// Ensures file is treated as a module
export {};