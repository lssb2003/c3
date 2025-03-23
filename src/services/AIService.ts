// src/services/AIService.ts
import axios from 'axios';
import { ProjectAnalysisResult, FileAnalysis, AnalysisResult } from './CodeAnalyzer';
import { FileWithContent } from '../context/ProjectContext';
import { CodeRange } from '../components/CodeViewer';

interface Message {
    role: string;
    content: string;
}

// Define mock responses for when API key is not available
const MOCK_RESPONSES = {
    explanation: '## Code Explanation\n\nThis code implements the C3 (Context-Aware Code Companion) application, which is a powerful tool for analyzing, understanding, and refactoring code...',
    refactoring: '## Refactoring Suggestions\n\nAfter analyzing the codebase, I\'ve identified several opportunities for improvement...',
    documentation: '# C3: Context-Aware Code Companion Documentation\n\n## Overview\n\nC3 is an AI-powered code analysis tool designed to help developers understand, navigate, and improve codebases...',
    onboardingGuide: '# C3: Context-Aware Code Companion Onboarding Guide\n\n## Welcome to the C3 Project!\n\nThis guide will help you understand the C3 application, its architecture, and how to get started developing with it...',
    answer: 'Based on the code analysis, the C3 application uses a combination of React hooks for state management and external services for code analysis and AI-powered insights...',
    codeOptimization: '```json\n[\n  {\n    "start": 120,\n    "end": 250,\n    "suggestion": "This function could be optimized by using memoization to cache expensive calculations. Consider using React.useMemo() or a custom memoization helper."\n  },\n  {\n    "start": 400,\n    "end": 550,\n    "suggestion": "This loop has O(n²) complexity. Consider refactoring to use a more efficient algorithm or data structure to improve performance."\n  }\n]\n```'
};

class AIService {
    private apiKey: string;
    private baseURL: string;
    private useMock: boolean;
    private model: string;
    private fileContents: Map<string, string>;

    constructor() {
        console.log('🔍 AIService constructor called');

        // Get the API key from environment
        this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
        console.log(`🔑 API Key presence: ${this.apiKey ? 'Key exists (length: ' + this.apiKey.length + ')' : 'No key found'}`);

        this.baseURL = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-3.5-turbo'; // Using the most advanced model available

        // Initialize file contents map
        this.fileContents = new Map<string, string>();

        // Force mock mode if no API key (or for development)
        this.useMock = !this.apiKey || this.apiKey.trim() === '';

        // Log the mode we're running in (for debugging)
        console.log(`🤖 AIService initialized in ${this.useMock ? 'MOCK' : 'API'} mode with model: ${this.model}`);

        // Check environment variables accessibility
        console.log('🌍 Available environment variables:', Object.keys(process.env)
            .filter(key => key.startsWith('REACT_APP_'))
            .join(', '));
    }

    // Load file contents for later use
    public loadFiles(files: FileWithContent[]): void {
        console.log(`Loading ${files.length} files into AIService...`);

        this.fileContents.clear(); // Clear existing contents

        files.forEach(file => {
            this.fileContents.set(file.name, file.content);
            console.log(`Loaded file: ${file.name} (${file.content.length} chars)`);
        });

        console.log(`Loaded ${this.fileContents.size} files into AIService`);
    }

    // Original interface method
    async explainCode(code: string, analysis: AnalysisResult): Promise<string> {
        console.log("🔍 explainCode called");
        try {
            // Create a project-style analysis from the single file analysis
            const projectAnalysis = this.convertToProjectAnalysis(code, analysis);

            // Generate the explanation
            return await this.generateCodeExplanation(projectAnalysis);
        } catch (error) {
            console.error('❌ Error explaining code:', error);
            return 'Error generating explanation. Check console for details.';
        }
    }

    // Original interface method
    async suggestRefactoring(code: string, analysis: AnalysisResult): Promise<string> {
        console.log("🔍 suggestRefactoring called");
        try {
            // Create a project-style analysis from the single file analysis
            const projectAnalysis = this.convertToProjectAnalysis(code, analysis);

            // Generate the refactoring suggestions
            return await this.generateRefactoringSuggestions(projectAnalysis);
        } catch (error) {
            console.error('❌ Error suggesting refactoring:', error);
            return 'Error generating refactoring suggestions. Check console for details.';
        }
    }

    // Original interface method
    async answerQuestion(code: string, analysis: AnalysisResult, question: string): Promise<string> {
        console.log(`🔍 answerQuestion called with question: "${question}"`);
        try {
            // Create a project-style analysis from the single file analysis
            const projectAnalysis = this.convertToProjectAnalysis(code, analysis);

            // Generate the answer
            return await this.generateAnswer(projectAnalysis, question);
        } catch (error) {
            console.error('❌ Error answering question:', error);
            return 'Error answering question. Check console for details.';
        }
    }

    // Enhanced methods for multi-file projects
    async generateCodeExplanation(project: ProjectAnalysisResult, activeFileName?: string): Promise<string> {
        console.log(`🔍 generateCodeExplanation called for: ${activeFileName || "entire project"}`);
        try {
            let prompt = '';

            if (activeFileName) {
                // Generate explanation for the active file
                const activeFile = project.files.find(file => file.fileName === activeFileName);
                if (activeFile) {
                    prompt = this.generateFileExplanationPrompt(activeFile, project);
                    console.log(`📝 Generated explanation prompt for file: ${activeFileName}`);
                } else {
                    console.warn(`⚠️ File not found for explanation: ${activeFileName}`);
                    // Fallback to project explanation
                    prompt = this.generateProjectExplanationPrompt(project);
                    console.log("📝 Generated fallback project explanation prompt");
                }
            } else {
                // Generate a project overview
                prompt = this.generateProjectExplanationPrompt(project);
                console.log("📝 Generated project explanation prompt");
            }

            console.log(`🚀 Making request for explanation with prompt length: ${prompt.length} chars`);
            const response = await this.makeRequest([
                { role: 'system', content: 'You are C3, a context-aware code assistant. Explain the provided code in detail, focusing on business logic, architecture, dependencies, and key functionality. Use markdown formatting for structure and clarity. Include diagrams and descriptions using markdown when appropriate.' },
                { role: 'user', content: prompt }
            ]);

            console.log("✅ Received explanation response");
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('❌ Error explaining code:', error);
            return 'Error generating explanation. Please check console for details.';
        }
    }

    async generateRefactoringSuggestions(project: ProjectAnalysisResult, activeFileName?: string): Promise<string> {
        console.log(`generateRefactoringSuggestions called for: ${activeFileName || "entire project"}`);
        try {
            let prompt = '';

            if (activeFileName) {
                // Generate refactoring suggestions for the active file
                const activeFile = project.files.find(file => file.fileName === activeFileName);
                if (activeFile) {
                    prompt = this.generateFileRefactoringPrompt(activeFile, project);
                    console.log(`Generated refactoring prompt for file: ${activeFileName}`);
                } else {
                    console.warn(`File not found for refactoring: ${activeFileName}`);
                    // Fallback to project refactoring
                    prompt = this.generateProjectRefactoringPrompt(project);
                    console.log("Generated fallback project refactoring prompt");
                }
            } else {
                // Generate project-wide refactoring suggestions
                prompt = this.generateProjectRefactoringPrompt(project);
                console.log("Generated project refactoring prompt");
            }

            console.log(`Making request for refactoring with prompt length: ${prompt.length} chars`);
            const response = await this.makeRequest([
                { role: 'system', content: 'You are C3, a context-aware code assistant. You identify code smells, anti-patterns, and suggest specific, actionable refactoring steps with examples. Your refactoring suggestions should be concrete and detailed enough to implement. Focus on the most impactful improvements first. Use markdown for formatting and structure.' },
                { role: 'user', content: prompt }
            ]);

            console.log("Received refactoring response");
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error suggesting refactoring:', error);
            return 'Error generating refactoring suggestions. Please check console for details.';
        }
    }

