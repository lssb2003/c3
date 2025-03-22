import React, { useEffect, useRef, useState } from 'react';
import './Visualizations.css';
import { ProjectAnalysisResult, Function, Dependency } from '../services/CodeAnalyzer';

interface ProjectVisualizationProps {
    project: ProjectAnalysisResult;
    onNodeSelect?: (fileName: string) => void;
}

const ProjectVisualization: React.FC<ProjectVisualizationProps> = ({ project, onNodeSelect }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [hoveredFile, setHoveredFile] = useState<string | null>(null);

    // Canvas interaction state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [zoom, setZoom] = useState(1);

    // Store node positions for interaction
    const [nodePositions, setNodePositions] = useState<{ [key: string]: { x: number, y: number, radius: number } }>({});

    useEffect(() => {
        if (!project || !canvasRef.current) return;

        drawProjectGraph();
    }, [project, selectedFile, hoveredFile, offsetX, offsetY, zoom]);

    const drawProjectGraph = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply transformations
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(zoom, zoom);

        // Get unique files
        const files = Array.from(new Set(project.files.map(file => file.fileName)));

        // Calculate force-directed layout
        const positions = calculateFilePositions(files, project.dependencies);

        // Store positions for interaction
        const newNodePositions: { [key: string]: { x: number, y: number, radius: number } } = {};

        // Draw connections between files (dependencies)
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;

        project.dependencies
            .filter(dep => dep.isCrossFile) // Only show cross-file dependencies
            .forEach(dep => {
                if (dep.callerFileName && dep.calleeFileName) {
                    const sourcePos = positions[dep.callerFileName];
                    const targetPos = positions[dep.calleeFileName];

                    if (sourcePos && targetPos) {
                        // Draw dependency arrows
                        drawArrow(
                            ctx,
                            sourcePos.x,
                            sourcePos.y,
                            targetPos.x,
                            targetPos.y,
                            sourcePos.radius,
                            targetPos.radius
                        );
                    }
                }
            });

        // Draw file nodes
        files.forEach(fileName => {
            const pos = positions[fileName];
            if (!pos) return;

            const isSelected = selectedFile === fileName;
            const isHovered = hoveredFile === fileName;

            // Calculate node metrics for color
            const functions = project.functions.filter(fn => fn.fileName === fileName);
            const complexity = functions.reduce((sum, fn) => sum + fn.complexity, 0) / (functions.length || 1);
            const dependenciesCount = project.dependencies.filter(
                dep => dep.callerFileName === fileName || dep.calleeFileName === fileName
            ).length;

            // Draw node
            drawFileNode(ctx, pos.x, pos.y, pos.radius, fileName, complexity, dependenciesCount, isSelected, isHovered);

            // Store position for interaction
            newNodePositions[fileName] = {
                x: pos.x,
                y: pos.y,
                radius: pos.radius
            };
        });

        // Update node positions for interaction
        setNodePositions(newNodePositions);

        ctx.restore();
    };

    const calculateFilePositions = (
        files: string[],
        dependencies: Dependency[]
    ): { [key: string]: { x: number, y: number, radius: number } } => {
        const canvas = canvasRef.current;
        if (!canvas) return {};

        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;

        // Force-directed layout would be ideal but simplified for this implementation
        // Using a radial layout for now

        const radius = Math.min(width, height) * 0.4 / zoom;
        const positions: { [key: string]: { x: number, y: number, radius: number } } = {};

        // First pass: position in a circle
        files.forEach((fileName, index) => {
            const angle = (index / files.length) * 2 * Math.PI;

            // Get file-specific metrics to determine node size
            const file = project.files.find(f => f.fileName === fileName);
            const fileSize = file ? Math.log(file.fileMetrics.linesOfCode + 1) * 3 + 15 : 20;

            positions[fileName] = {
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                radius: fileSize
            };
        });

        return positions;
    };

    const drawFileNode = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        radius: number,
        fileName: string,
        complexity: number,
        dependencies: number,
        isSelected: boolean,
        isHovered: boolean
    ) => {
        // Draw node
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);

        // Color based on complexity
        const maxComplexity = 10;
        const normalizedComplexity = Math.min(complexity, maxComplexity) / maxComplexity;

        const r = Math.floor(60 + normalizedComplexity * 195);
        const g = Math.floor(150 - normalizedComplexity * 90);
        const b = Math.floor(255 - normalizedComplexity * 150);

        // Fill with highlight for selected/hovered nodes
        if (isSelected) {
            ctx.fillStyle = `rgb(255, 215, 0, 0.8)`;
        } else if (isHovered) {
            ctx.fillStyle = `rgb(${r}, ${g}, ${b}, 0.8)`;
        } else {
            ctx.fillStyle = `rgb(${r}, ${g}, ${b}, 0.6)`;
        }
        ctx.fill();

        // Draw border
        ctx.strokeStyle = isSelected ? '#FF8C00' : (isHovered ? '#666' : '#777');
        ctx.lineWidth = isSelected ? 3 : (isHovered ? 2 : 1);
        ctx.stroke();

        // Draw file name
        ctx.fillStyle = 'black';
        ctx.font = `${Math.max(10, Math.min(14, radius / 3))}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Get just the filename without path for display
        const displayName = fileName.split('/').pop() || fileName;

        // Truncate if too long
        let truncatedName = displayName;
        if (truncatedName.length > 15) {
            truncatedName = truncatedName.substring(0, 12) + '...';
        }

        ctx.fillText(truncatedName, x, y);
    };

    const drawArrow = (
        ctx: CanvasRenderingContext2D,
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        fromRadius: number,
        toRadius: number
    ) => {
        // Calculate direction vector
        const dx = toX - fromX;
        const dy = toY - fromY;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Skip if same node or too close
        if (length < 5) return;

        // Normalize
        const ndx = dx / length;
        const ndy = dy / length;

        // Calculate start and end points (shorten by radius)
        const startX = fromX + ndx * fromRadius;
        const startY = fromY + ndy * fromRadius;
        const endX = toX - ndx * toRadius;
        const endY = toY - ndy * toRadius;

        // Draw line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw arrow head
        const arrowSize = 6;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle - Math.PI / 6),
            endY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle + Math.PI / 6),
            endY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = '#999';
        ctx.fill();
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left);
        const y = (e.clientY - rect.top);

        // Check if we're clicking on a node
        const clickedFile = findNodeAtPosition(x, y);

        if (clickedFile) {
            // Select the node
            setSelectedFile(clickedFile);

            // Call the callback with the selected file
            if (onNodeSelect) {
                onNodeSelect(clickedFile);
            }
        } else {
            // Start dragging the canvas
            setIsDragging(true);
            setDragStart({ x, y });
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left);
        const y = (e.clientY - rect.top);

        if (isDragging) {
            // Update canvas offset
            setOffsetX(offsetX + (x - dragStart.x));
            setOffsetY(offsetY + (y - dragStart.y));
            setDragStart({ x, y });
        } else {
            // Highlight node under cursor
            const fileUnderCursor = findNodeAtPosition(x, y);
            setHoveredFile(fileUnderCursor);
        }
    };

    const handleCanvasMouseUp = () => {
        setIsDragging(false);
    };

    const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();

        // Calculate new zoom level
        const zoomDelta = -e.deltaY * 0.001;
        const newZoom = Math.max(0.1, Math.min(5, zoom + zoomDelta));

        // Update zoom
        setZoom(newZoom);
    };

    const findNodeAtPosition = (x: number, y: number): string | null => {
        // Check if position is inside any node
        for (const [fileName, position] of Object.entries(nodePositions)) {
            const nodeX = position.x * zoom + offsetX;
            const nodeY = position.y * zoom + offsetY;
            const radius = position.radius * zoom;

            const distance = Math.sqrt(
                Math.pow(x - nodeX, 2) +
                Math.pow(y - nodeY, 2)
            );

            if (distance <= radius) {
                return fileName;
            }
        }

        return null;
    };

    const handleReset = () => {
        setOffsetX(0);
        setOffsetY(0);
        setZoom(1);
        setSelectedFile(null);
    };

    return (
        <div className="project-visualization">
            <div className="visualization-controls">
                <button className="control-button" onClick={handleReset}>
                    Reset View
                </button>
                <span className="zoom-level">Zoom: {Math.round(zoom * 100)}%</span>
            </div>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onWheel={handleCanvasWheel}
                className="graph-canvas"
            />
            <div className="visualization-info">
                <h4>Project Structure Visualization</h4>
                <p>Showing {project.projectMetrics.totalFiles} files and {project.projectMetrics.crossFileDependencies} cross-file dependencies</p>
                <p>Larger nodes indicate more lines of code, while darker colors indicate higher complexity</p>
                {selectedFile && (
                    <div className="selected-file-info">
                        <h4>Selected File: {selectedFile}</h4>
                        {project.files.find(file => file.fileName === selectedFile) && (
                            <ul>
                                <li>Functions: {project.files.find(file => file.fileName === selectedFile)?.fileMetrics.totalFunctions}</li>
                                <li>Components: {project.files.find(file => file.fileName === selectedFile)?.fileMetrics.totalComponents}</li>
                                <li>Lines of Code: {project.files.find(file => file.fileName === selectedFile)?.fileMetrics.linesOfCode}</li>
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectVisualization;
// Ensures file is treated as a module
export { };