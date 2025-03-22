import React, { useEffect, useRef } from 'react';

interface AnalysisResult {
  functions: Array<{
    name: string;
    complexity: number;
    params: string[];
    loc: any;
  }>;
  dependencies: Array<{
    caller: string;
    callee: string;
    loc: any;
  }>;
  variables: any[];
  imports: any[];
  metrics: any;
}

interface DependencyVisualizationProps {
  analysis: AnalysisResult;
}

// Simple dependency visualization component
const DependencyVisualization: React.FC<DependencyVisualizationProps> = ({ analysis }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!analysis || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const functions = analysis.functions;
    const dependencies = analysis.dependencies;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up scaling factors
    const maxFunctions = 15; // Maximum functions to display
    const displayFunctions = functions.slice(0, maxFunctions);
    const nodeRadius = 30;
    const horizontalSpacing = canvas.width / (displayFunctions.length + 1);
    
    // Map of function names to their positions
    const functionPositions: {[key: string]: {x: number, y: number}} = {};
    
    // Draw function nodes
    displayFunctions.forEach((func, index) => {
      const x = horizontalSpacing * (index + 1);
      const y = 100;
      
      // Store position for dependency drawing
      functionPositions[func.name] = { x, y };
      
      // Draw node
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
      
      // Color based on complexity
      const complexity = func.complexity || 1;
      const green = Math.max(0, 255 - (complexity * 20));
      ctx.fillStyle = `rgb(60, ${green}, 255)`;
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw function name
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Truncate long function names
      let displayName = func.name;
      if (displayName.length > 10) {
        displayName = displayName.substring(0, 8) + '...';
      }
      ctx.fillText(displayName, x, y);
    });
    
    // Draw dependencies as arrows
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    
    dependencies.forEach(dep => {
      const caller = functionPositions[dep.caller];
      const callee = functionPositions[dep.callee];
      
      // Only draw if both functions are visible
      if (caller && callee) {
        // Calculate direction vector
        const dx = callee.x - caller.x;
        const dy = callee.y - caller.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Skip if same function (self-call)
        if (length < 5) return;
        
        // Normalize
        const ndx = dx / length;
        const ndy = dy / length;
        
        // Calculate start and end points (shorten by radius)
        const startX = caller.x + ndx * nodeRadius;
        const startY = caller.y + ndy * nodeRadius;
        const endX = callee.x - ndx * nodeRadius;
        const endY = callee.y - ndy * nodeRadius;
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Draw arrow head
        const arrowSize = 8;
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
        ctx.fillStyle = '#666';
        ctx.fill();
      }
    });
    
    // Add legend
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Function Complexity:', 10, 10);
    
    // Legend gradient
    const gradientWidth = 150;
    const gradientHeight = 20;
    const x = 10;
    const y = 30;
    
    // Draw gradient background
    const gradient = ctx.createLinearGradient(x, y, x + gradientWidth, y);
    gradient.addColorStop(0, 'rgb(60, 255, 255)');
    gradient.addColorStop(0.5, 'rgb(60, 180, 255)');
    gradient.addColorStop(1, 'rgb(60, 60, 255)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, gradientWidth, gradientHeight);
    
    // Draw gradient border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, gradientWidth, gradientHeight);
    
    // Draw gradient labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Low', x + 20, y + gradientHeight + 5);
    ctx.fillText('Medium', x + gradientWidth/2, y + gradientHeight + 5);
    ctx.fillText('High', x + gradientWidth - 20, y + gradientHeight + 5);
    
  }, [analysis]);
  
  return (
    <div className="dependency-visualization">
      <h3>Function Dependency Graph</h3>
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={200} 
        style={{ border: '1px solid #ddd', borderRadius: '4px' }}
      />
      <p className="viz-note">Showing function complexity and dependencies</p>
    </div>
  );
};

export default DependencyVisualization;