    async generateAnswer(project: ProjectAnalysisResult, question: string, activeFileName?: string): Promise<string> {
        console.log(`generateAnswer called with question: "${question}" for: ${activeFileName || "entire project"}`);
        try {
            let prompt = '';

            if (activeFileName) {
                // Answer question about the active file
                const activeFile = project.files.find(file => file.fileName === activeFileName);
                if (activeFile) {
                    prompt = this.generateQuestionPromptForFile(activeFile, project, question);
                    console.log(`Generated question prompt for file: ${activeFileName}`);
                } else {
                    console.warn(`File not found for question: ${activeFileName}`);
                    // Fallback to project question
                    prompt = this.generateQuestionPromptForProject(project, question);
                    console.log("Generated fallback project question prompt");
                }
            } else {
                // Answer question about the whole project
                prompt = this.generateQuestionPromptForProject(project, question);
                console.log("Generated project question prompt");
            }

            console.log(`Making request for answer with prompt length: ${prompt.length} chars`);
            const response = await this.makeRequest([
                { role: 'system', content: 'You are C3, a context-aware code assistant. Answer questions about the provided code with specific, accurate information. Use code snippets, examples, and explanations to provide comprehensive answers. Use markdown for formatting and structure.' },
                { role: 'user', content: prompt }
            ]);

            console.log("Received answer response");
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error answering question:', error);
            return 'Error answering question. Please check console for details.';
        }
    }

    async generateOnboardingGuide(project: ProjectAnalysisResult): Promise<string> {
        console.log("generateOnboardingGuide called");
        try {
            const prompt = this.generateOnboardingPrompt(project);

            console.log(`Making request for onboarding guide with prompt length: ${prompt.length} chars`);
            const response = await this.makeRequest([
                { role: 'system', content: 'You are C3, a context-aware code assistant. Create a comprehensive onboarding guide for new developers joining this project. Your guide should help them understand the project structure, key components, important workflows, and best practices. Use markdown for formatting and structure.' },
                { role: 'user', content: prompt }
            ]);

            console.log("Received onboarding guide response");
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error generating onboarding guide:', error);
            return 'Error generating onboarding guide. Please check console for details.';
        }
    }

    async suggestDocumentation(project: ProjectAnalysisResult, activeFileName?: string): Promise<string> {
        console.log(`suggestDocumentation called for: ${activeFileName || "entire project"}`);
        try {
            let prompt = '';

            if (activeFileName) {
                // Generate documentation for the active file
                const activeFile = project.files.find(file => file.fileName === activeFileName);
                if (activeFile) {
                    prompt = this.generateFileDocumentationPrompt(activeFile, project);
                    console.log(`Generated documentation prompt for file: ${activeFileName}`);
                } else {
                    console.warn(`File not found for documentation: ${activeFileName}`);
                    // Fallback to project documentation
                    prompt = this.generateProjectDocumentationPrompt(project);
                    console.log("Generated fallback project documentation prompt");
                }
            } else {
                // Generate documentation for the project
                prompt = this.generateProjectDocumentationPrompt(project);
                console.log("Generated project documentation prompt");
            }

            console.log(`Making request for documentation with prompt length: ${prompt.length} chars`);
            const response = await this.makeRequest([
                { role: 'system', content: 'You are C3, a context-aware code assistant. Generate comprehensive documentation for the provided code. Your documentation should include purpose, usage, example calls, parameter descriptions, and return values where relevant. Use markdown for formatting and structure.' },
                { role: 'user', content: prompt }
            ]);

            console.log("Received documentation response");
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error generating documentation:', error);
            return 'Error generating documentation. Please check console for details.';
        }
    }

