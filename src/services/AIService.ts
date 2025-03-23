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

    async generateCodeOptimizations(fileName: string, fileContent: string): Promise<CodeRange[]> {
        console.log(`Generating code optimizations for file: ${fileName}`);

        try {
            const prompt = this.generateCodeOptimizationPrompt(fileName, fileContent);

            console.log(`Making request for code optimizations with prompt length: ${prompt.length} chars`);
            const response = await this.makeRequest([
                { role: 'system', content: 'You are C3, a context-aware code assistant. Identify potential code optimization opportunities in the provided code. For each opportunity, provide the line ranges and specific suggestions for improvements. Focus on performance, readability, and best practices.' },
                { role: 'user', content: prompt }
            ]);

            console.log("Received code optimization response");

            // Parse the response to extract optimization ranges
            const content = response.data.choices[0].message.content;

            // For mock responses or testing, return some sample optimizations
            if (this.useMock) {
                return this.getMockOptimizations(fileContent);
            }

            // Try to parse the AI response to extract optimization ranges
            try {
                // Look for JSON structure in the response
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);

                if (jsonMatch && jsonMatch[1]) {
                    const optimizations = JSON.parse(jsonMatch[1]);

                    // Validate the structure
                    if (Array.isArray(optimizations)) {
                        return optimizations.map((opt, index) => ({
                            start: opt.start,
                            end: opt.end,
                            suggestion: opt.suggestion,
                            id: `opt-${index}`
                        }));
                    }
                }

                // Fallback: try to parse the structured format without JSON
                console.log("Couldn't find JSON format, trying to parse structured format");
                const optimizations: CodeRange[] = [];

                // Look for optimization sections in the format:
                // ## Optimization 1
                // **Range**: Lines 10-15
                // **Suggestion**: Lorem ipsum...
                const optimizationSections = content.match(/## Optimization \d+[\s\S]*?(?=## Optimization \d+|$)/g);

                if (optimizationSections) {
                    optimizationSections.forEach((section: string, index: number) => {
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
                                id: `opt-${index}`
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
                    suggestion: "The AI couldn't generate specific optimizations. Consider reviewing this file for performance improvements and best practices.",
                    id: 'opt-0'
                }];
            } catch (parseError) {
                console.error("Error parsing AI optimization response:", parseError);

                // Return a generic optimization
                return [{
                    start: 0,
                    end: Math.min(fileContent.length, 500),
                    suggestion: "Error parsing optimization suggestions. Please try again or review the file manually.",
                    id: 'opt-error'
                }];
            }
        } catch (error) {
            console.error('Error generating code optimizations:', error);

            // Return a generic error suggestion
            return [{
                start: 0,
                end: Math.min(fileContent.length, 500),
                suggestion: "An error occurred while generating optimization suggestions. Please try again later.",
                id: 'opt-error'
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

    private generateCodeOptimizationPrompt(fileName: string, fileContent: string): string {
        // Generate detailed prompt for code optimization
        let prompt = `## Code Optimization Request\n\n`;
        prompt += `Please analyze the following ${fileName} file for potential optimizations:\n\n`;

        // Add file content
        prompt += `### File Content\n\`\`\`\n${fileContent || 'Content not available'}\n\`\`\`\n\n`;

        // Add specific request for optimization suggestions
        prompt += `### Optimization Request\n`;
        prompt += `Please identify specific sections of code that could be optimized and provide detailed suggestions. For each optimization:\n\n`;
        prompt += `1. Identify the exact code range (as character positions, not line numbers)\n`;
        prompt += `2. Provide a specific, actionable suggestion for improvement\n`;
        prompt += `3. Explain the benefit of the optimization (performance, readability, etc.)\n\n`;

        prompt += `Return the results in the following JSON format:\n\n`;
        prompt += `\`\`\`json\n[\n  {\n    "start": 120, // Character position where optimization starts\n    "end": 250, // Character position where optimization ends\n    "suggestion": "Detailed suggestion text here"\n  },\n  // more optimizations...\n]\n\`\`\`\n\n`;

        return prompt;
    }

    // Helper to convert single file analysis to project format
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

    // Helper methods to generate AI prompts (keeping your original implementations)
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

    // Helper method for generating mock optimizations (for testing)
    // Replace the getMockOptimizations method in AIService.ts with this improved version:

    // Helper method for generating mock optimizations (for testing)
    private getMockOptimizations(fileContent: string): CodeRange[] {
        const lines = fileContent.split('\n');
        const optimizations: CodeRange[] = [];

        // First, try to find specific patterns that are good targets for optimization

        // Look for functions/methods with more than 15 lines
        let inFunction = false;
        let functionStartLine = 0;
        let functionStartPos = 0;
        let functionName = '';
        let functionLines = 0;
        let bracesCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const linePos = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);

            // Function or method declaration detection
            if (!inFunction &&
                (line.includes('function') || line.includes('=>') || line.match(/\w+\s*\([^)]*\)\s*{/)) &&
                !line.includes('};') && !line.includes('});')) {

                // Extract function name
                let nameMatch = line.match(/function\s+(\w+)/);
                if (!nameMatch) nameMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
                if (!nameMatch) nameMatch = line.match(/(\w+)\s*\(/);

                functionName = nameMatch ? nameMatch[1] : 'anonymous function';
                inFunction = true;
                functionStartLine = i;
                functionStartPos = linePos;
                functionLines = 0;
                bracesCount = line.split('{').length - line.split('}').length;
            }

            if (inFunction) {
                functionLines++;
                bracesCount += line.split('{').length - line.split('}').length;

                // End of function detection
                if (bracesCount <= 0 && line.includes('}')) {
                    inFunction = false;

                    // Long functions are candidates for refactoring
                    if (functionLines > 15) {
                        const startPos = functionStartPos;
                        const endPos = linePos + line.length;

                        optimizations.push({
                            start: startPos,
                            end: endPos,
                            suggestion: `The ${functionName} function is quite long (${functionLines} lines). Consider breaking it down into smaller, more focused functions for better readability and maintainability. Look for logical sections that could be extracted into helper functions.`,
                            id: `opt-long-function-${optimizations.length}`
                        });
                    }
                }
            }
        }

        // Look for complex conditionals (multiple && or ||)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes('if') &&
                ((line.includes('&&') && line.includes('||')) ||
                    line.match(/\|\|.*\|\|/) ||
                    line.match(/&&.*&&/))) {

                const startPos = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
                const endPos = startPos + line.length;

                optimizations.push({
                    start: startPos,
                    end: endPos,
                    suggestion: `This conditional is complex and hard to understand at a glance. Consider extracting it into a named function or variable with a descriptive name, such as:\n\nconst isValidUser = userAge > 18 && (hasPermission || isAdmin);\nif (isValidUser) { ... }`,
                    id: `opt-complex-condition-${optimizations.length}`
                });
            }
        }

        // Look for nested loops (potential O(n²) complexity)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if ((line.includes('for ') || line.includes('while')) && line.includes('(')) {
                // Check for nested loops in the next few lines
                let hasNestedLoop = false;
                let endLine = i;

                // Determine the loop body by matching braces
                let braceCount = line.split('{').length - line.split('}').length;
                for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
                    braceCount += lines[j].split('{').length - lines[j].split('}').length;

                    if ((lines[j].includes('for ') || lines[j].includes('while')) && lines[j].includes('(')) {
                        hasNestedLoop = true;
                    }

                    if (braceCount <= 0) {
                        endLine = j;
                        break;
                    }
                }

                if (hasNestedLoop) {
                    const startPos = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
                    const endPos = lines.slice(0, endLine + 1).join('\n').length;

                    optimizations.push({
                        start: startPos,
                        end: endPos,
                        suggestion: `Nested loops detected, which could lead to quadratic O(n²) time complexity. Consider if there are ways to reduce this complexity:\n\n1. Use a Map or Set for lookups instead of nested iteration\n2. Precompute values in a single pass\n3. Consider if both loops are actually necessary`,
                        id: `opt-nested-loops-${optimizations.length}`
                    });

                    // Skip ahead to avoid duplicate suggestions
                    i = endLine;
                }
            }
        }

        // Look for setState in loops (React anti-pattern)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if ((line.includes('for') || line.includes('while') || line.includes('forEach')) &&
                lines.slice(i, i + 10).some(l => l.includes('setState') || l.includes('dispatch('))) {

                const startPos = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
                const endPos = lines.slice(0, Math.min(i + 10, lines.length)).join('\n').length;

                optimizations.push({
                    start: startPos,
                    end: endPos,
                    suggestion: `State updates inside loops can cause performance issues and potentially infinite renders. Consider:\n\n1. Batching state updates outside the loop\n2. Using a reduce function to calculate the final state\n3. Using the function form of setState to ensure you're working with the latest state\n\nExample: \`\`\`\nconst newItems = items.map(item => processItem(item));\nsetItems(newItems); // Single update after the loop\n\`\`\``,
                    id: `opt-setState-in-loop-${optimizations.length}`
                });
            }
        }

        // Look for opportunities to memoize
        const memoizablePatterns = [
            { pattern: /useEffect\(\s*\(\s*\)\s*=>\s*{/g, type: 'effect-dependency' },
            { pattern: /\.filter\(.*\)\.map\(/g, type: 'chained-array' },
            { pattern: /\.reduce\(/g, type: 'expensive-calculation' }
        ];

        memoizablePatterns.forEach(({ pattern, type }) => {
            // Reset regex lastIndex
            pattern.lastIndex = 0;

            // Convert content to a single string for regex matching
            const content = lines.join('\n');
            let match;

            while ((match = pattern.exec(content)) !== null) {
                const startPos = match.index;
                // Find the end of this code block
                let endPos = startPos + match[0].length;
                if (type === 'effect-dependency') {
                    // Find the closing brace and bracket of useEffect
                    let braceCount = 1;
                    let inCallback = true;
                    for (let i = endPos; i < content.length; i++) {
                        if (content[i] === '{') braceCount++;
                        if (content[i] === '}') braceCount--;

                        if (inCallback && braceCount === 0) {
                            inCallback = false;
                            // Look for the dependency array
                            for (let j = i; j < Math.min(i + 100, content.length); j++) {
                                if (content[j] === ']') {
                                    endPos = j + 1;
                                    break;
                                }
                            }
                            break;
                        }
                    }
                } else {
                    // For other patterns, just capture a reasonable chunk of code
                    endPos = Math.min(startPos + 200, content.length);
                }

                let suggestion = '';
                switch (type) {
                    case 'effect-dependency':
                        suggestion = `This useEffect hook could benefit from optimization. Make sure:\n\n1. The dependency array includes all values referenced inside\n2. Consider using useMemo or useCallback for any functions or computed values in the dependency array\n3. If this effect runs too often, extract values that don't need to trigger reruns`;
                        break;
                    case 'chained-array':
                        suggestion = `Chained array operations like filter().map() can be inefficient for large datasets as they create intermediate arrays. Consider:\n\n1. Using a single .reduce() or .forEach() to perform both operations in one pass\n2. Memoizing the result with useMemo() if this calculation happens in a component\n3. Moving this operation outside the render function if the inputs don't change often`;
                        break;
                    case 'expensive-calculation':
                        suggestion = `This reduce operation might be computationally expensive. Consider:\n\n1. Memoizing the result with useMemo() if inputs don't change often\n2. Computing this value outside the render function if possible\n3. If this runs in a loop, consider extracting it outside the loop`;
                        break;
                }

                optimizations.push({
                    start: startPos,
                    end: endPos,
                    suggestion,
                    id: `opt-${type}-${optimizations.length}`
                });
            }
        });

        // If we found specific optimizations, return them
        if (optimizations.length > 0) {
            return optimizations;
        }

        // Fallback: if we couldn't find specific patterns, look for general code structures
        // to provide some generic optimization suggestions

        // Find a component definition
        const componentMatch = fileContent.match(/function\s+(\w+)(?:\s*:\s*React\.FC|\s*\(\s*props|\s*\(\s*\{)/);
        if (componentMatch) {
            const componentStartPos = componentMatch.index || 0;
            // Find the component body by looking for the opening brace
            const bodyMatch = fileContent.substring(componentStartPos).match(/\{/);
            if (bodyMatch) {
                const bodyStartPos = componentStartPos + (bodyMatch.index || 0);
                optimizations.push({
                    start: componentStartPos,
                    end: componentStartPos + componentMatch[0].length + 50,
                    suggestion: `This React component could benefit from performance optimization. Consider:\n\n1. Wrapping it with React.memo() to prevent unnecessary re-renders\n2. Using useMemo() for expensive calculations\n3. Using useCallback() for function props to prevent unnecessary re-creation`,
                    id: `opt-component-${optimizations.length}`
                });

                // Look for possible event handlers or callbacks
                const handlerMatch = fileContent.substring(bodyStartPos).match(/(?:const|let|var)\s+handle\w+\s*=\s*\(|\s+on\w+\s*=\s*\(/);
                if (handlerMatch) {
                    const handlerStartPos = bodyStartPos + (handlerMatch.index || 0);
                    const handlerEndPos = handlerStartPos + handlerMatch[0].length + 100;
                    optimizations.push({
                        start: handlerStartPos,
                        end: Math.min(handlerEndPos, fileContent.length),
                        suggestion: `Event handlers should be memoized with useCallback() to prevent unnecessary re-creation on every render, especially if they're passed as props to child components.\n\nExample: \`\`\`\nconst handleClick = useCallback(() => {\n  // handler logic\n}, [dependencies]);\n\`\`\``,
                        id: `opt-event-handler-${optimizations.length}`
                    });
                }
            }
        }

        // If we still don't have any optimizations, add fallback generic ones
        if (optimizations.length === 0) {
            // Find JSX
            const jsxMatch = fileContent.match(/<[A-Z][A-Za-z0-9]*|<>/);
            if (jsxMatch) {
                optimizations.push({
                    start: jsxMatch.index || 0,
                    end: (jsxMatch.index || 0) + 500,
                    suggestion: "Consider using React.memo() to prevent unnecessary re-renders of this component when its props haven't changed. This is especially important for components rendered in lists or that have expensive rendering logic.",
                    id: "opt-jsx"
                });
            }

            // Find useEffect
            const effectMatch = fileContent.match(/useEffect\(/);
            if (effectMatch) {
                optimizations.push({
                    start: effectMatch.index || 0,
                    end: (effectMatch.index || 0) + 300,
                    suggestion: "Review this useEffect's dependency array carefully. Make sure it includes all values referenced inside the effect. Missing dependencies can cause stale closures, while unnecessary dependencies can cause too many effect runs.",
                    id: "opt-effect"
                });
            }

            // Add a general optimization
            optimizations.push({
                start: 0,
                end: Math.min(500, fileContent.length),
                suggestion: "Review this code for potential performance optimizations:\n\n1. Memoize expensive calculations with useMemo()\n2. Memoize callback functions with useCallback()\n3. Prevent unnecessary re-renders with React.memo()\n4. Use proper keys for list items\n5. Move state as close as possible to where it's used",
                id: "opt-general"
            });
        }

        return optimizations;
    }
}

export default new AIService();
// Ensures file is treated as a module
export { };