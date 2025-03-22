import React, { useEffect, useRef } from "react";
import "./Visualizations.css";
import { ProjectAnalysisResult, FileAnalysis } from "../services/CodeAnalyzer";

interface ComplexityTreemapProps {
    project: ProjectAnalysisResult;
    onFileSelect?: (fileName: string) => void;
    onFunctionSelect?: (functionName: string, fileName: string) => void;
}

// Helper type for treemap
interface TreemapItem {
    name: string;
    size: number;
    complexity: number;
    parent?: string;
    children?: TreemapItem[];
}

const ComplexityTreemap: React.FC<ComplexityTreemapProps> = ({
    project,
    onFileSelect,
    onFunctionSelect,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const treemapDataRef = useRef<TreemapItem[]>([]);
    const treemapLayoutRef = useRef<{
        [key: string]: { x: number; y: number; width: number; height: number };
    }>({});

    useEffect(() => {
        if (!project || !canvasRef.current) return;

        // Prepare data
        const treemapData = prepareTreemapData(project);
        treemapDataRef.current = treemapData;

        // Draw treemap
        drawTreemap();
    }, [project]);

    const prepareTreemapData = (
        project: ProjectAnalysisResult
    ): TreemapItem[] => {
        // Create a hierarchical structure for the treemap
        const root: TreemapItem = {
            name: "root",
            size: 0,
            complexity: 0,
            children: [],
        };

        // Group functions by file
        const fileGroups: { [key: string]: TreemapItem } = {};

        project.files.forEach((file) => {
            const fileFunctions = project.functions.filter(
                (fn) => fn.fileName === file.fileName
            );

            // Skip files with no functions
            if (fileFunctions.length === 0) return;

            const fileItem: TreemapItem = {
                name: file.fileName,
                size: file.fileMetrics.linesOfCode,
                complexity:
                    fileFunctions.reduce((sum, fn) => sum + fn.complexity, 0) /
                    fileFunctions.length,
                children: [],
            };

            // Add functions as children
            fileFunctions.forEach((fn) => {
                fileItem.children!.push({
                    name: fn.name,
                    size: fn.complexity * 30, // Scale size by complexity
                    complexity: fn.complexity,
                    parent: file.fileName,
                });
            });

            fileGroups[file.fileName] = fileItem;
        });

        // Add file groups to root
        root.children = Object.values(fileGroups);

        return [root];
    };

    const drawTreemap = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Skip if no data
        if (treemapDataRef.current.length === 0) return;

        // Get root node
        const root = treemapDataRef.current[0];

        // If no children, nothing to draw
        if (!root.children || root.children.length === 0) return;

        // Calculate treemap layout
        const layout = computeTreemapLayout(
            root,
            0,
            0,
            canvas.width,
            canvas.height
        );
        treemapLayoutRef.current = layout;

        // Draw rectangles for each item
        Object.entries(layout).forEach(([itemName, rect]) => {
            // Skip root
            if (itemName === "root") return;

            // Find the item data
            const item = findItemByName(root, itemName);
            if (!item) return;

            // Determine if this is a file or function
            const isFile = item.children !== undefined;

            // Draw rectangle
            drawTreemapItem(
                ctx,
                rect.x,
                rect.y,
                rect.width,
                rect.height,
                item,
                isFile
            );
        });
    };

    const computeTreemapLayout = (
        node: TreemapItem,
        x: number,
        y: number,
        width: number,
        height: number
    ): {
        [key: string]: { x: number; y: number; width: number; height: number };
    } => {
        const layout: {
            [key: string]: { x: number; y: number; width: number; height: number };
        } = {};

        // Add this node to layout
        layout[node.name] = { x, y, width, height };

        // If no children, return just this node
        if (!node.children || node.children.length === 0) {
            return layout;
        }

        // Compute size ratios
        const totalSize = node.children.reduce((sum, child) => sum + child.size, 0);

        // Choose layout direction (horizontal or vertical)
        // For simplicity, we'll alternate based on depth
        const isHorizontal = width > height;

        let currentPosition = isHorizontal ? x : y;
        const availableSpace = isHorizontal ? width : height;

        // Layout each child
        node.children.forEach((child) => {
            // Calculate child size proportional to its value
            const childSize = (child.size / totalSize) * availableSpace;

            let childX, childY, childWidth, childHeight;

            if (isHorizontal) {
                childX = currentPosition;
                childY = y;
                childWidth = childSize;
                childHeight = height;
                currentPosition += childSize;
            } else {
                childX = x;
                childY = currentPosition;
                childWidth = width;
                childHeight = childSize;
                currentPosition += childSize;
            }

            // Compute layout for this child
            const childLayout = computeTreemapLayout(
                child,
                childX,
                childY,
                childWidth,
                childHeight
            );

            // Merge layouts
            Object.assign(layout, childLayout);
        });

        return layout;
    };

    const drawTreemapItem = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        item: TreemapItem,
        isFile: boolean
    ) => {
        // Skip very small rectangles
        if (width < 1 || height < 1) return;

        // Set colors based on complexity and type
        const maxComplexity = 15;
        const normalizedComplexity =
            Math.min(item.complexity, maxComplexity) / maxComplexity;

        let fillColor;
        if (isFile) {
            // Files in blue
            const r = Math.floor(50 + normalizedComplexity * 50);
            const g = Math.floor(100 + normalizedComplexity * 50);
            const b = Math.floor(180 + normalizedComplexity * 75);
            fillColor = `rgb(${r}, ${g}, ${b})`;
        } else {
            // Functions in green to red gradient
            const r = Math.floor(100 + normalizedComplexity * 155);
            const g = Math.floor(180 - normalizedComplexity * 100);
            const b = Math.floor(100);
            fillColor = `rgb(${r}, ${g}, ${b})`;
        }

        // Draw rectangle
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, width, height);

        // Draw border
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = isFile ? 2 : 1;
        ctx.strokeRect(x, y, width, height);

        // Only add text if rectangle is big enough
        if (width > 50 && height > 15) {
            // Draw label
            ctx.fillStyle = "#fff";
            ctx.font = isFile ? "bold 12px Arial" : "10px Arial";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";

            // Get display name
            let displayName = item.name;

            if (isFile) {
                // For files, show only the basename
                displayName = displayName.split("/").pop() || displayName;
            } else {
                // For functions, show only the function name without class/namespace
                const parts = displayName.split(".");
                displayName = parts[parts.length - 1];
            }

            // Truncate if too long for the space
            const maxWidth = width - 10;
            let truncated = false;

            while (
                ctx.measureText(displayName + (truncated ? "..." : "")).width >
                maxWidth &&
                displayName.length > 3
            ) {
                displayName = displayName.substring(0, displayName.length - 1);
                truncated = true;
            }

            if (truncated) {
                displayName += "...";
            }

            // Draw text with padding
            ctx.fillText(displayName, x + 5, y + 5);

            // Add complexity indicator
            if (width > 80 && height > 25) {
                ctx.font = "9px Arial";
                ctx.fillText(
                    `Complexity: ${item.complexity.toFixed(1)}`,
                    x + 5,
                    y + 20
                );
            }
        }
    };

    const findItemByName = (
        root: TreemapItem,
        name: string
    ): TreemapItem | null => {
        if (root.name === name) {
            return root;
        }

        if (root.children) {
            for (const child of root.children) {
                const found = findItemByName(child, name);
                if (found) {
                    return found;
                }
            }
        }

        return null;
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Find which item was clicked
        let clickedItem = null;
        let clickedItemName = null;

        for (const [itemName, layout] of Object.entries(treemapLayoutRef.current)) {
            if (
                clickX >= layout.x &&
                clickX <= layout.x + layout.width &&
                clickY >= layout.y &&
                clickY <= layout.y + layout.height
            ) {
                // For overlapping rectangles, choose the smallest (most specific)
                if (
                    !clickedItem ||
                    layout.width * layout.height <
                    treemapLayoutRef.current[clickedItemName!].width *
                    treemapLayoutRef.current[clickedItemName!].height
                ) {
                    clickedItem = findItemByName(treemapDataRef.current[0], itemName);
                    clickedItemName = itemName;
                }
            }
        }

        if (clickedItem) {
            // Determine if it's a file or function
            const isFile = clickedItem.children !== undefined;

            if (isFile && onFileSelect) {
                onFileSelect(clickedItem.name);
            } else if (!isFile && onFunctionSelect && clickedItem.parent) {
                onFunctionSelect(clickedItem.name, clickedItem.parent);
            }
        }
    };

    return (
        <div className="complexity-treemap">
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onClick={handleCanvasClick}
                className="treemap-canvas"
            />
            <div className="visualization-info">
                <h4>Code Complexity Treemap</h4>
                <p>Showing complexity distribution across files and functions</p>
                <p>
                    Blue rectangles represent files, colored rectangles represent
                    functions
                </p>
                <p>
                    Size indicates lines of code, color indicates complexity (darker =
                    more complex)
                </p>
                <p>Click on a rectangle to select a file or function</p>
            </div>
        </div>
    );
};

export default ComplexityTreemap;
// Ensures file is treated as a module
export { };