    // Enhanced code optimization function
    async generateCodeOptimizations(fileName: string, fileContent: string): Promise<CodeRange[]> {
        console.log(`Generating comprehensive code optimizations for file: ${fileName}`);

        try {
            // Generate a more detailed prompt that targets data structures and algorithms
            const prompt = this.generateEnhancedCodeOptimizationPrompt(fileName, fileContent);

            console.log(`Making request for detailed code optimizations with prompt length: ${prompt.length} chars`);
            const response = await this.makeRequest([
                { role: 'system', content: 'You are C3, a context-aware code assistant specializing in algorithm and data structure optimization. Identify potential code optimization opportunities in the provided code with detailed explanations of algorithmic improvements, time and space complexity analysis, and data structure recommendations. For each opportunity, provide specific suggestions including code examples where appropriate. Focus on performance, scalability, memory usage, and algorithmic efficiency.' },
                { role: 'user', content: prompt }
            ]);

            console.log("Received code optimization response");

            // Parse the response to extract optimization ranges
            const content = response.data.choices[0].message.content;

            // For mock responses or testing, return some sample optimizations
            if (this.useMock) {
                return this.getEnhancedMockOptimizations(fileContent);
            }

            // Try to parse the AI response to extract optimization ranges
            try {
                // Look for JSON structure in the response
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);

                if (jsonMatch && jsonMatch[1]) {
                    let optimizations = JSON.parse(jsonMatch[1]);

                    // Validate and enhance the structure
                    if (Array.isArray(optimizations)) {
                        return optimizations.map((opt, index) => ({
                            start: opt.start,
                            end: opt.end,
                            suggestion: opt.suggestion || opt.description || "Optimization opportunity identified",
                            id: `opt-${index}`,
                            severity: opt.severity || opt.priority || "medium",
                            category: opt.category || opt.type || "Performance"
                        }));
                    }
                }

                // Fallback: try to parse the structured format without JSON
                console.log("Couldn't find JSON format, trying to parse structured format");
                const optimizations: CodeRange[] = [];

                // Look for optimization sections in the format:
                // ## Optimization 1: [Category] [Severity]
                // **Range**: Lines 10-15
                // **Suggestion**: Lorem ipsum...
                const optimizationSections = content.match(/## Optimization \d+[\s\S]*?(?=## Optimization \d+|$)/g);

                if (optimizationSections) {
                    optimizationSections.forEach((section: string, index: number) => {
                        // Extract category from title
                        const categoryMatch = section.match(/## Optimization \d+:?\s*(?:\[(.*?)\])?/);
                        const category = categoryMatch && categoryMatch[1] ? categoryMatch[1].trim() : 'Performance';
                        
                        // Extract severity
                        const severityMatch = section.match(/\[(high|medium|low)\]|\*\*Severity\*\*:\s*(high|medium|low)/i);
                        const severity = (severityMatch && (severityMatch[1] || severityMatch[2])) ? 
                            (severityMatch[1] || severityMatch[2]).toLowerCase() as 'high' | 'medium' | 'low' : 'medium';
                        
                        // Extract line range
                        const rangeMatch = section.match(/\*\*Range\*\*: Lines (\d+)-(\d+)/);

                        // Extract suggestion
                        const suggestionMatch = section.match(/\*\*Suggestion\*\*: ([\s\S]*?)(?=\n\n|$)/);

                        if (rangeMatch && suggestionMatch) {
                            const startLine = parseInt(rangeMatch[1]) - 1; // Adjust for 0-indexed
                            const endLine = parseInt(rangeMatch[2]);

                            // Convert line numbers to character positions
                            const lines = fileContent.split('\n');
                            let startPos = 0;
                            let endPos = 0;

                            for (let i = 0; i < lines.length; i++) {
                                if (i < startLine) {
                                    startPos += lines[i].length + 1; // +1 for newline
                                }
                                if (i < endLine) {
                                    endPos += lines[i].length + 1;
                                } else {
                                    break;
                                }
                            }

                            optimizations.push({
                                start: startPos,
                                end: endPos,
                                suggestion: suggestionMatch[1].trim(),
                                id: `opt-${index}`,
                                severity,
                                category
                            });
                        }
                    });
                }

                if (optimizations.length > 0) {
                    return optimizations;
                }

                // If all parsing fails, return a generic optimization for the whole file
                return [{
                    start: 0,
                    end: Math.min(fileContent.length, 500),
                    suggestion: "The AI couldn't generate specific optimizations. Consider reviewing this file for performance improvements, algorithm efficiency, and data structure selection. Look for nested loops (O(n²) complexity), redundant calculations, inefficient data structures, and opportunities for memoization or dynamic programming.",
                    id: 'opt-0',
                    severity: 'medium',
                    category: 'Performance'
                }];
            } catch (parseError) {
                console.error("Error parsing AI optimization response:", parseError);

                // Return a generic optimization
                return [{
                    start: 0,
                    end: Math.min(fileContent.length, 500),
                    suggestion: "Error parsing optimization suggestions. Please try again or review the file manually for algorithm and data structure improvements.",
                    id: 'opt-error',
                    severity: 'medium',
                    category: 'Performance'
                }];
            }
        } catch (error) {
            console.error('Error generating code optimizations:', error);

            // Return a generic error suggestion
            return [{
                start: 0,
                end: Math.min(fileContent.length, 500),
                suggestion: "An error occurred while generating optimization suggestions. Please try again later.",
                id: 'opt-error',
                severity: 'medium',
                category: 'Error'
            }];
        }
    }

    async makeRequest(messages: Message[]) {
        // Always use mock response if no API key is available or in development mode
        if (this.useMock) {
            console.log("🔄 Using mock response (no API key provided)");
            return this.getMockResponse(messages);
        }

        try {
            console.log(`🔄 Making API request to ${this.baseURL} with model ${this.model}`);

            // Log just a snippet of the actual messages being sent (not the full content to avoid log spam)
            const logMessages = messages.map(m => ({
                role: m.role,
                contentLength: m.content.length,
                contentPreview: m.content.substring(0, 50) + '...'
            }));
            console.log("📨 Request messages:", logMessages);

            // Debug request header info
            console.log("🔐 Auth header exists:", !!this.apiKey);

            // Test API connection first (separate from the actual model request)
            console.log("🧪 Testing API connection...");
            try {
                const testResponse = await axios.get('https://api.openai.com/v1/models', {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                });
                console.log("✅ API connection test successful:", testResponse.status);
                console.log("📋 Available models:", testResponse.data.data.map((model: any) => model.id).slice(0, 5).join(', '), '...');
            } catch (testError: any) {
                console.error("❌ API connection test failed:", testError.message);
                if (axios.isAxiosError(testError) && testError.response) {
                    console.error("🚫 API test status:", testError.response.status);
                    console.error("🚫 API test data:", testError.response.data);
                }
            }

            // Now make the actual model request
            const response = await axios.post(
                this.baseURL,
                {
                    model: this.model,
                    messages,
                    temperature: 0.2,
                    max_tokens: 4000
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            console.log("✅ API request succeeded");
            return response;
        } catch (apiError: any) {
            console.error("❌ API request failed:", apiError.message);

            if (axios.isAxiosError(apiError) && apiError.response) {
                console.error("🚫 API response status:", apiError.response.status);
                console.error("🚫 API response data:", apiError.response.data);
            }

            // Additional debugging for network issues
            if (apiError.code) {
                console.error("🌐 Network error code:", apiError.code);
            }

            if (apiError.config) {
                console.log("🔧 Request config:", {
                    url: apiError.config.url,
                    method: apiError.config.method,
                    headers: apiError.config.headers ?
                        Object.keys(apiError.config.headers).filter(h => h.toLowerCase() !== 'authorization') :
                        'No headers',
                    data: apiError.config.data ? typeof apiError.config.data : 'No data'
                });
            }

            console.log("🔄 Falling back to mock response");
            return this.getMockResponse(messages);
        }
    }

    // Enhanced prompt generator for code optimizations
    private generateEnhancedCodeOptimizationPrompt(fileName: string, fileContent: string): string {
        // Generate detailed prompt for comprehensive code optimization
        let prompt = `## Comprehensive Code Optimization Analysis Request\n\n`;
        prompt += `Please analyze the following ${fileName} file for potential optimizations with a focus on algorithm efficiency, data structures, performance, and memory usage:\n\n`;

        // Add file content
        prompt += `### File Content\n\`\`\`\n${fileContent || 'Content not available'}\n\`\`\`\n\n`;

        // Add specific request for optimization suggestions with categories
        prompt += `### Optimization Request\n`;
        prompt += `Thoroughly examine the entire code file and identify specific sections that could be optimized. Consider the following categories:\n\n`;
        
        prompt += `1. **Algorithm Efficiency**: Identify inefficient algorithms and suggest improvements with better time complexity\n`;
        prompt += `2. **Data Structures**: Recommend more appropriate data structures for specific operations\n`;
        prompt += `3. **Performance**: Find bottlenecks, redundant calculations, or operations that could be optimized\n`;
        prompt += `4. **Memory Usage**: Detect memory leaks, unnecessary allocations, or ways to reduce memory footprint\n`;
        prompt += `5. **Readability**: Suggest improvements that make the code more maintainable without sacrificing performance\n\n`;
        
        prompt += `For each optimization, provide:\n\n`;
        prompt += `1. A specific line range where the optimization applies\n`;
        prompt += `2. The category of optimization (Algorithm, Data Structure, Performance, Memory, or Readability)\n`;
        prompt += `3. The severity/priority (high, medium, low)\n`;
        prompt += `4. A detailed explanation of the issue including time/space complexity analysis where appropriate\n`;
        prompt += `5. A specific, actionable suggestion with example code where helpful\n`;
        prompt += `6. Educational context explaining the underlying computer science concepts\n\n`;

        prompt += `Return the results in the following JSON format:\n\n`;
        prompt += `\`\`\`json\n[\n  {\n    "start": 120, // Character position where optimization starts\n    "end": 250, // Character position where optimization ends\n    "suggestion": "Detailed suggestion with educational context and example code",\n    "severity": "high", // high, medium, or low\n    "category": "Algorithm" // Algorithm, Data Structure, Performance, Memory, or Readability\n  },\n  // more optimizations...\n]\n\`\`\`\n\n`;
        
        prompt += `Make sure to analyze the ENTIRE file, not just the beginning. Look for:\n\n`;
        prompt += `- Nested loops that could be optimized (O(n²) → O(n log n) or O(n))\n`;
        prompt += `- Inefficient data structures (e.g., arrays where hashmaps would be better)\n`;
        prompt += `- Opportunities for memoization or dynamic programming\n`;
        prompt += `- Redundant calculations that could be cached\n`;
        prompt += `- Batch operations that could replace individual ones\n`;
        prompt += `- Inefficient string or array manipulations\n\n`;
        
        prompt += `Be educational in your suggestions, explaining WHY the optimization works, not just WHAT to change.\n`;

        return prompt;
    }

    // Enhanced mock optimizations with better categorization and descriptions
    private getEnhancedMockOptimizations(fileContent: string): CodeRange[] {
        const lines = fileContent.split('\n');
        const optimizations: CodeRange[] = [];

        // Helper to convert line numbers to character positions
        const lineToPosition = (lineStart: number, lineEnd: number) => {
            let startPos = 0;
            let endPos = 0;
            
            for (let i = 0; i < lines.length; i++) {
                if (i < lineStart) {
                    startPos += lines[i].length + 1; // +1 for newline
                }
                
                if (i < lineEnd) {
                    endPos += lines[i].length + 1;
                } else {
                    break;
                }
            }
            
            return { start: startPos, end: endPos };
        };

        // 1. Look for loops (potential O(n²) complexity)
        let inFunction = false;
        let functionStartLine = 0;
        let bracesCount = 0;
        let foundNestedLoop = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Function detection
            if (!inFunction && 
                (line.includes('function') || line.includes('=>') || line.match(/\w+\s*\([^)]*\)\s*{/)) &&
                !line.includes('};') && !line.includes('});')) {
                inFunction = true;
                functionStartLine = i;
                bracesCount = line.split('{').length - line.split('}').length;
            }
            
            if (inFunction) {
                bracesCount += line.split('{').length - line.split('}').length;
                
                // Detect nested loops
                if ((line.includes('for ') || line.includes('while') || line.includes('forEach')) && 
                    !foundNestedLoop) {
                    // Look ahead for another loop
                    let hasNestedLoop = false;
                    let nestedLoopLine = -1;
                    let currentBraceCount = bracesCount;
                    
                    for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
                        currentBraceCount += lines[j].split('{').length - lines[j].split('}').length;
                        
                        if ((lines[j].includes('for ') || lines[j].includes('while') || lines[j].includes('forEach')) && 
                            currentBraceCount > bracesCount) {
                            hasNestedLoop = true;
                            nestedLoopLine = j;
                            break;
                        }
                        
                        if (currentBraceCount <= bracesCount) break; // Out of the inner scope
                    }
                    
                    if (hasNestedLoop) {
                        const positions = lineToPosition(i, nestedLoopLine + 10);
                        foundNestedLoop = true; // Only include one nested loop per function
                        
                        optimizations.push({
                            start: positions.start,
                            end: positions.end,
                            suggestion: `**Algorithmic Complexity Issue**: This code contains nested loops, resulting in O(n²) time complexity.\n\n**Educational Context**: Nested loops process each element multiple times, which can be inefficient for large datasets. When the inner loop processes all n elements for each of the n elements in the outer loop, the time complexity becomes O(n²).\n\n**Recommendations**:\n\n1. Consider if this operation can be done in a single pass with O(n) complexity using a more efficient algorithm\n2. Use a hash map/object for lookups instead of nested iteration (trading space for time)\n3. If applicable, consider techniques like two-pointer method or sliding window\n\n**Example Optimization**:\n\`\`\`javascript\n// Instead of:\nfor (let i = 0; i < items.length; i++) {\n  for (let j = 0; j < items.length; j++) {\n    // Operations\n  }\n}\n\n// Consider using a Map for O(n) complexity:\nconst itemMap = new Map();\nfor (let i = 0; i < items.length; i++) {\n  itemMap.set(items[i].key, items[i]);\n}\n// Now lookups are O(1) instead of O(n)\n\`\`\``,
                            id: `opt-algorithm-${optimizations.length}`,
                            severity: 'high',
                            category: 'Algorithm'
                        });
                    }
                }
                
                // End of function detection
                if (bracesCount <= 0 && line.includes('}')) {
                    inFunction = false;
                    foundNestedLoop = false;
                }
            }
        }
        
        // 2. Look for potential inefficient data structure usage
        const arrayOperations = ['indexOf', 'includes', 'find', 'filter'];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (arrayOperations.some(op => line.includes(`.${op}(`)) && 
                line.length > 10 && // Not too short
                i > 0 && // Not the first line
                i < lines.length - 10) { // Not near the end
                
                const positions = lineToPosition(i - 1, i + 3);
                
                optimizations.push({
                    start: positions.start,
                    end: positions.end,
                    suggestion: `**Data Structure Efficiency**: This code uses array methods like \`${arrayOperations.find(op => line.includes(`.${op}(`))}\` which have O(n) time complexity.\n\n**Educational Context**: Array search operations typically require checking each element sequentially, resulting in O(n) time complexity. For frequently accessed data, especially in larger collections, this can become a performance bottleneck.\n\n**Recommendations**:\n\n1. Use a Map or Set data structure for O(1) lookups instead of arrays for frequently searched data\n2. If you need to search this collection multiple times, consider indexing the data by the search key\n\n**Example Optimization**:\n\`\`\`javascript\n// Instead of:\nconst item = items.find(item => item.id === searchId);\n\n// Consider:\nconst itemMap = new Map(items.map(item => [item.id, item]));\nconst item = itemMap.get(searchId); // O(1) lookup\n\`\`\``,
                    id: `opt-data-structure-${optimizations.length}`,
                    severity: 'medium',
                    category: 'Data Structure'
                });
            }
        }
        
        // 3. Look for useState/useEffect without dependencies (React)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.includes('useEffect(') && 
                !line.includes('[]') && // No empty dependency array
                !line.includes(',')) { // No comma indicating dependencies
                
                let hasEmptyDeps = false;
                let effectEndLine = i;
                
                // Check next few lines for ]); pattern with no dependencies
                for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                    if (lines[j].includes(']);') || lines[j].includes('])')) {
                        effectEndLine = j;
                        hasEmptyDeps = !lines[j-1].trim(); // Empty line before closing bracket
                        break;
                    }
                }
                
                if (!hasEmptyDeps && effectEndLine > i) {
                    const positions = lineToPosition(i, effectEndLine);
                    
                    optimizations.push({
                        start: positions.start,
                        end: positions.end,
                        suggestion: `**React Hook Performance**: This useEffect hook is missing a dependency array, which will cause it to run after every render.\n\n**Educational Context**: React's useEffect hook without a second argument runs after every component render, which can lead to unnecessary processing and even infinite render loops. Adding the proper dependency array ensures the effect only runs when specific values change.\n\n**Recommendations**:\n\n1. Add a dependency array containing all values from the component scope that are used inside the effect\n2. For effects that should run only once, use an empty dependency array \`[]\`\n3. Use the React DevTools' Profiler to identify unnecessary re-renders\n\n**Example Optimization**:\n\`\`\`jsx\n// Instead of:\nuseEffect(() => {\n  fetchData(userId);\n}); // Runs after every render\n\n// Use with proper dependencies:\nuseEffect(() => {\n  fetchData(userId);\n}, [userId]); // Only runs when userId changes\n\`\`\``,
                        id: `opt-performance-${optimizations.length}`,
                        severity: 'high',
                        category: 'Performance'
                    });
                }
            }
        }
        
        // 4. Look for memory management issues (closures, large objects)
        for (let i = 0; i < Math.min(lines.length, 200); i++) {
            const line = lines[i].trim();
            
            if ((line.includes('new Array(') || line.includes('Array(')) && 
                line.includes('fill(') && line.length > 15) {
                
                const positions = lineToPosition(i, i + 1);
                
                optimizations.push({
                    start: positions.start,
                    end: positions.end,
                    suggestion: `**Memory Usage Optimization**: Creating and filling large arrays can be memory-intensive.\n\n**Educational Context**: Pre-allocating large arrays consumes memory immediately, even if you don't use all elements right away. This can lead to inefficient memory usage, especially on memory-constrained devices.\n\n**Recommendations**:\n\n1. Consider if you actually need this entire array allocated at once\n2. For sparse arrays, use a Map or object with numeric keys instead\n3. Create arrays dynamically as needed rather than pre-allocating\n\n**Example Optimization**:\n\`\`\`javascript\n// Instead of:\nconst largeArray = new Array(10000).fill(0);\n\n// Consider a generator pattern for large sequences:\nfunction* generateSequence(size) {\n  for (let i = 0; i < size; i++) {\n    yield i;\n  }\n}\n// Only generates values as needed\n\`\`\``,
                    id: `opt-memory-${optimizations.length}`,
                    severity: 'medium',
                    category: 'Memory'
                });
                
                break; // Only add one of these
            }
        }

        // 5. Look for string concatenation in loops
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if ((line.includes('for ') || line.includes('while') || line.includes('forEach')) && 
                i + 10 < lines.length) {
                
                // Look for string concatenation in the next few lines
                let hasStringConcat = false;
                let loopEndLine = i;
                let bracesCount = line.split('{').length - line.split('}').length;
                
                for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
                    const innerLine = lines[j].trim();
                    bracesCount += innerLine.split('{').length - innerLine.split('}').length;
                    
                    if (innerLine.includes(' += ') && 
                        !innerLine.includes('++') && // Not increment
                        innerLine.includes('"') || innerLine.includes("'")) {
                        hasStringConcat = true;
                        loopEndLine = j;
                    }
                    
                    if (bracesCount <= 0) {
                        loopEndLine = j;
                        break;
                    }
                }
                
                if (hasStringConcat) {
                    const positions = lineToPosition(i, loopEndLine);
                    
                    optimizations.push({
                        start: positions.start,
                        end: positions.end,
                        suggestion: `**Performance - String Concatenation**: Using string concatenation in loops (+=) is inefficient for large strings.\n\n**Educational Context**: String concatenation creates a new string each time, which can lead to O(n²) complexity as strings grow. Each concatenation requires allocating new memory and copying the existing string plus the new content.\n\n**Recommendations**:\n\n1. Use array.join() instead of string concatenation in loops\n2. For modern browsers, consider using template literals with array.join()\n3. Create an array of strings and join them at the end\n\n**Example Optimization**:\n\`\`\`javascript\n// Instead of:\nlet result = '';\nfor (let i = 0; i < items.length; i++) {\n  result += items[i] + ', ';\n}\n\n// Use:\nconst parts = [];\nfor (let i = 0; i < items.length; i++) {\n  parts.push(items[i]);\n}\nconst result = parts.join(', ');\n\`\`\``,
                        id: `opt-performance-${optimizations.length}`,
                        severity: 'medium',
                        category: 'Performance'
                    });
                    
                    break; // Only add one of these
                }
            }
        }
        
        // If we found some optimizations, return them
        if (optimizations.length > 0) {
            return optimizations;
        }
        
        // Fallback generic optimization suggestions
        return [
            {
                start: 0,
                end: Math.min(fileContent.length, 300),
                suggestion: `**General Code Optimization**: This code could benefit from a review of data structures and algorithms.\n\n**Educational Context**: Choosing the right data structure and algorithm for each task is crucial for performance. Sub-optimal choices can lead to inefficient code, especially at scale.\n\n**Recommendations**:\n\n1. Review O(n²) operations that could be optimized to O(n) or O(log n)\n2. Consider using Maps/Sets for lookups instead of arrays where appropriate\n3. Evaluate whether React components should use memoization (React.memo, useMemo, useCallback)\n4. Check for opportunities to reduce rendering with proper dependency arrays\n\nPerforming a comprehensive review of the codebase with attention to algorithmic complexity will help identify specific optimization targets.`,
                id: 'opt-general-0',
                severity: 'medium',
                category: 'Performance'
            }
        ];
    }

    private generateFileExplanationPrompt(file: FileAnalysis, project: ProjectAnalysisResult): string {
        // Get the file content
        const fileContent = this.getFileContent(file.fileName);

        // Generate detailed prompt for file explanation
        let prompt = `## File Analysis Request\n\n`;
        prompt += `Please provide a detailed explanation of the following file: "${file.fileName}"\n\n`;

        // Add file metrics
        prompt += `### File Metrics\n`;
        prompt += `- Lines of Code: ${file.fileMetrics.linesOfCode}\n`;
        prompt += `- Functions: ${file.fileMetrics.totalFunctions}\n`;
        prompt += `- Classes: ${file.fileMetrics.totalClasses}\n`;
        prompt += `- Components: ${file.fileMetrics.totalComponents}\n`;
        prompt += `- Average Complexity: ${file.fileMetrics.averageComplexity.toFixed(2)}\n\n`;

        // Add dependencies information
        if (file.dependencies.length > 0) {
            prompt += `### Dependencies\n`;
            prompt += `This file has ${file.dependencies.length} function calls, `;
            const crossFileDeps = file.dependencies.filter(dep => dep.isCrossFile).length;
            prompt += `including ${crossFileDeps} cross-file dependencies.\n\n`;
        }

        // Add imports information
        if (file.imports.length > 0) {
            prompt += `### Imports\n`;
            prompt += `This file imports from:\n`;
            const importSources = new Set(file.imports.map(imp => imp.source));
            importSources.forEach(source => {
                prompt += `- ${source}\n`;
            });
            prompt += `\n`;
        }

        // Add information about React components if present
        if (file.components && file.components.length > 0) {
            prompt += `### React Components\n`;
            prompt += `This file contains ${file.components.length} React component(s).\n\n`;

            file.components.forEach(component => {
                prompt += `#### ${component.name}\n`;
                if (component.props.length > 0) {
                    prompt += `- Props: ${component.props.join(', ')}\n`;
                }
                if (component.hooks && component.hooks.length > 0) {
                    prompt += `- Hooks used: ${component.hooks.join(', ')}\n`;
                }
                prompt += `\n`;
            });
        }

        // Add file content
        prompt += `### File Content\n\`\`\`\n${fileContent || 'Content not available'}\n\`\`\`\n\n`;

        // Add request for specific information
        prompt += `### Explanation Request\n`;
        prompt += `Please explain:\n`;
        prompt += `1. The main purpose and functionality of this file\n`;
        prompt += `2. Key functions/components and their roles\n`;
        prompt += `3. How this file interacts with other parts of the codebase\n`;
        prompt += `4. The overall architecture and design patterns used\n`;
        prompt += `5. Any notable implementation details or edge cases\n\n`;

        return prompt;
    }

    private generateProjectExplanationPrompt(project: ProjectAnalysisResult): string {
        // Generate detailed prompt for project explanation
        let prompt = `## Project Analysis Request\n\n`;

        // Add project metrics
        prompt += `### Project Metrics\n`;
        prompt += `- Total Files: ${project.projectMetrics.totalFiles}\n`;
        prompt += `- Total Lines of Code: ${project.projectMetrics.totalLinesOfCode}\n`;
        prompt += `- Total Functions: ${project.projectMetrics.totalFunctions}\n`;
        prompt += `- Total Classes: ${project.projectMetrics.totalClasses}\n`;
        prompt += `- Total Components: ${project.projectMetrics.totalComponents}\n`;
        prompt += `- Average Complexity: ${project.projectMetrics.averageComplexity.toFixed(2)}\n`;
        prompt += `- Most Complex File: ${project.projectMetrics.mostComplexFile.fileName}\n`;
        prompt += `- Most Depended-on File: ${project.projectMetrics.mostDependedOnFile.fileName}\n\n`;

        // List all files
        prompt += `### Project Files\n`;
        project.files.forEach(file => {
            prompt += `- ${file.fileName} (${file.fileMetrics.linesOfCode} lines, ${file.fileMetrics.totalFunctions} functions)\n`;
        });
        prompt += `\n`;

        // Add summary of React components if present
        const totalComponents = project.components ? project.components.length : 0;
        if (totalComponents > 0) {
            prompt += `### React Components Overview\n`;
            prompt += `This project contains ${totalComponents} React components across ${new Set(project.components.map(c => c.fileName || '')).size} files.\n\n`;

            // List top components by complexity
            const topComponents = [...project.components]
                .sort((a, b) => {
                    const aComplexity = project.functions.find(f => f.name === a.name)?.complexity || 0;
                    const bComplexity = project.functions.find(f => f.name === b.name)?.complexity || 0;
                    return bComplexity - aComplexity;
                })
                .slice(0, 5);

            if (topComponents.length > 0) {
                prompt += `Top 5 most complex components:\n`;
                topComponents.forEach(component => {
                    const complexity = project.functions.find(f => f.name === component.name)?.complexity || 0;
                    prompt += `- ${component.name} (${component.fileName || 'unknown'}, complexity: ${complexity})\n`;
                });
                prompt += `\n`;
            }
        }

        // Add dependencies information
        prompt += `### Cross-file Dependencies\n`;
        prompt += `This project has ${project.projectMetrics.crossFileDependencies} cross-file dependencies.\n\n`;

        // Add summary of file contents
        prompt += `### File Summaries\n`;
        project.files.forEach(file => {
            const fileContent = this.getFileContent(file.fileName);
            const preview = fileContent ? fileContent.slice(0, 200) + '...' : 'Content not available';

            prompt += `#### ${file.fileName}\n\`\`\`\nLines: ${file.fileMetrics.linesOfCode}\nFunctions: ${file.fileMetrics.totalFunctions}\nComponents: ${file.fileMetrics.totalComponents}\nPreview: ${preview}\n\`\`\`\n\n`;
        });

        // Add request for specific information
        prompt += `### Explanation Request\n`;
        prompt += `Please provide a comprehensive overview of this project including:\n`;
        prompt += `1. The main purpose and functionality of the application\n`;
        prompt += `2. Overall architecture and design patterns\n`;
        prompt += `3. Key components and their responsibilities\n`;
        prompt += `4. Flow of data and control through the application\n`;
        prompt += `5. Notable implementation details or interesting patterns\n\n`;

        return prompt;
    }

    private generateFileRefactoringPrompt(file: FileAnalysis, project: ProjectAnalysisResult): string {
        const fileContent = this.getFileContent(file.fileName);

        // Generate detailed prompt for file refactoring suggestions
        let prompt = `## Refactoring Suggestions Request\n\n`;
        prompt += `Please analyze the following file and suggest specific refactoring improvements: "${file.fileName}"\n\n`;

        // Add file metrics focusing on complexity
        prompt += `### Complexity Metrics\n`;
        prompt += `- Lines of Code: ${file.fileMetrics.linesOfCode}\n`;
        prompt += `- Average Function Complexity: ${file.fileMetrics.averageComplexity.toFixed(2)}\n`;
        prompt += `- High Complexity Functions: ${file.fileMetrics.highComplexityFunctions}\n\n`;

        // Add complex functions
        const complexFunctions = file.functions.filter(fn => fn.complexity > 5);
        if (complexFunctions.length > 0) {
            prompt += `### Complex Functions\n`;
            complexFunctions.forEach(fn => {
                prompt += `- ${fn.name} (complexity: ${fn.complexity})\n`;
            });
            prompt += `\n`;
        }

        // Add file content
        prompt += `### File Content\n\`\`\`\n${fileContent || 'Content not available'}\n\`\`\`\n\n`;

        // Add request for specific refactoring suggestions
        prompt += `### Refactoring Request\n`;
        prompt += `Please provide detailed refactoring suggestions including:\n`;
        prompt += `1. Specific code smells and anti-patterns identified\n`;
        prompt += `2. Step-by-step refactoring instructions with code examples\n`;
        prompt += `3. Before and after code snippets for key refactorings\n`;
        prompt += `4. Improvements to maintainability, readability, and performance\n`;
        prompt += `5. Suggestions for applying design patterns where appropriate\n\n`;

        return prompt;
    }

    private generateProjectRefactoringPrompt(project: ProjectAnalysisResult): string {
        // Generate detailed prompt for project-wide refactoring suggestions
        let prompt = `## Project Refactoring Suggestions Request\n\n`;

        // Add project metrics focusing on complexity
        prompt += `### Project Complexity Metrics\n`;
        prompt += `- Total Files: ${project.projectMetrics.totalFiles}\n`;
        prompt += `- Total Lines of Code: ${project.projectMetrics.totalLinesOfCode}\n`;
        prompt += `- Average Function Complexity: ${project.projectMetrics.averageComplexity.toFixed(2)}\n`;
        prompt += `- High Complexity Functions: ${project.projectMetrics.highComplexityFunctions}\n`;
        prompt += `- Most Complex File: ${project.projectMetrics.mostComplexFile.fileName} (complexity: ${project.projectMetrics.mostComplexFile.complexity})\n\n`;

        // List most complex files
        const complexFiles = [...project.files]
            .sort((a, b) => {
                const aComplexity = a.functions.reduce((sum, fn) => sum + fn.complexity, 0);
                const bComplexity = b.functions.reduce((sum, fn) => sum + fn.complexity, 0);
                return bComplexity - aComplexity;
            })
            .slice(0, 5);

        if (complexFiles.length > 0) {
            prompt += `### Top 5 Most Complex Files\n`;
            complexFiles.forEach(file => {
                const totalComplexity = file.functions.reduce((sum, fn) => sum + fn.complexity, 0);
                prompt += `- ${file.fileName} (total complexity: ${totalComplexity}, functions: ${file.fileMetrics.totalFunctions})\n`;
            });
            prompt += `\n`;
        }

        // List most complex functions
        const complexFunctions = [...project.functions]
            .sort((a, b) => b.complexity - a.complexity)
            .slice(0, 10);

        if (complexFunctions.length > 0) {
            prompt += `### Top 10 Most Complex Functions\n`;
            complexFunctions.forEach(fn => {
                prompt += `- ${fn.name} (${fn.fileName || 'unknown'}, complexity: ${fn.complexity})\n`;
            });
            prompt += `\n`;
        }

        // Add cross-file dependencies information
        prompt += `### Cross-file Dependencies\n`;
        prompt += `This project has ${project.projectMetrics.crossFileDependencies} cross-file dependencies.\n\n`;

        // Add file content summaries
        prompt += `### File Content Summaries\n`;
        // Only include the most complex and most depended on files to keep prompt size manageable
        const importantFiles = new Set<string>([
            project.projectMetrics.mostComplexFile.fileName,
            project.projectMetrics.mostDependedOnFile.fileName,
            ...complexFiles.slice(0, 3).map(file => file.fileName)
        ]);

        Array.from(importantFiles).forEach(fileName => {
            const file = project.files.find(f => f.fileName === fileName);
            if (!file) return;

            const fileContent = this.getFileContent(fileName);
            const preview = fileContent ? fileContent.slice(0, 300) + '...' : 'Content not available';

            prompt += `#### ${fileName}\n\`\`\`\n${preview}\n\`\`\`\n\n`;
        });

        // Add request for specific refactoring suggestions
        prompt += `### Refactoring Request\n`;
        prompt += `Please provide project-wide refactoring suggestions including:\n`;
        prompt += `1. Overall architecture improvements\n`;
        prompt += `2. Specific refactoring targets for the most complex files and functions\n`;
        prompt += `3. Patterns of code duplication or inconsistency\n`;
        prompt += `4. Suggestions for improving project structure and organization\n`;
        prompt += `5. Recommendations for applying design patterns to improve maintainability\n\n`;

        return prompt;
    }

    private generateQuestionPromptForFile(file: FileAnalysis, project: ProjectAnalysisResult, question: string): string {
        const fileContent = this.getFileContent(file.fileName);

        // Generate detailed prompt for answering a question about a specific file
        let prompt = `## Code Question\n\n`;
        prompt += `Question about the file "${file.fileName}":\n\n`;
        prompt += `"${question}"\n\n`;

        // Add file content
        prompt += `### File Content\n\`\`\`\n${fileContent || 'Content not available'}\n\`\`\`\n\n`;

        // Add context about related files
        const relatedFiles = this.findRelatedFiles(file.fileName, project);
        if (relatedFiles.length > 0) {
            prompt += `### Related Files\n`;
            prompt += `This file has dependencies with the following files:\n`;
            relatedFiles.forEach(relatedFile => {
                prompt += `- ${relatedFile}\n`;
            });
            prompt += `\n`;

            // Include content from the most relevant related files
            if (relatedFiles.length > 0) {
                prompt += `### Related File Contents\n`;
                // Limit to the first 3 to keep prompt size manageable
                relatedFiles.slice(0, 3).forEach(relatedFileName => {
                    const relatedContent = this.getFileContent(relatedFileName);
                    if (relatedContent && relatedContent !== 'Content not available') {
                        // Limit the size of each related file to keep prompt manageable
                        const contentPreview = relatedContent.length > 500 ?
                            relatedContent.substring(0, 500) + '...' : relatedContent;

                        prompt += `#### ${relatedFileName}\n\`\`\`\n${contentPreview}\n\`\`\`\n\n`;
                    }
                });
            }
        }

        // Add specific request
        prompt += `### Answer Request\n`;
        prompt += `Please provide a detailed and accurate answer to the question based on the code context provided.\n`;
        prompt += `Include code snippets, explanations, and examples where appropriate.\n\n`;

        return prompt;
    }

    private generateQuestionPromptForProject(project: ProjectAnalysisResult, question: string): string {
        // Generate detailed prompt for answering a question about the whole project
        let prompt = `## Project Question\n\n`;
        prompt += `Question about the project:\n\n`;
        prompt += `"${question}"\n\n`;

        // Add project context
        prompt += `### Project Context\n`;
        prompt += `- Total Files: ${project.projectMetrics.totalFiles}\n`;
        prompt += `- Total Functions: ${project.projectMetrics.totalFunctions}\n`;
        prompt += `- Total Components: ${project.projectMetrics.totalComponents}\n\n`;

        // List all files briefly
        prompt += `### Project Files\n`;
        project.files.forEach(file => {
            prompt += `- ${file.fileName}\n`;
        });
        prompt += `\n`;

        // Identify most relevant files based on the question
        const keywordMatches = this.findRelevantFilesForQuestion(project, question);
        const relevantFiles = keywordMatches.slice(0, 5); // Limit to top 5 matches

        if (relevantFiles.length > 0) {
            prompt += `### Most Relevant File Contents\n`;

            relevantFiles.forEach(fileName => {
                const fileContent = this.getFileContent(fileName);
                if (fileContent && fileContent !== 'Content not available') {
                    // Limit the size of each file to keep prompt manageable
                    const contentPreview = fileContent.length > 1000 ?
                        fileContent.substring(0, 1000) + '...' : fileContent;

                    prompt += `#### ${fileName}\n\`\`\`\n${contentPreview}\n\`\`\`\n\n`;
                }
            });
        } else {
            // If no clearly relevant files, include the most important ones
            prompt += `### Key File Contents\n`;
            const importantFiles = [
                project.projectMetrics.mostComplexFile.fileName,
                project.projectMetrics.mostDependedOnFile.fileName
            ];

            importantFiles.forEach(fileName => {
                const fileContent = this.getFileContent(fileName);
                if (fileContent && fileContent !== 'Content not available') {
                    // Limit the size to keep prompt manageable
                    const contentPreview = fileContent.length > 800 ?
                        fileContent.substring(0, 800) + '...' : fileContent;

                    prompt += `#### ${fileName}\n\`\`\`\n${contentPreview}\n\`\`\`\n\n`;
                }
            });
        }

        // Add specific request
        prompt += `### Answer Request\n`;
        prompt += `Please provide a detailed and accurate answer to the question based on the project context provided.\n`;
        prompt += `Include code snippets, explanations, and examples where appropriate.\n\n`;

        return prompt;
    }

    private generateOnboardingPrompt(project: ProjectAnalysisResult): string {
        // Generate detailed prompt for creating an onboarding guide
        let prompt = `## Onboarding Guide Request\n\n`;

        // Add project metrics
        prompt += `### Project Metrics\n`;
        prompt += `- Total Files: ${project.projectMetrics.totalFiles}\n`;
        prompt += `- Total Lines of Code: ${project.projectMetrics.totalLinesOfCode}\n`;
        prompt += `- Total Functions: ${project.projectMetrics.totalFunctions}\n`;
        prompt += `- Total Classes: ${project.projectMetrics.totalClasses}\n`;
        prompt += `- Total Components: ${project.projectMetrics.totalComponents}\n\n`;

        // List all files with brief descriptions
        prompt += `### Project Structure\n`;
        let filesByDirectory: { [dir: string]: string[] } = {};

        project.files.forEach(file => {
            const pathParts = file.fileName.split('/');
            let directory = '.';

            if (pathParts.length > 1) {
                pathParts.pop(); // Remove filename
                directory = pathParts.join('/');
            }

            if (!filesByDirectory[directory]) {
                filesByDirectory[directory] = [];
            }

            filesByDirectory[directory].push(file.fileName);
        });

        Object.keys(filesByDirectory).sort().forEach(dir => {
            prompt += `#### ${dir}\n`;
            filesByDirectory[dir].forEach(file => {
                prompt += `- ${file}\n`;
            });
            prompt += `\n`;
        });

        // Add information about key components
        if (project.components && project.components.length > 0) {
            prompt += `### Key Components\n`;
            const topComponents = [...project.components]
                .sort((a, b) => {
                    // Sort by number of references (how many times it's used by other components)
                    const aRefs = project.dependencies.filter(d => d.callee === a.name).length;
                    const bRefs = project.dependencies.filter(d => d.callee === b.name).length;
                    return bRefs - aRefs;
                })
                .slice(0, 10);

            topComponents.forEach(component => {
                const refs = project.dependencies.filter(d => d.callee === component.name).length;
                prompt += `- ${component.name} (${component.fileName || 'unknown'}, referenced ${refs} times)\n`;
            });
            prompt += `\n`;
        }

        // Add most important file contents
        prompt += `### Key File Contents\n`;
        // Identify key files to include
        const keyFiles = [
            // Main app file
            project.files.find(f => f.fileName.includes('App.') || f.fileName.includes('index.'))?.fileName,
            // Most complex file
            project.projectMetrics.mostComplexFile.fileName,
            // Most depended on file
            project.projectMetrics.mostDependedOnFile.fileName
        ].filter(Boolean) as string[];

        // Add unique files only
        Array.from(new Set(keyFiles)).forEach(fileName => {
            const fileContent = this.getFileContent(fileName);
            if (fileContent && fileContent !== 'Content not available') {
                // Limit content to a reasonable size
                const contentPreview = fileContent.length > 500 ?
                    fileContent.substring(0, 500) + '...' : fileContent;

                prompt += `#### ${fileName}\n\`\`\`\n${contentPreview}\n\`\`\`\n\n`;
            }
        });

        // Add request for onboarding guide
        prompt += `### Onboarding Guide Request\n`;
        prompt += `Please create a comprehensive onboarding guide for new developers joining this project. Include:\n`;
        prompt += `1. Project overview and purpose\n`;
        prompt += `2. System architecture and design patterns\n`;
        prompt += `3. Key components and their responsibilities\n`;
        prompt += `4. Setup instructions and development workflow\n`;
        prompt += `5. Important code conventions and patterns\n`;
        prompt += `6. Common tasks and how to accomplish them\n`;
        prompt += `7. Testing approach\n`;
        prompt += `8. Deployment process (if applicable)\n\n`;

        return prompt;
    }

    private generateFileDocumentationPrompt(file: FileAnalysis, project: ProjectAnalysisResult): string {
        const fileContent = this.getFileContent(file.fileName);

        // Generate detailed prompt for file documentation
        let prompt = `## File Documentation Request\n\n`;
        prompt += `Please generate comprehensive documentation for the file: "${file.fileName}"\n\n`;

        // Add file content
        prompt += `### File Content\n\`\`\`\n${fileContent || 'Content not available'}\n\`\`\`\n\n`;

        // Add file metrics
        prompt += `### File Metrics\n`;
        prompt += `- Functions: ${file.fileMetrics.totalFunctions}\n`;
        prompt += `- Complexity: ${file.fileMetrics.averageComplexity.toFixed(2)}\n`;
        prompt += `- Classes: ${file.fileMetrics.totalClasses}\n`;
        prompt += `- Components: ${file.fileMetrics.totalComponents}\n\n`;

        // Add specific documentation request
        prompt += `### Documentation Request\n`;
        prompt += `Please generate documentation including:\n`;
        prompt += `1. File overview and purpose\n`;
        prompt += `2. Detailed documentation for each function/class/component\n`;
        prompt += `3. Parameter and return value descriptions\n`;
        prompt += `4. Usage examples\n`;
        prompt += `5. Dependencies and interactions with other files\n\n`;

        return prompt;
    }

    private generateProjectDocumentationPrompt(project: ProjectAnalysisResult): string {
        // Generate detailed prompt for project documentation
        let prompt = `## Project Documentation Request\n\n`;

        // Add project metrics
        prompt += `### Project Metrics\n`;
        prompt += `- Total Files: ${project.projectMetrics.totalFiles}\n`;
        prompt += `- Total Functions: ${project.projectMetrics.totalFunctions}\n`;
        prompt += `- Total Classes: ${project.projectMetrics.totalClasses}\n`;
        prompt += `- Total Components: ${project.projectMetrics.totalComponents}\n\n`;

        // List all files by directory
        prompt += `### Project Structure\n`;
        let filesByDirectory: { [dir: string]: string[] } = {};

        project.files.forEach(file => {
            const pathParts = file.fileName.split('/');
            let directory = '.';

            if (pathParts.length > 1) {
                pathParts.pop(); // Remove filename
                directory = pathParts.join('/');
            }

            if (!filesByDirectory[directory]) {
                filesByDirectory[directory] = [];
            }

            filesByDirectory[directory].push(file.fileName);
        });

        Object.keys(filesByDirectory).sort().forEach(dir => {
            prompt += `#### ${dir}\n`;
            filesByDirectory[dir].forEach(file => {
                prompt += `- ${file}\n`;
            });
            prompt += `\n`;
        });

        // Add main file contents (limit to a reasonable number)
        prompt += `### Key File Contents\n`;

        // Find main component and service files
        const mainComponentFile = project.files.find(f =>
            f.fileName.includes('App.') ||
            f.components.some(c => c.name.includes('App'))
        )?.fileName;

        const mainServiceFiles = project.files
            .filter(f => f.fileName.includes('Service') || f.fileName.includes('service'))
            .map(f => f.fileName)
            .slice(0, 2);

        const keyFiles = [
            // Main entry file
            project.files.find(f => f.fileName.includes('index.'))?.fileName,
            // Main component file
            mainComponentFile,
            // Main service files
            ...mainServiceFiles
        ].filter(Boolean) as string[];

        // Add unique files only
        Array.from(new Set(keyFiles)).forEach(fileName => {
            const fileContent = this.getFileContent(fileName);
            if (fileContent && fileContent !== 'Content not available') {
                // Limit content to a reasonable size
                const contentPreview = fileContent.length > 500 ?
                    fileContent.substring(0, 500) + '...' : fileContent;

                prompt += `#### ${fileName}\n\`\`\`\n${contentPreview}\n\`\`\`\n\n`;
            }
        });

        // Add specific documentation request
        prompt += `### Documentation Request\n`;
        prompt += `Please generate comprehensive project documentation including:\n`;
        prompt += `1. Project overview and purpose\n`;
        prompt += `2. System architecture and design\n`;
        prompt += `3. Directory structure explanation\n`;
        prompt += `4. Key components and their interactions\n`;
        prompt += `5. API documentation (if applicable)\n`;
        prompt += `6. Development, testing, and deployment guidelines\n\n`;

        return prompt;
    }

    private findRelatedFiles(fileName: string, project: ProjectAnalysisResult): string[] {
        const relatedFiles = new Set<string>();

        // Find files that are imported by this file
        project.imports
            .filter(imp => imp.fileName === fileName)
            .forEach(imp => {
                // Find the actual file that contains the imported module
                const sourceFile = project.files.find(file =>
                    file.fileName.includes(imp.source) ||
                    file.fileName.endsWith(`/${imp.source}.js`) ||
                    file.fileName.endsWith(`/${imp.source}.jsx`) ||
                    file.fileName.endsWith(`/${imp.source}.ts`) ||
                    file.fileName.endsWith(`/${imp.source}.tsx`)
                );

                if (sourceFile) {
                    relatedFiles.add(sourceFile.fileName);
                }
            });

        // Find files that import from this file
        project.imports
            .filter(imp => {
                const sourceParts = fileName.split('/');
                const sourceFile = sourceParts[sourceParts.length - 1];
                const sourceNoExt = sourceFile.split('.')[0];

                return imp.source === sourceNoExt ||
                    imp.source.endsWith(`/${sourceNoExt}`) ||
                    imp.source === fileName;
            })
            .forEach(imp => {
                if (imp.fileName) {
                    relatedFiles.add(imp.fileName);
                }
            });

        // Find files with cross-file dependencies
        project.dependencies
            .filter(dep => dep.calleeFileName === fileName || dep.callerFileName === fileName)
            .forEach(dep => {
                if (dep.calleeFileName && dep.calleeFileName !== fileName) {
                    relatedFiles.add(dep.calleeFileName);
                }
                if (dep.callerFileName && dep.callerFileName !== fileName) {
                    relatedFiles.add(dep.callerFileName);
                }
            });

        return Array.from(relatedFiles);
    }

    // New helper method to find files relevant to a question
    private findRelevantFilesForQuestion(project: ProjectAnalysisResult, question: string): string[] {
        // Extract keywords from the question
        const questionLower = question.toLowerCase();
        const keywords = questionLower
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 3) // Only keep words longer than 3 chars
            .filter(word => !['what', 'when', 'where', 'which', 'with', 'about', 'have', 'does', 'that', 'this'].includes(word));

        // Score each file based on keyword matches in filename and content
        const fileScores: { fileName: string, score: number }[] = [];

        project.files.forEach(file => {
            let score = 0;
            const fileName = file.fileName.toLowerCase();

            // Check filename for keywords
            keywords.forEach(keyword => {
                if (fileName.includes(keyword)) {
                    score += 5; // Higher weight for filename matches
                }
            });

            // Check file content for keywords
            const content = this.getFileContent(file.fileName).toLowerCase();
            keywords.forEach(keyword => {
                // Count occurrences of keyword in content
                const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
                score += matches;
            });

            fileScores.push({ fileName: file.fileName, score });
        });

        // Sort by score and return filenames
        return fileScores
            .sort((a, b) => b.score - a.score)
            .filter(item => item.score > 0)
            .map(item => item.fileName);
    }

    // Updated helper to get the file content
    private getFileContent(fileName: string): string {
        // Look up the file content in our map
        const content = this.fileContents.get(fileName);

        if (content) {
            return content;
        }

        console.log(`No content available for file: ${fileName}`);
        return `// Content not available for ${fileName}`;
    }

    private getMockResponse(messages: Message[]) {
        // Extract the last user message for context
        const userMessage = messages[messages.length - 1].content;
        console.log(`🔄 Generating mock response for user message containing: "${userMessage.substring(0, 50)}..."`);

        let mockContent = '';

        if (userMessage.includes('Explanation Request')) {
            console.log("📋 Using explanation mock response");
            mockContent = MOCK_RESPONSES.explanation;
        } else if (userMessage.includes('Refactoring Request')) {
            console.log("📋 Using refactoring mock response");
            mockContent = MOCK_RESPONSES.refactoring;
        } else if (userMessage.includes('Answer Request') || userMessage.includes('Question about')) {
            console.log("📋 Using answer mock response");
            mockContent = MOCK_RESPONSES.answer;
        } else if (userMessage.includes('Onboarding Guide Request')) {
            console.log("📋 Using onboarding guide mock response");
            mockContent = MOCK_RESPONSES.onboardingGuide;
        } else if (userMessage.includes('Documentation Request')) {
            console.log("📋 Using documentation mock response");
            mockContent = MOCK_RESPONSES.documentation;
        } else if (userMessage.includes('Optimization Request')) {
            console.log("📋 Using code optimization mock response");
            mockContent = MOCK_RESPONSES.codeOptimization;
        } else {
            console.log("📋 Using generic mock response");
            mockContent = 'This is a mock response from the AI service. The actual implementation would connect to an AI model to provide more detailed and context-aware responses.';
        }

        // Create a mock successful axios response
        return Promise.resolve({
            data: {
                choices: [
                    {
                        message: {
                            content: mockContent
                        }
                    }
                ]
            }
        });
    }

    // Helper method for converting single file analysis to project format
    private convertToProjectAnalysis(code: string, analysis: AnalysisResult): ProjectAnalysisResult {
        console.log("Converting single file analysis to project format");

        // If analysis is already in the new format, return it
        if ('files' in analysis && 'projectMetrics' in analysis) {
            console.log("Analysis is already in project format");
            return analysis as unknown as ProjectAnalysisResult;
        }

        console.log("Creating file analysis from single file analysis");

        // Create a file analysis
        const fileAnalysis: FileAnalysis = {
            fileName: 'input.js',
            functions: analysis.functions.map(fn => ({ ...fn, fileName: 'input.js' })),
            variables: analysis.variables.map(v => ({ ...v, fileName: 'input.js' })),
            imports: analysis.imports.map(imp => ({ ...imp, fileName: 'input.js' })),
            dependencies: analysis.dependencies.map(dep => ({
                ...dep,
                fileName: 'input.js',
                callerFileName: 'input.js',
                calleeFileName: 'input.js'
            })),
            classes: [],
            components: [],
            fileMetrics: {
                linesOfCode: code.split('\n').length,
                totalFunctions: analysis.functions.length,
                totalVariables: analysis.variables.length,
                totalClasses: 0,
                totalComponents: 0,
                averageComplexity: analysis.metrics.averageComplexity,
                highComplexityFunctions: analysis.metrics.highComplexityFunctions,
                dependencies: analysis.dependencies.length,
                imports: analysis.imports.length
            }
        };

        console.log("Creating project analysis from file analysis");

        // Create project analysis
        return {
            files: [fileAnalysis],
            functions: fileAnalysis.functions,
            variables: fileAnalysis.variables,
            imports: fileAnalysis.imports,
            dependencies: fileAnalysis.dependencies,
            classes: [],
            components: [],
            projectMetrics: {
                totalFiles: 1,
                totalLinesOfCode: fileAnalysis.fileMetrics.linesOfCode,
                totalFunctions: fileAnalysis.fileMetrics.totalFunctions,
                totalVariables: fileAnalysis.fileMetrics.totalVariables,
                totalClasses: 0,
                totalComponents: 0,
                averageComplexity: fileAnalysis.fileMetrics.averageComplexity,
                highComplexityFunctions: fileAnalysis.fileMetrics.highComplexityFunctions,
                totalDependencies: fileAnalysis.fileMetrics.dependencies,
                crossFileDependencies: 0,
                mostComplexFile: {
                    fileName: 'input.js',
                    complexity: fileAnalysis.fileMetrics.averageComplexity
                },
                mostDependedOnFile: {
                    fileName: 'input.js',
                    dependencies: fileAnalysis.fileMetrics.dependencies
                }
            }
        };
    }
}

export default new AIService();
// Ensures file is treated as a module
export { };