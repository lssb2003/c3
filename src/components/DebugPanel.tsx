import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';

interface DebugPanelProps {
    visible?: boolean;
}

/**
 * Debug panel component that displays the current state of the application
 * Only visible in development mode or when visible prop is true
 */
const DebugPanel: React.FC<DebugPanelProps> = ({ visible = false }) => {
    const { state } = useProject();
    const [isExpanded, setIsExpanded] = useState(false);

    // Only show in development mode or when explicitly visible
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && !visible) return null;

    // Create a sanitized version of the state for display
    const debugState = {
        filesCount: state.files.length,
        filesInfo: state.files.map(f => ({
            name: f.name,
            size: f.size,
            contentLength: f.content.length,
            language: f.language
        })),
        selectedFile: state.selectedFile,
        selectedFunction: state.selectedFunction,
        isAnalyzing: state.isAnalyzing,
        analysisError: state.analysisError,
        hasAnalysisResults: !!state.projectAnalysis,
        activeTab: state.activeTab,
        activeVisualization: state.activeVisualization,
    };

    return (
        <div className="debug-panel">
            <h3 onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
                Debug Information {isExpanded ? '▼' : '▶'}
            </h3>

            {isExpanded && (
                <div className="debug-info">
                    <p><strong>Current State:</strong></p>
                    <pre>{JSON.stringify(debugState, null, 2)}</pre>

                    <div style={{ marginTop: '10px' }}>
                        <button
                            onClick={() => console.log('Full state:', state)}
                            style={{ marginRight: '10px' }}
                        >
                            Log Full State
                        </button>

                        <button
                            onClick={() => {
                                if (state.projectAnalysis) {
                                    console.log('Analysis result:', state.projectAnalysis);
                                } else {
                                    console.log('No analysis result available');
                                }
                            }}
                        >
                            Log Analysis Result
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebugPanel;