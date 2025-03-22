import React from "react";
import "./App.css";
import {
  ProjectProvider,
  useProject,
  FileWithContent,
} from "./context/ProjectContext";
import FileUploader from "./components/FileUploader";
import Dashboard from "./components/Dashboard";
import ProjectVisualization from "./components/ProjectVisualization";
import DependencyWheel from "./components/DependencyWheel";
import ComplexityTreemap from "./components/ComplexityTreemap";
import ReactMarkdown from "react-markdown";
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";

const AppContent: React.FC = () => {
  const {
    state,
    addFiles,
    selectFile,
    selectFunction,
    askQuestion,
    setQuestion,
    setActiveTab,
    setActiveVisualization,
    clearFiles,
    generateOnboardingGuide,
  } = useProject();

  const handleFilesUploaded = (files: FileWithContent[]) => {
    addFiles(files);
  };

  const handleFileSelect = (fileName: string) => {
    selectFile(fileName);
    // Switch to explanation tab
    setActiveTab("explanation");
  };

  const handleFunctionSelect = (functionName: string) => {
    selectFunction(functionName);
    // Switch to explanation tab
    setActiveTab("explanation");
  };

  const handleAskQuestion = () => {
    askQuestion(state.question);
  };

  const handleGenerateOnboardingGuide = () => {
    generateOnboardingGuide();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    // If switching to onboarding tab and no guide yet, generate it
    if (
      tab === "onboarding" &&
      !state.onboardingGuide &&
      state.projectAnalysis
    ) {
      generateOnboardingGuide();
    }
  };

  const handleVisualizationChange = (visualization: string) => {
    setActiveVisualization(visualization);
  };

  const handleClearFiles = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all files? This will reset the analysis."
      )
    ) {
      clearFiles();
    }
  };

  React.useEffect(() => {
    Prism.highlightAll();
  }, [
    state.activeTab,
    state.explanation,
    state.refactoring,
    state.documentation,
    state.onboardingGuide,
    state.answer,
  ]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>C3: Context-Aware Code Companion</h1>
        <p>
          Upload your code files to get insights, explanations, visualizations,
          and refactoring suggestions
        </p>
      </header>

      <main className="app-main">
        <section className="file-upload-section">
          <h2>Upload Your Code Files</h2>
          <FileUploader onFilesUploaded={handleFilesUploaded} />

          {state.files.length > 0 && (
            <button className="clear-files-button" onClick={handleClearFiles}>
              Clear All Files
            </button>
          )}

          {state.isAnalyzing && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Analyzing your code...</p>
            </div>
          )}

          {state.analysisError && (
            <div className="error-message">
              <p>Error analyzing your code: {state.analysisError}</p>
            </div>
          )}
        </section>

        {state.projectAnalysis && (
          <section className="results-section">
            <div className="tabs">
              <button
                className={`tab ${state.activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => handleTabChange("dashboard")}
              >
                Dashboard
              </button>
              <button
                className={`tab ${state.activeTab === "explanation" ? "active" : ""}`}
                onClick={() => handleTabChange("explanation")}
              >
                Explanation
              </button>
              <button
                className={`tab ${state.activeTab === "refactoring" ? "active" : ""}`}
                onClick={() => handleTabChange("refactoring")}
              >
                Refactoring
              </button>
              <button
                className={`tab ${state.activeTab === "documentation" ? "active" : ""}`}
                onClick={() => handleTabChange("documentation")}
              >
                Documentation
              </button>
              <button
                className={`tab ${state.activeTab === "visualization" ? "active" : ""}`}
                onClick={() => handleTabChange("visualization")}
              >
                Visualization
              </button>
              <button
                className={`tab ${state.activeTab === "chat" ? "active" : ""}`}
                onClick={() => handleTabChange("chat")}
              >
                Ask Questions
              </button>
              <button
                className={`tab ${state.activeTab === "onboarding" ? "active" : ""}`}
                onClick={() => handleTabChange("onboarding")}
              >
                Onboarding Guide
              </button>
            </div>

            <div className="tab-content">
              {state.activeTab === "dashboard" && (
                <div className="dashboard-tab">
                  <Dashboard
                    project={state.projectAnalysis}
                    onFileSelect={handleFileSelect}
                    onFunctionSelect={handleFunctionSelect}
                  />
                </div>
              )}

              {state.activeTab === "explanation" && (
                <div className="explanation-tab">
                  <div className="tab-header">
                    <h2>
                      {state.selectedFile
                        ? `Explanation: ${state.selectedFile}`
                        : state.selectedFunction
                          ? `Explanation: ${state.selectedFunction}`
                          : "Code Explanation"}
                    </h2>
                    {!state.selectedFile && !state.selectedFunction && (
                      <p className="hint-text">
                        Select a file or function from the dashboard to see
                        specific explanations
                      </p>
                    )}
                  </div>

                  {state.isGeneratingExplanation ? (
                    <div className="loading-indicator">
                      <div className="spinner"></div>
                      <p>Generating explanation...</p>
                    </div>
                  ) : (
                    <div className="explanation-content markdown-content">
                      <ReactMarkdown>{state.explanation}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {state.activeTab === "refactoring" && (
                <div className="refactoring-tab">
                  <div className="tab-header">
                    <h2>
                      {state.selectedFile
                        ? `Refactoring Suggestions: ${state.selectedFile}`
                        : "Refactoring Suggestions"}
                    </h2>
                    {!state.selectedFile && (
                      <p className="hint-text">
                        Select a file from the dashboard to see specific
                        refactoring suggestions
                      </p>
                    )}
                  </div>

                  {state.isGeneratingRefactoring ? (
                    <div className="loading-indicator">
                      <div className="spinner"></div>
                      <p>Generating refactoring suggestions...</p>
                    </div>
                  ) : (
                    <div className="refactoring-content markdown-content">
                      <ReactMarkdown>{state.refactoring}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {state.activeTab === "documentation" && (
                <div className="documentation-tab">
                  <div className="tab-header">
                    <h2>
                      {state.selectedFile
                        ? `Documentation: ${state.selectedFile}`
                        : "Project Documentation"}
                    </h2>
                    {!state.selectedFile && (
                      <p className="hint-text">
                        This is the documentation for the entire project. Select
                        a file from the dashboard to see file-specific
                        documentation.
                      </p>
                    )}
                  </div>

                  {state.isGeneratingDocumentation ? (
                    <div className="loading-indicator">
                      <div className="spinner"></div>
                      <p>Generating documentation...</p>
                    </div>
                  ) : (
                    <div className="documentation-content markdown-content">
                      <ReactMarkdown>{state.documentation}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {state.activeTab === "visualization" && (
                <div className="visualization-tab">
                  <div className="visualization-tab-container">
                    <div className="visualization-tabs">
                      <button
                        className={`visualization-tab ${
                          state.activeVisualization === "project"
                            ? "active"
                            : ""
                        }`}
                        onClick={() => handleVisualizationChange("project")}
                      >
                        Project Map
                      </button>
                      <button
                        className={`visualization-tab ${
                          state.activeVisualization === "dependencies"
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          handleVisualizationChange("dependencies")
                        }
                      >
                        Dependency Wheel
                      </button>
                      <button
                        className={`visualization-tab ${
                          state.activeVisualization === "complexity"
                            ? "active"
                            : ""
                        }`}
                        onClick={() => handleVisualizationChange("complexity")}
                      >
                        Complexity Treemap
                      </button>
                    </div>

                    <div className="visualization-content">
                      {state.activeVisualization === "project" && (
                        <ProjectVisualization
                          project={state.projectAnalysis}
                          onNodeSelect={handleFileSelect}
                        />
                      )}

                      {state.activeVisualization === "dependencies" && (
                        <DependencyWheel
                          functions={state.projectAnalysis.functions}
                          dependencies={state.projectAnalysis.dependencies}
                          onFunctionSelect={handleFunctionSelect}
                        />
                      )}

                      {state.activeVisualization === "complexity" && (
                        <ComplexityTreemap
                          project={state.projectAnalysis}
                          onFileSelect={handleFileSelect}
                          onFunctionSelect={(functionName, fileName) => {
                            selectFunction(functionName);
                            selectFile(fileName);
                            setActiveTab("explanation");
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {state.activeTab === "chat" && (
                <div className="chat-tab">
                  <h2>Ask About Your Code</h2>
                  <div className="chat-container">
                    {state.answer && (
                      <div className="answer-container">
                        <h3>Answer:</h3>
                        <div className="answer markdown-content">
                          <ReactMarkdown>{state.answer}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    <div className="file-context">
                      {state.selectedFile ? (
                        <p>
                          Asking about file:{" "}
                          <strong>{state.selectedFile}</strong>{" "}
                          <button
                            className="clear-context-button"
                            onClick={() => selectFile(null)}
                          >
                            Clear Selection
                          </button>
                        </p>
                      ) : (
                        <p>Asking about the entire project</p>
                      )}
                    </div>

                    <div className="question-input-container">
                      <input
                        type="text"
                        className="question-input"
                        value={state.question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask a question about your code..."
                        disabled={
                          !state.projectAnalysis || state.isAskingQuestion
                        }
                      />
                      <button
                        className="ask-button"
                        onClick={handleAskQuestion}
                        disabled={
                          !state.question.trim() ||
                          !state.projectAnalysis ||
                          state.isAskingQuestion
                        }
                      >
                        {state.isAskingQuestion ? "Thinking..." : "Ask"}
                      </button>
                    </div>

                    {state.isAskingQuestion && (
                      <div className="loading-indicator">
                        <div className="spinner"></div>
                        <p>Processing your question...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {state.activeTab === "onboarding" && (
                <div className="onboarding-tab">
                  <div className="tab-header">
                    <h2>Onboarding Guide</h2>
                    <p className="hint-text">
                      This guide will help new developers understand and onboard
                      to this codebase
                    </p>
                  </div>

                  {!state.onboardingGuide &&
                    !state.isGeneratingOnboardingGuide && (
                      <div className="empty-content">
                        <p>No onboarding guide generated yet.</p>
                        <button
                          className="generate-button"
                          onClick={handleGenerateOnboardingGuide}
                        >
                          Generate Onboarding Guide
                        </button>
                      </div>
                    )}

                  {state.isGeneratingOnboardingGuide ? (
                    <div className="loading-indicator">
                      <div className="spinner"></div>
                      <p>Generating onboarding guide...</p>
                    </div>
                  ) : (
                    <div className="onboarding-content markdown-content">
                      <ReactMarkdown>{state.onboardingGuide}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>C3: Context-Aware Code Companion &copy; 2023</p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
};

export default App;
