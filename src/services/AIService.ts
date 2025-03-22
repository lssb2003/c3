import axios from 'axios';
import { ProjectAnalysisResult, FileAnalysis, AnalysisResult } from './CodeAnalyzer';

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
    answer: 'Based on the code analysis, the C3 application uses a combination of React hooks for state management and external services for code analysis and AI-powered insights...'
};

class AIService {
    private apiKey: string;
    private baseURL: string;
    private useMock: boolean;
    private model: string;

    constructor() {
        console.log('🔍 AIService constructor called');
        
        // Get the API key from environment
        this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
        console.log(`🔑 API Key presence: ${this.apiKey ? 'Key exists (length: ' + this.apiKey.length + ')' : 'No key found'}`);
        
        this.baseURL = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-3.5-turbo'; // Using the most advanced model available
        
        // Force mock mode if no API key (or for development)
        this.useMock = !this.apiKey || this.apiKey.trim() === '';
        
        // Log the mode we're running in (for debugging)
        console.log(`🤖 AIService initialized in ${this.useMock ? 'MOCK' : 'API'} mode with model: ${this.model}`);
        
        // Check environment variables accessibility
        console.log('🌍 Available environment variables:', Object.keys(process.env)
            .filter(key => key.startsWith('REACT_APP_'))
            .join(', '));
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
            functions: analysis.functions.map(fn => ({...fn, fileName: 'input.js'})),
            variables: analysis.variables.map(v => ({...v, fileName: 'input.js'})),
            imports: analysis.imports.map(imp => ({...imp, fileName: 'input.js'})),
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
        project.files.forEach(file => {
            const fileContent = this.getFileContent(file.fileName);
            const preview = fileContent ? fileContent.slice(0, 200) + '...' : 'Content not available';
            
            prompt += `#### ${file.fileName}\n\`\`\`\n${preview}\n\`\`\`\n\n`;
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
        
        // Add file content summaries
        prompt += `### File Content Summaries\n`;
        project.files.forEach(file => {
            const fileContent = this.getFileContent(file.fileName);
            const preview = fileContent ? fileContent.slice(0, 200) + '...' : 'Content not available';
            
            prompt += `#### ${file.fileName}\n\`\`\`\n${preview}\n\`\`\`\n\n`;
        });
        
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
        let filesByDirectory: {[dir: string]: string[]} = {};
        
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
        
        // Add file content summaries
        prompt += `### File Summaries\n`;
        project.files.forEach(file => {
            const fileContent = this.getFileContent(file.fileName);
            const preview = fileContent ? fileContent.slice(0, 200) + '...' : 'Content not available';
            
            prompt += `#### ${file.fileName}\n\`\`\`\n${preview}\n\`\`\`\n\n`;
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
        let filesByDirectory: {[dir: string]: string[]} = {};
        
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
        
        // Add file content summaries
        prompt += `### File Summaries\n`;
        project.files.forEach(file => {
            const fileContent = this.getFileContent(file.fileName);
            const preview = fileContent ? fileContent.slice(0, 200) + '...' : 'Content not available';
            
            prompt += `#### ${file.fileName}\n\`\`\`\n${preview}\n\`\`\`\n\n`;
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

    // Helper to get the file content
    private getFileContent(fileName: string): string {
        // In a real implementation, this would read from a file storage
        // For now, we'll just return a placeholder
        return `// Content for ${fileName}\n// This is a placeholder in the mock implementation\n// In a real implementation, this would be the actual file content`;
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
}

export default new AIService();
// Ensures file is treated as a module
export {};