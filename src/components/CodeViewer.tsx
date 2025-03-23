// Enhanced version of src/components/CodeViewer.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './CodeViewer.css';

export interface CodeRange {
    start: number;
    end: number;
    suggestion: string;
    id: string;
}

interface CodeViewerProps {
    code: string;
    fileName: string;
    language: string;
    optimizationRanges?: CodeRange[];
    isLoading?: boolean;
}

const CodeViewer: React.FC<CodeViewerProps> = ({
    code,
    fileName,
    language,
    optimizationRanges = [],
    isLoading = false,
}) => {
    const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
    const [showAllSuggestions, setShowAllSuggestions] = useState(false);
    const highlightedCodeRef = useRef<HTMLDivElement>(null);
    const codeLines = code.split('\n');
    
    // Create a mapping of line numbers to the optimizations that affect them
    const [lineOptimizationsMap, setLineOptimizationsMap] = useState<Record<number, CodeRange[]>>({});

    // Auto-highlight the first optimization when they're loaded
    useEffect(() => {
        if (optimizationRanges.length > 0 && !activeHighlight) {
            setActiveHighlight(optimizationRanges[0].id);
        }
    }, [optimizationRanges, activeHighlight]);

    // Build line optimizations map whenever code or optimizations change
    useEffect(() => {
        if (!code || optimizationRanges.length === 0) return;
        
        const newLineOptimizationsMap: Record<number, CodeRange[]> = {};
        
        // Process each optimization range
        optimizationRanges.forEach((range) => {
            const { startLine, endLine } = getLineNumbersForRange(range.start, range.end);
            
            // Add this optimization to each affected line
            for (let line = startLine; line <= endLine; line++) {
                if (!newLineOptimizationsMap[line]) {
                    newLineOptimizationsMap[line] = [];
                }
                newLineOptimizationsMap[line].push(range);
            }
        });
        
        setLineOptimizationsMap(newLineOptimizationsMap);
    }, [code, optimizationRanges]);

    // Convert character positions to line numbers
    const getLineNumbersForRange = (start: number, end: number): { startLine: number, endLine: number } => {
        if (!code) return { startLine: 0, endLine: 0 };
        
        // Initialize counters
        let charCount = 0;
        let startLine = 0;
        let endLine = 0;
        
        // Find the start line
        for (let i = 0; i < codeLines.length; i++) {
            const lineLength = codeLines[i].length + 1; // +1 for newline character
            
            if (charCount + lineLength > start && startLine === 0) {
                startLine = i;
            }
            
            if (charCount + lineLength > end && endLine === 0) {
                endLine = i;
                break;
            }
            
            charCount += lineLength;
        }
        
        // Handle edge cases
        if (endLine === 0) endLine = codeLines.length - 1;
        
        return { startLine, endLine };
    };

    // Helper to convert a position to line and column
    const positionToLineColumn = (position: number): { line: number, column: number } => {
        let currentPos = 0;
        
        for (let i = 0; i < codeLines.length; i++) {
            const lineLength = codeLines[i].length + 1; // +1 for newline character
            
            if (currentPos + lineLength > position) {
                return {
                    line: i,
                    column: position - currentPos
                };
            }
            
            currentPos += lineLength;
        }
        
        // If position is beyond the end of the file, return the last line
        return {
            line: codeLines.length - 1,
            column: codeLines[codeLines.length - 1].length
        };
    };
    
    // Helper to convert line and column to position
    const lineColumnToPosition = (line: number, column: number): number => {
        let position = 0;
        
        // Add lengths of all lines before the target line
        for (let i = 0; i < line; i++) {
            position += (codeLines[i]?.length || 0) + 1; // +1 for newline
        }
        
        // Add column offset
        position += Math.min(column, codeLines[line]?.length || 0);
        
        return position;
    };

    // Generate highlighted code with optimized line tracking
    const highlightedCode = () => {
        if (!code || optimizationRanges.length === 0) {
            return (
                <SyntaxHighlighter
                    language={language.toLowerCase()}
                    style={vscDarkPlus}
                    showLineNumbers={true}
                    wrapLines={true}
                    wrapLongLines={false}
                    customStyle={{ fontSize: '14px', height: '100%', backgroundColor: '#1e1e1e' }}
                    codeTagProps={{ style: { display: 'block' } }}
                >
                    {code}
                </SyntaxHighlighter>
            );
        }

        // Create line elements with appropriate highlighting
        const lineElements: JSX.Element[] = codeLines.map((line, index) => {
            const lineNumber = index;
            const hasOptimization = lineOptimizationsMap[lineNumber] && lineOptimizationsMap[lineNumber].length > 0;
            
            // Check if this line is in the active highlight
            const isInActiveHighlight = hasOptimization &&
                lineOptimizationsMap[lineNumber].some(opt => opt.id === activeHighlight);
            
            return (
                <div
                    key={`line-${lineNumber}`}
                    className={`code-line ${hasOptimization ? 'has-optimization' : ''} ${isInActiveHighlight ? 'active-highlight' : ''}`}
                    onClick={() => {
                        if (hasOptimization) {
                            // If multiple optimizations on this line, cycle through them
                            if (lineOptimizationsMap[lineNumber].length > 1) {
                                const currentIndex = lineOptimizationsMap[lineNumber].findIndex(opt => opt.id === activeHighlight);
                                const nextIndex = (currentIndex + 1) % lineOptimizationsMap[lineNumber].length;
                                setActiveHighlight(lineOptimizationsMap[lineNumber][nextIndex].id);
                            } else {
                                // Toggle active state if only one optimization
                                setActiveHighlight(
                                    activeHighlight === lineOptimizationsMap[lineNumber][0].id ? null : lineOptimizationsMap[lineNumber][0].id
                                );
                            }
                        }
                    }}
                >
                    <span className="line-number">{lineNumber + 1}</span>
                    <span className="line-content">
                        {line || ' '} {/* Show at least a space for empty lines */}
                        {hasOptimization && (
                            <span
                                className="optimization-indicator"
                                title={`This line has ${lineOptimizationsMap[lineNumber].length} optimization suggestion${lineOptimizationsMap[lineNumber].length > 1 ? 's' : ''}`}
                            >
                                💡
                            </span>
                        )}
                    </span>
                </div>
            );
        });

        return (
            <div className="highlighted-code" ref={highlightedCodeRef}>
                <div className="code-editor-lines">
                    {lineElements}
                </div>
            </div>
        );
    };

    // Find the active suggestion
    const activeSuggestion = activeHighlight
        ? optimizationRanges.find(range => range.id === activeHighlight)
        : null;

    // Get the line range for the active suggestion
    const getActiveHighlightLineRange = (): string => {
        if (!activeSuggestion) return '';

        const { startLine, endLine } = getLineNumbersForRange(activeSuggestion.start, activeSuggestion.end);
        // Add 1 to line numbers for display (since arrays are 0-indexed but we show lines starting at 1)
        return startLine === endLine ? `Line ${startLine + 1}` : `Lines ${startLine + 1}-${endLine + 1}`;
    };

    // Format the suggestion with detailed position information
    const formatSuggestion = (suggestion: string, range: CodeRange): string => {
        const { line: startLine, column: startColumn } = positionToLineColumn(range.start);
        const { line: endLine, column: endColumn } = positionToLineColumn(range.end);
        
        // Add position information to the beginning of the suggestion
        const positionInfo = `Position: Lines ${startLine + 1}-${endLine + 1}\n\n`;
        
        // Add code snippet if available
        let codeSnippet = '';
        if (endLine - startLine < 10) { // Only include snippet if it's reasonably sized
            codeSnippet = 'Code:\n```\n';
            for (let i = startLine; i <= endLine; i++) {
                codeSnippet += codeLines[i] + '\n';
            }
            codeSnippet += '```\n\nSuggestion:\n';
        }
        
        return positionInfo + codeSnippet + suggestion;
    };

    // Go to the next or previous suggestion
    const navigateSuggestion = (direction: 'next' | 'prev') => {
        if (optimizationRanges.length === 0) return;

        const currentIndex = activeHighlight
            ? optimizationRanges.findIndex(r => r.id === activeHighlight)
            : -1;

        if (direction === 'next') {
            const nextIndex = currentIndex < optimizationRanges.length - 1 ? currentIndex + 1 : 0;
            setActiveHighlight(optimizationRanges[nextIndex].id);
        } else {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : optimizationRanges.length - 1;
            setActiveHighlight(optimizationRanges[prevIndex].id);
        }
    };

    // Ensure active highlight is in view
    useEffect(() => {
        if (activeHighlight && highlightedCodeRef.current) {
            const activeRange = optimizationRanges.find(r => r.id === activeHighlight);
            if (activeRange) {
                const { startLine } = getLineNumbersForRange(activeRange.start, activeRange.end);
                // Note: Line elements are 0-indexed in the DOM just like our array,
                // so we use startLine directly (not startLine+1)
                const lineElement = highlightedCodeRef.current.querySelector(`.code-line:nth-child(${startLine + 1})`);
                if (lineElement) {
                    lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }, [activeHighlight, optimizationRanges, code]);
    
    // Debug function to validate optimizations
    const validateOptimizationRanges = () => {
        if (!optimizationRanges || optimizationRanges.length === 0) return;
        
        console.log("Validating optimization ranges...");
        
        optimizationRanges.forEach((range, index) => {
            const { startLine, endLine } = getLineNumbersForRange(range.start, range.end);
            const { line: calculatedStartLine, column: startColumn } = positionToLineColumn(range.start);
            const { line: calculatedEndLine, column: endColumn } = positionToLineColumn(range.end);
            
            // Log discrepancies for debugging
            if (startLine !== calculatedStartLine || endLine !== calculatedEndLine) {
                console.warn(`Range ${index} (${range.id}) has inconsistent line numbers:`, {
                    characterRange: { start: range.start, end: range.end },
                    calculatedLines: { start: calculatedStartLine + 1, end: calculatedEndLine + 1 },
                    calculatedPositions: { 
                        start: { line: calculatedStartLine + 1, column: startColumn }, 
                        end: { line: calculatedEndLine + 1, column: endColumn }
                    }
                });
            }
            
            // Validate range is within file bounds
            if (range.start < 0 || range.end > code.length) {
                console.error(`Range ${index} (${range.id}) is out of bounds:`, {
                    fileLength: code.length,
                    range: { start: range.start, end: range.end }
                });
            }
        });
    };
    
    // Validate optimization ranges when they change
    useEffect(() => {
        if (optimizationRanges.length > 0) {
            validateOptimizationRanges();
        }
    }, [optimizationRanges]);

    return (
        <div className="code-viewer">
            <div className="code-viewer-header">
                <h3>
                    <span className="file-icon">📄</span>
                    {fileName}
                </h3>
                <div className="code-viewer-info">
                    <span className="language-badge">{language}</span>
                    {optimizationRanges.length > 0 && (
                        <span
                            className="suggestions-badge"
                            onClick={() => setShowAllSuggestions(prev => !prev)}
                            title="Click to view all suggestions"
                        >
                            {optimizationRanges.length} optimization {optimizationRanges.length === 1 ? 'suggestion' : 'suggestions'}
                        </span>
                    )}
                </div>
            </div>

            {showAllSuggestions && optimizationRanges.length > 0 && (
                <div className="all-suggestions-panel">
                    <div className="all-suggestions-header">
                        <h4>All Optimization Suggestions</h4>
                        <button
                            className="close-all-suggestions-btn"
                            onClick={() => setShowAllSuggestions(false)}
                            aria-label="Close all suggestions"
                        >
                            ×
                        </button>
                    </div>
                    <div className="suggestions-list">
                        {optimizationRanges.map((range, index) => {
                            const { startLine, endLine } = getLineNumbersForRange(range.start, range.end);
                            return (
                                <div
                                    key={range.id}
                                    className={`suggestion-item ${activeHighlight === range.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveHighlight(range.id);
                                        setShowAllSuggestions(false);
                                    }}
                                >
                                    <div className="suggestion-item-header">
                                        <span className="suggestion-number">#{index + 1}</span>
                                        <span className="suggestion-location">
                                            Lines {startLine + 1}-{endLine + 1}
                                        </span>
                                    </div>
                                    <div className="suggestion-item-preview">
                                        {range.suggestion.substring(0, 100)}
                                        {range.suggestion.length > 100 ? '...' : ''}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="code-viewer-container">
                <div className="code-panel">
                    {isLoading ? (
                        <div className="loading-indicator">
                            <div className="spinner"></div>
                            <p>Analyzing code for optimizations...</p>
                        </div>
                    ) : (
                        highlightedCode()
                    )}

                    {!isLoading && optimizationRanges.length > 0 && (
                        <>
                            <div className="optimization-controls">
                                <button
                                    className="nav-suggestion-btn prev"
                                    onClick={() => navigateSuggestion('prev')}
                                    title="Previous suggestion"
                                >
                                    ↑
                                </button>
                                <div className="suggestion-counter">
                                    {activeHighlight ? (
                                        <>
                                            {optimizationRanges.findIndex(r => r.id === activeHighlight) + 1}
                                            <span className="counter-divider">/</span>
                                            {optimizationRanges.length}
                                        </>
                                    ) : (
                                        `${optimizationRanges.length} suggestions`
                                    )}
                                </div>
                                <button
                                    className="nav-suggestion-btn next"
                                    onClick={() => navigateSuggestion('next')}
                                    title="Next suggestion"
                                >
                                    ↓
                                </button>
                            </div>
                            
                            {/* Debug option to validate ranges (only in development) */}
                            {process.env.NODE_ENV === 'development' && (
                                <div className="debug-optimization-controls">
                                    <button
                                        className="debug-button"
                                        onClick={validateOptimizationRanges}
                                        title="Validate optimization ranges"
                                    >
                                        Validate Ranges
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {activeSuggestion && (
                    <div className="suggestion-panel">
                        <div className="suggestion-header">
                            <h4>Optimization Suggestion</h4>
                            <div className="suggestion-location">{getActiveHighlightLineRange()}</div>
                            <button
                                className="close-suggestion-btn"
                                onClick={() => setActiveHighlight(null)}
                                aria-label="Close suggestion"
                            >
                                ×
                            </button>
                        </div>
                        <div className="suggestion-content">
                            {formatSuggestion(activeSuggestion.suggestion, activeSuggestion)}
                        </div>
                        <div className="suggestion-actions">
                            <button
                                className="nav-suggestion-btn"
                                onClick={() => navigateSuggestion('prev')}
                            >
                                Previous
                            </button>
                            <button
                                className="next-suggestion-btn"
                                onClick={() => navigateSuggestion('next')}
                            >
                                Next Suggestion
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodeViewer;