import React, { useEffect, useRef } from 'react';
import './Visualizations.css';
import { Function, Dependency } from '../services/CodeAnalyzer';

interface DependencyWheelProps {
  functions: Function[];
  dependencies: Dependency[];
  onFunctionSelect?: (functionName: string) => void;
}

const DependencyWheel: React.FC<DependencyWheelProps> = ({ 
  functions, 
  dependencies,
  onFunctionSelect
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!functions || !dependencies || !canvasRef.current) return;
    
    drawDependencyWheel();
  }, [functions, dependencies]);

  const drawDependencyWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up dimensions
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) * 0.45;
    
    // Set up function mapping
    // Limiting to the top 30 functions by complexity for better visualization
    const topFunctions = [...functions]
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 30);
    
    // Calculate function positions around the wheel
    const functionPositions: {[key: string]: {x: number, y: number}} = {};
    const functionAngles: {[key: string]: number} = {};
    const arcAngle = (2 * Math.PI) / topFunctions.length;
    
    topFunctions.forEach((func, index) => {
      const angle = index * arcAngle;
      
      functionAngles[func.name] = angle;
      functionPositions[func.name] = {
        x: centerX + Math.cos(angle) * outerRadius,
        y: centerY + Math.sin(angle) * outerRadius
      };
    });
    
    // Draw the outer wheel
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw dependencies as curves
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;
    
    // Filter dependencies to only those between the visible functions
    const visibleDependencies = dependencies.filter(dep => 
      functionPositions[dep.caller] && functionPositions[dep.callee]
    );
    
    // Sort dependencies to draw the most complex functions' dependencies last (on top)
    const sortedDependencies = [...visibleDependencies].sort((a, b) => {
      const aFunc = functions.find(f => f.name === a.caller);
      const bFunc = functions.find(f => f.name === b.caller);
      return (aFunc?.complexity || 0) - (bFunc?.complexity || 0);
    });
    
    sortedDependencies.forEach(dep => {
      const sourcePos = functionPositions[dep.caller];
      const targetPos = functionPositions[dep.callee];
      
      if (sourcePos && targetPos) {
        // Skip self-dependencies
        if (dep.caller === dep.callee) return;
        
        // Calculate control points for a nice curve
        const sourceAngle = functionAngles[dep.caller];
        const targetAngle = functionAngles[dep.callee];
        
        // Find the shortest arc direction
        let clockwise = (targetAngle - sourceAngle + 2 * Math.PI) % (2 * Math.PI) < Math.PI;
        
        // Calculate control points
        const cp1x = centerX + Math.cos(sourceAngle) * (outerRadius * 0.5);
        const cp1y = centerY + Math.sin(sourceAngle) * (outerRadius * 0.5);
        
        const cp2x = centerX + Math.cos(targetAngle) * (outerRadius * 0.5);
        const cp2y = centerY + Math.sin(targetAngle) * (outerRadius * 0.5);
        
        // Draw the curve
        ctx.beginPath();
        ctx.moveTo(sourcePos.x, sourcePos.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, targetPos.x, targetPos.y);
        
        // Get color based on caller function complexity
        const callerFunc = functions.find(f => f.name === dep.caller);
        const complexity = callerFunc ? callerFunc.complexity : 5;
        const alpha = 0.1 + (complexity / 20);
        
        // Set color and stroke
        ctx.strokeStyle = `rgba(50, 50, 255, ${alpha})`;
        ctx.lineWidth = 1 + (complexity / 10);
        ctx.stroke();
      }
    });
    
    // Draw function nodes
    topFunctions.forEach(func => {
      const pos = functionPositions[func.name];
      if (!pos) return;
      
      const nodeRadius = 5 + (func.complexity / 2);
      
      // Draw node
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI);
      
      // Color based on complexity
      const green = Math.max(0, 180 - (func.complexity * 12));
      ctx.fillStyle = `rgb(60, ${green}, 255)`;
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Calculate label position
      const labelAngle = functionAngles[func.name];
      const labelRadius = outerRadius + 20;
      const labelX = centerX + Math.cos(labelAngle) * labelRadius;
      const labelY = centerY + Math.sin(labelAngle) * labelRadius;
      
      // Rotate label based on position
      ctx.save();
      ctx.translate(labelX, labelY);
      
      // Align text based on position in the circle
      if (labelAngle > Math.PI / 2 && labelAngle < Math.PI * 3/2) {
        ctx.rotate(labelAngle + Math.PI);
        ctx.textAlign = 'right';
      } else {
        ctx.rotate(labelAngle);
        ctx.textAlign = 'left';
      }
      
      // Draw function name
      ctx.fillStyle = '#333';
      ctx.font = '10px Arial';
      ctx.textBaseline = 'middle';
      
      // Get short name for display
      let displayName = func.name;
      const lastDotIndex = displayName.lastIndexOf('.');
      if (lastDotIndex > 0) {
        displayName = displayName.substring(lastDotIndex + 1);
      }
      
      // Truncate if too long
      if (displayName.length > 12) {
        displayName = displayName.substring(0, 10) + '...';
      }
      
      ctx.fillText(displayName, 0, 0);
      
      ctx.restore();
    });
    
    // Add legend
    drawLegend(ctx, 10, 10);
  };

  const drawLegend = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Function Complexity:', x, y);
    
    // Legend gradient
    const gradientWidth = 120;
    const gradientHeight = 15;
    const gradientX = x;
    const gradientY = y + 20;
    
    // Draw gradient background
    const gradient = ctx.createLinearGradient(gradientX, gradientY, gradientX + gradientWidth, gradientY);
    gradient.addColorStop(0, 'rgb(60, 180, 255)');
    gradient.addColorStop(0.5, 'rgb(60, 120, 255)');
    gradient.addColorStop(1, 'rgb(60, 60, 255)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(gradientX, gradientY, gradientWidth, gradientHeight);
    
    // Draw gradient border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(gradientX, gradientY, gradientWidth, gradientHeight);
    
    // Draw gradient labels
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Low', gradientX + 20, gradientY + gradientHeight + 5);
    ctx.fillText('Medium', gradientX + gradientWidth/2, gradientY + gradientHeight + 5);
    ctx.fillText('High', gradientX + gradientWidth - 20, gradientY + gradientHeight + 5);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onFunctionSelect) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Get the top functions displayed
    const topFunctions = [...functions]
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 30);
    
    // Calculate positions and check if clicked
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const outerRadius = Math.min(canvas.width, canvas.height) * 0.45;
    const arcAngle = (2 * Math.PI) / topFunctions.length;
    
    let clickedFunction = null;
    
    topFunctions.forEach((func, index) => {
      const angle = index * arcAngle;
      const x = centerX + Math.cos(angle) * outerRadius;
      const y = centerY + Math.sin(angle) * outerRadius;
      const nodeRadius = 5 + (func.complexity / 2);
      
      // Check if click is within this node
      const distance = Math.sqrt(Math.pow(clickX - x, 2) + Math.pow(clickY - y, 2));
      if (distance <= nodeRadius) {
        clickedFunction = func.name;
      }
    });
    
    if (clickedFunction) {
      onFunctionSelect(clickedFunction);
    }
  };

  return (
    <div className="dependency-wheel">
      <canvas 
        ref={canvasRef}
        width={600}
        height={600}
        onClick={handleCanvasClick}
        className="wheel-canvas"
      />
      <div className="visualization-info">
        <h4>Function Dependency Wheel</h4>
        <p>Showing top {Math.min(functions.length, 30)} functions by complexity</p>
        <p>Lines connect functions that call each other, with thicker lines indicating higher complexity</p>
        <p>Click on a function to view more details</p>
      </div>
    </div>
  );
};

export default DependencyWheel;
// Ensures file is treated as a module
export {};