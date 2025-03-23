// src/components/CodeViewer.tsx - Enhanced version

import React, { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './CodeViewer.css';

export interface CodeRange {
    start: number;
    end: number;
    suggestion: string;
    id: string;
    severity?: 'low' | 'medium' | 'high'; // Added severity level for better highlighting
    category?: string; // Added category for better classification (e.g., "Algorithm", "Data Structure", "Performance")
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
    const [highlightOpacity, setHighlightOpacity] = useState(0.7); // Adjustable highlight opacity
    const [showOptimizationCategories, setShowOptimizationCategories] = useState(true);
    const [filteredCategory, setFilteredCategory] = useState<string | null>(null);
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
            // Skip if filtering by category and this range doesn't match
            if (filteredCategory && range.category !== filteredCategory) {
                return;
            }

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
    }, [code, optimizationRanges, filteredCategory]);

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

    // Get all unique optimization categories
    const getOptimizationCategories = (): string[] => {
        const categories = new Set<string>();
        optimizationRanges.forEach(range => {
            if (range.category) {
                categories.add(range.category);
            }
        });
        return Array.from(categories);
    };

    // Filter optimizations by category
    const handleCategoryFilter = (category: string | null) => {
        setFilteredCategory(category);
        // Reset active highlight when changing filter
        setActiveHighlight(null);
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
            
            // Get the highest severity for this line
            let severityClass = '';
            if (hasOptimization) {
                const highestSeverity = lineOptimizationsMap[lineNumber].reduce((highest, opt) => {
                    if (!opt.severity) return highest;
                    if (highest === 'high') return highest;
                    if (opt.severity === 'high') return 'high';
                    if (highest === 'medium' && opt.severity === 'low') return highest;
                    return opt.severity;
                }, 'low' as 'low' | 'medium' | 'high');
                
                severityClass = `severity-${highestSeverity}`;
            }

            // Get categories for this line
            const categories = new Set<string>();
            if (hasOptimization) {
                lineOptimizationsMap[lineNumber].forEach(opt => {
                    if (opt.category) categories.add(opt.category);
                });
            }

            return (
                <div
                    key={`line-${lineNumber}`}
                    className={`code-line ${hasOptimization ? 'has-optimization' : ''} ${isInActiveHighlight ? 'active-highlight' : ''} ${severityClass}`}
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
                    style={{ 
                        opacity: 1, // Full opacity for the line itself
                    }}
                >
                    <span className="line-number">{lineNumber + 1}</span>
                    <span className="line-content">
                        {line || ' '} {/* Show at least a space for empty lines */}
                        {hasOptimization && (
                            <span
                                className={`optimization-indicator ${severityClass}`}
                                title={`This line has ${lineOptimizationsMap[lineNumber].length} optimization suggestion${lineOptimizationsMap[lineNumber].length > 1 ? 's' : ''}`}
                            >
                                💡
                                {categories.size > 0 && showOptimizationCategories && (
                                    <span className="optimization-categories">
                                        {Array.from(categories).map(category => (
                                            <span 
                                                key={category} 
                                                className={`category-tag ${category.toLowerCase().replace(/\s+/g, '-')}`}
                                                title={`Category: ${category}`}
                                            >
                                                {category}
                                            </span>
                                        ))}
                                    </span>
                                )}
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
            codeSnippet += '```\n\n';
        }
        
        // Add category and severity information
        let metaInfo = '';
        if (range.category) {
            metaInfo += `Category: ${range.category}\n`;
        }
        if (range.severity) {
            metaInfo += `Priority: ${range.severity.charAt(0).toUpperCase() + range.severity.slice(1)}\n`;
        }
        if (metaInfo) {
            metaInfo += '\n';
        }
        
        return positionInfo + metaInfo + codeSnippet + suggestion;
    };

    // Go to the next or previous suggestion
    const navigateSuggestion = (direction: 'next' | 'prev') => {
        if (optimizationRanges.length === 0) return;

        // Filter optimizations if a category filter is applied
        const filteredRanges = filteredCategory 
            ? optimizationRanges.filter(range => range.category === filteredCategory)
            : optimizationRanges;

        if (filteredRanges.length === 0) return;

        const currentIndex = activeHighlight
            ? filteredRanges.findIndex(r => r.id === activeHighlight)
            : -1;

        if (direction === 'next') {
            const nextIndex = currentIndex < filteredRanges.length - 1 ? currentIndex + 1 : 0;
            setActiveHighlight(filteredRanges[nextIndex].id);
        } else {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredRanges.length - 1;
            setActiveHighlight(filteredRanges[prevIndex].id);
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
    
    // Get counts by category
    const getCategoryCounts = () => {
        const counts: Record<string, number> = {};
        optimizationRanges.forEach(range => {
            if (range.category) {
                counts[range.category] = (counts[range.category] || 0) + 1;
            } else {
                counts['Other'] = (counts['Other'] || 0) + 1;
            }
        });
        return counts;
    };
    
    // Get counts by severity
    const getSeverityCounts = () => {
        const counts = { high: 0, medium: 0, low: 0, undefined: 0 };
        optimizationRanges.forEach(range => {
            if (range.severity) {
                counts[range.severity]++;
            } else {
                counts.undefined++;
            }
        });
        return counts;
    };

    // Calculate optimization metrics
    const optimizationMetrics = {
        categories: getCategoryCounts(),
        severities: getSeverityCounts(),
        total: optimizationRanges.length,
        filteredCount: filteredCategory 
            ? optimizationRanges.filter(r => r.category === filteredCategory).length 
            : optimizationRanges.length
    };

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

            {/* Enhanced Optimization Summary Panel */}
            {optimizationRanges.length > 0 && (
                <div className="optimization-summary-panel">
                    <div className="optimization-metrics">
                        <div className="metrics-header">
                            <h4>Optimization Summary</h4>
                            <button 
                                className="toggle-categories-btn" 
                                onClick={() => setShowOptimizationCategories(prev => !prev)}
                                title={showOptimizationCategories ? "Hide categories in code" : "Show categories in code"}
                            >
                                {showOptimizationCategories ? "Hide Tags" : "Show Tags"}
                            </button>
                        </div>
                        
                        <div className="metrics-content">
                            <div className="severity-distribution">
                                <div className="severity-label">Priority:</div>
                                <div className="severity-bars">
                                    {optimizationMetrics.severities.high > 0 && (
                                        <div 
                                            className="severity-bar high" 
                                            style={{ 
                                                width: `${(optimizationMetrics.severities.high / optimizationMetrics.total) * 100}%` 
                                            }}
                                            title={`${optimizationMetrics.severities.high} high priority optimizations`}
                                        >
                                            {optimizationMetrics.severities.high}
                                        </div>
                                    )}
                                    {optimizationMetrics.severities.medium > 0 && (
                                        <div 
                                            className="severity-bar medium" 
                                            style={{ 
                                                width: `${(optimizationMetrics.severities.medium / optimizationMetrics.total) * 100}%` 
                                            }}
                                            title={`${optimizationMetrics.severities.medium} medium priority optimizations`}
                                        >
                                            {optimizationMetrics.severities.medium}
                                        </div>
                                    )}
                                    {optimizationMetrics.severities.low > 0 && (
                                        <div 
                                            className="severity-bar low" 
                                            style={{ 
                                                width: `${(optimizationMetrics.severities.low / optimizationMetrics.total) * 100}%` 
                                            }}
                                            title={`${optimizationMetrics.severities.low} low priority optimizations`}
                                        >
                                            {optimizationMetrics.severities.low}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="category-filters">
                                <div className="category-label">Filter by category:</div>
                                <div className="category-buttons">
                                    <button 
                                        className={`category-btn ${filteredCategory === null ? 'active' : ''}`}
                                        onClick={() => handleCategoryFilter(null)}
                                    >
                                        All ({optimizationMetrics.total})
                                    </button>
                                    {Object.entries(optimizationMetrics.categories).map(([category, count]) => (
                                        <button 
                                            key={category}
                                            className={`category-btn ${filteredCategory === category ? 'active' : ''} ${category.toLowerCase().replace(/\s+/g, '-')}`}
                                            onClick={() => handleCategoryFilter(category)}
                                        >
                                            {category} ({count})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAllSuggestions && optimizationRanges.length > 0 && (
                <div className="all-suggestions-panel">
                    <div className="all-suggestions-header">
                        <h4>All Optimization Suggestions {filteredCategory ? `(${filteredCategory})` : ''}</h4>
                        <button
                            className="close-all-suggestions-btn"
                            onClick={() => setShowAllSuggestions(false)}
                            aria-label="Close all suggestions"
                        >
                            ×
                        </button>
                    </div>
                    <div className="suggestions-list">
                        {optimizationRanges
                            .filter(range => !filteredCategory || range.category === filteredCategory)
                            .map((range, index) => {
                                const { startLine, endLine } = getLineNumbersForRange(range.start, range.end);
                                return (
                                    <div
                                        key={range.id}
                                        className={`suggestion-item ${activeHighlight === range.id ? 'active' : ''} ${range.severity ? `severity-${range.severity}` : ''}`}
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
                                            {range.category && (
                                                <span className={`suggestion-category ${range.category.toLowerCase().replace(/\s+/g, '-')}`}>
                                                    {range.category}
                                                </span>
                                            )}
                                            {range.severity && (
                                                <span className={`suggestion-severity ${range.severity}`}>
                                                    {range.severity.charAt(0).toUpperCase() + range.severity.slice(1)}
                                                </span>
                                            )}
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
                                            {optimizationMetrics.filteredCount}
                                        </>
                                    ) : (
                                        `${optimizationMetrics.filteredCount} suggestions`
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
                        </>
                    )}
                </div>

                {activeSuggestion && (
                    <div className="suggestion-panel">
                        <div className="suggestion-header">
                            <div className="suggestion-header-content">
                                <h4>Optimization Suggestion</h4>
                                <div className="suggestion-location">{getActiveHighlightLineRange()}</div>
                                {activeSuggestion.category && (
                                    <div className={`suggestion-category ${activeSuggestion.category.toLowerCase().replace(/\s+/g, '-')}`}>
                                        {activeSuggestion.category}
                                    </div>
                                )}
                                {activeSuggestion.severity && (
                                    <div className={`suggestion-severity ${activeSuggestion.severity}`}>
                                        {activeSuggestion.severity.charAt(0).toUpperCase() + activeSuggestion.severity.slice(1)} Priority
                                    </div>
                                )}
                            </div>
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