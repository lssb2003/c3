import React from "react";
import { ProjectAnalysisResult, FileAnalysis } from "../services/CodeAnalyzer";
import "./Dashboard.css";

interface DashboardProps {
    project: ProjectAnalysisResult;
    onFileSelect?: (fileName: string) => void;
    onFunctionSelect?: (functionName: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
    project,
    onFileSelect,
    onFunctionSelect,
}) => {
    // Extract top functions by complexity
    const topComplexFunctions = [...project.functions]
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, 5);

    // Extract top files by complexity
    const topComplexFiles = [...project.files]
        .sort((a, b) => {
            const aComplexity = a.functions.reduce(
                (sum, fn) => sum + fn.complexity,
                0
            );
            const bComplexity = b.functions.reduce(
                (sum, fn) => sum + fn.complexity,
                0
            );
            return bComplexity - aComplexity;
        })
        .slice(0, 5);

    // Extract top files by dependencies
    const topDependedFiles = [...project.files]
        .sort((a, b) => {
            const aDeps = project.dependencies.filter(
                (dep) => dep.calleeFileName === a.fileName
            ).length;
            const bDeps = project.dependencies.filter(
                (dep) => dep.calleeFileName === b.fileName
            ).length;
            return bDeps - aDeps;
        })
        .slice(0, 5);

    // Calculate function distribution by complexity
    const complexityDistribution = {
        low: project.functions.filter((fn) => fn.complexity < 5).length,
        medium: project.functions.filter(
            (fn) => fn.complexity >= 5 && fn.complexity < 10
        ).length,
        high: project.functions.filter((fn) => fn.complexity >= 10).length,
    };

    // Calculate cross-file dependencies
    const crossFileDeps = project.dependencies.filter(
        (dep) => dep.isCrossFile
    ).length;

    // React components stats
    const componentStats = {
        total: project.components.length,
        withHooks: project.components.filter((comp) => comp.hooks.length > 0)
            .length,
        useState: project.components.filter((comp) =>
            comp.hooks.includes("useState")
        ).length,
        useEffect: project.components.filter((comp) =>
            comp.hooks.includes("useEffect")
        ).length,
    };

    const handleFileClick = (fileName: string | undefined) => {
        console.log(`Dashboard: File clicked: ${fileName}`);
        if (fileName && onFileSelect) {
            onFileSelect(fileName);
        }
    };

    const handleFunctionClick = (functionName: string) => {
        console.log(`Dashboard: Function clicked: ${functionName}`);
        if (onFunctionSelect) {
            onFunctionSelect(functionName);
        }
    };

    // Get a file name without the path
    const getShortFileName = (fileName: string) => {
        return fileName.split("/").pop() || fileName;
    };

    return (
        <div className="dashboard">
            <h2 className="dashboard-title">Project Dashboard</h2>

            <div className="dashboard-summary">
                <div className="summary-card">
                    <h3>Project Overview</h3>
                    <div className="summary-stat">
                        <span className="stat-label">Files:</span>
                        <span className="stat-value">
                            {project.projectMetrics.totalFiles}
                        </span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-label">Lines of Code:</span>
                        <span className="stat-value">
                            {project.projectMetrics.totalLinesOfCode.toLocaleString()}
                        </span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-label">Functions:</span>
                        <span className="stat-value">
                            {project.projectMetrics.totalFunctions}
                        </span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-label">Components:</span>
                        <span className="stat-value">
                            {project.projectMetrics.totalComponents}
                        </span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-label">Classes:</span>
                        <span className="stat-value">
                            {project.projectMetrics.totalClasses}
                        </span>
                    </div>
                </div>

                <div className="summary-card">
                    <h3>Complexity Metrics</h3>
                    <div className="summary-stat">
                        <span className="stat-label">Avg. Complexity:</span>
                        <span className="stat-value">
                            {project.projectMetrics.averageComplexity.toFixed(2)}
                        </span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-label">High Complexity Functions:</span>
                        <span className="stat-value">
                            {project.projectMetrics.highComplexityFunctions}
                        </span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-label">Most Complex File:</span>
                        <span
                            className="stat-value clickable"
                            onClick={() =>
                                handleFileClick(project.projectMetrics.mostComplexFile.fileName)
                            }
                            title={project.projectMetrics.mostComplexFile.fileName}
                        >
                            {getShortFileName(project.projectMetrics.mostComplexFile.fileName)}
                        </span>
                    </div>
                    <div className="complexity-distribution">
                        <div className="complexity-bar">
                            <div
                                className="complexity-bar-low"
                                style={{
                                    width: `${(complexityDistribution.low / Math.max(1, project.projectMetrics.totalFunctions)) * 100}%`,
                                }}
                                title={`${complexityDistribution.low} functions with low complexity`}
                            ></div>
                            <div
                                className="complexity-bar-medium"
                                style={{
                                    width: `${(complexityDistribution.medium / Math.max(1, project.projectMetrics.totalFunctions)) * 100}%`,
                                }}
                                title={`${complexityDistribution.medium} functions with medium complexity`}
                            ></div>
                            <div
                                className="complexity-bar-high"
                                style={{
                                    width: `${(complexityDistribution.high / Math.max(1, project.projectMetrics.totalFunctions)) * 100}%`,
                                }}
                                title={`${complexityDistribution.high} functions with high complexity`}
                            ></div>
                        </div>
                        <div className="complexity-labels">
                            <span>Low</span>
                            <span>Medium</span>
                            <span>High</span>
                        </div>
                    </div>
                </div>

                <div className="summary-card">
                    <h3>Dependencies</h3>
                    <div className="summary-stat">
                        <span className="stat-label">Total Dependencies:</span>
                        <span className="stat-value">
                            {project.projectMetrics.totalDependencies}
                        </span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-label">Cross-file Dependencies:</span>
                        <span className="stat-value">
                            {project.projectMetrics.crossFileDependencies}
                        </span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-label">Most Depended-on File:</span>
                        <span
                            className="stat-value clickable"
                            onClick={() =>
                                handleFileClick(
                                    project.projectMetrics.mostDependedOnFile.fileName
                                )
                            }
                            title={project.projectMetrics.mostDependedOnFile.fileName}
                        >
                            {getShortFileName(project.projectMetrics.mostDependedOnFile.fileName)}
                        </span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-label">Cross-file Ratio:</span>
                        <span className="stat-value">
                            {(
                                (project.projectMetrics.crossFileDependencies /
                                    Math.max(1, project.projectMetrics.totalDependencies)) *
                                100
                            ).toFixed(1)}
                            %
                        </span>
                    </div>
                </div>

                {componentStats.total > 0 && (
                    <div className="summary-card">
                        <h3>React Components</h3>
                        <div className="summary-stat">
                            <span className="stat-label">Total Components:</span>
                            <span className="stat-value">{componentStats.total}</span>
                        </div>
                        <div className="summary-stat">
                            <span className="stat-label">Components with Hooks:</span>
                            <span className="stat-value">{componentStats.withHooks}</span>
                        </div>
                        <div className="summary-stat">
                            <span className="stat-label">Using useState:</span>
                            <span className="stat-value">{componentStats.useState}</span>
                        </div>
                        <div className="summary-stat">
                            <span className="stat-label">Using useEffect:</span>
                            <span className="stat-value">{componentStats.useEffect}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="dashboard-details">
                <div className="detail-card">
                    <h3>Top Complex Functions</h3>
                    <table className="detail-table">
                        <thead>
                            <tr>
                                <th>Function</th>
                                <th>File</th>
                                <th>Complexity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topComplexFunctions.length > 0 ? (
                                topComplexFunctions.map((func, index) => (
                                    <tr key={index}>
                                        <td>
                                            <span 
                                                className="clickable"
                                                onClick={() => handleFunctionClick(func.name)}
                                                title={func.name}
                                            >
                                                {func.name.split(".").pop() || func.name}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className="clickable"
                                                onClick={() => handleFileClick(func.fileName)}
                                                title={func.fileName || "Unknown"}
                                            >
                                                {func.fileName
                                                    ? getShortFileName(func.fileName)
                                                    : "Unknown"}
                                            </span>
                                        </td>
                                        <td
                                            className={
                                                func.complexity < 5
                                                    ? "complexity-low"
                                                    : func.complexity < 10
                                                        ? "complexity-medium"
                                                        : "complexity-high"
                                            }
                                        >
                                            {func.complexity}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: "center" }}>
                                        No functions found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="detail-card">
                    <h3>Top Complex Files</h3>
                    <table className="detail-table">
                        <thead>
                            <tr>
                                <th>File</th>
                                <th>LOC</th>
                                <th>Functions</th>
                                <th>Avg. Complexity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topComplexFiles.length > 0 ? (
                                topComplexFiles.map((file, index) => (
                                    <tr key={index}>
                                        <td>
                                            <span
                                                className="clickable"
                                                onClick={() => handleFileClick(file.fileName)}
                                                title={file.fileName}
                                            >
                                                {getShortFileName(file.fileName)}
                                            </span>
                                        </td>
                                        <td>{file.fileMetrics.linesOfCode}</td>
                                        <td>{file.fileMetrics.totalFunctions}</td>
                                        <td
                                            className={
                                                file.fileMetrics.averageComplexity < 5
                                                    ? "complexity-low"
                                                    : file.fileMetrics.averageComplexity < 10
                                                        ? "complexity-medium"
                                                        : "complexity-high"
                                            }
                                        >
                                            {file.fileMetrics.averageComplexity.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: "center" }}>
                                        No complex files found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="detail-card">
                    <h3>Most Depended-on Files</h3>
                    <table className="detail-table">
                        <thead>
                            <tr>
                                <th>File</th>
                                <th>Incoming Deps</th>
                                <th>Outgoing Deps</th>
                                <th>LOC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topDependedFiles.length > 0 ? (
                                topDependedFiles.map((file, index) => {
                                    const incomingDeps = project.dependencies.filter(
                                        (dep) => dep.calleeFileName === file.fileName
                                    ).length;
                                    const outgoingDeps = project.dependencies.filter(
                                        (dep) => dep.callerFileName === file.fileName
                                    ).length;
                                    return (
                                        <tr key={index}>
                                            <td>
                                                <span
                                                    className="clickable"
                                                    onClick={() => handleFileClick(file.fileName)}
                                                    title={file.fileName}
                                                >
                                                    {getShortFileName(file.fileName)}
                                                </span>
                                            </td>
                                            <td>{incomingDeps}</td>
                                            <td>{outgoingDeps}</td>
                                            <td>{file.fileMetrics.linesOfCode}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: "center" }}>
                                        No dependency information found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="dashboard-alert-section">
                <h3>Potential Issues</h3>
                <div className="alerts-container">
                    {project.projectMetrics.highComplexityFunctions > 0 && (
                        <div className="alert alert-warning">
                            <h4>High Complexity</h4>
                            <p>
                                {project.projectMetrics.highComplexityFunctions} functions have
                                high cyclomatic complexity. Consider refactoring these functions
                                to improve maintainability.
                            </p>
                        </div>
                    )}

                    {project.files.some((file) => file.fileMetrics.linesOfCode > 500) && (
                        <div className="alert alert-warning">
                            <h4>Large Files</h4>
                            <p>
                                {
                                    project.files.filter(
                                        (file) => file.fileMetrics.linesOfCode > 500
                                    ).length
                                }{" "}
                                files have more than 500 lines of code. Consider breaking them
                                down into smaller, more focused modules.
                            </p>
                        </div>
                    )}

                    {project.projectMetrics.crossFileDependencies >
                        project.projectMetrics.totalFiles * 3 && (
                            <div className="alert alert-info">
                                <h4>High Coupling</h4>
                                <p>
                                    This project has a high number of cross-file dependencies, which
                                    might indicate tight coupling. Consider reviewing the
                                    architecture to improve modularity.
                                </p>
                            </div>
                        )}

                    {project.files.some(
                        (file) =>
                            file.functions.length > 0 &&
                            file.functions.filter((fn) => fn.complexity > 10).length /
                            file.functions.length >
                            0.3
                    ) && (
                            <div className="alert alert-warning">
                                <h4>Complexity Hotspots</h4>
                                <p>
                                    Some files have a high concentration of complex functions. These
                                    might be technical debt hotspots that need attention.
                                </p>
                            </div>
                        )}

                    {project.projectMetrics.totalFunctions === 0 && (
                        <div className="alert alert-warning">
                            <h4>No Functions Detected</h4>
                            <p>
                                No functions were detected in the analyzed files. This might indicate an issue with the file format or content, or the analyzer might need configuration to properly parse your code.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;