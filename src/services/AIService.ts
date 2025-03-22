import axios from 'axios';
import { ProjectAnalysisResult, FileAnalysis, AnalysisResult } from './CodeAnalyzer';

interface Message {
    role: string;
    content: string;
}

class AIService {
    private apiKey: string;
    private baseURL: string;
    private useMock: boolean;
    private model: string;

    constructor() {
        // Get the API key from environment
        this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
        this.baseURL = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-4o'; // Using the most advanced model available
        
        // Force mock mode if no API key (or for development)
        this.useMock = !this.apiKey || this.apiKey.trim() === '';
        
        // Log the mode we're running in (for debugging)
        console.log(`AIService initialized in ${this.useMock ? 'MOCK' : 'API'} mode with model: ${this.model}`);
    }

    // Original interface method
    async explainCode(code: string, analysis: AnalysisResult): Promise<string> {
        try {
            // Create a project-style analysis from the single file analysis
            const projectAnalysis = this.convertToProjectAnalysis(code, analysis);
            
            // Generate the explanation
            return await this.generateCodeExplanation(projectAnalysis);
        } catch (error) {
            console.error('Error explaining code:', error);
            return 'Error generating explanation. Check console for details.';
        }
    }

    // Original interface method
    async suggestRefactoring(code: string, analysis: AnalysisResult): Promise<string> {
        try {
            // Create a project-style analysis from the single file analysis
            const projectAnalysis = this.convertToProjectAnalysis(code, analysis);
            
            // Generate the refactoring suggestions
            return await this.generateRefactoringSuggestions(projectAnalysis);
        } catch (error) {
            console.error('Error suggesting refactoring:', error);
            return 'Error generating refactoring suggestions. Check console for details.';
        }
    }

    // Original interface method
    async answerQuestion(code: string, analysis: AnalysisResult, question: string): Promise<string> {
        try {
            // Create a project-style analysis from the single file analysis
            const projectAnalysis = this.convertToProjectAnalysis(code, analysis);
            
            // Generate the answer
            return await this.generateAnswer(projectAnalysis, question);
        } catch (error) {
            console.error('Error answering question:', error);
            return 'Error answering question. Check console for details.';
        }
    }

    // Enhanced methods for multi-file projects
    async generateCodeExplanation(project: ProjectAnalysisResult, activeFileName?: string): Promise<string> {
        try {
            let prompt = '';
            
            if (activeFileName) {
                // Generate explanation for the active file
                const activeFile = project.files.find(file => file.fileName === activeFileName);
                if (activeFile) {
                    prompt = this.generateFileExplanationPrompt(activeFile, project);
                }
            } else {
                // Generate a project overview
                prompt = this.generateProjectExplanationPrompt(project);
            }
            
            const response = await this.makeRequest([
                { role: 'system', content: 'You are C3, a context-aware code assistant. Explain the provided code in detail, focusing on business logic, architecture, dependencies, and key functionality. Use markdown formatting for structure and clarity. Include diagrams and descriptions using markdown when appropriate.' },
                { role: 'user', content: prompt }
            ]);

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error explaining code:', error);
            return 'Error generating explanation. Please check console for details.';
        }
    }

    async generateRefactoringSuggestions(project: ProjectAnalysisResult, activeFileName?: string): Promise<string> {
        try {
            let prompt = '';
            
            if (activeFileName) {
                // Generate refactoring suggestions for the active file
                const activeFile = project.files.find(file => file.fileName === activeFileName);
                if (activeFile) {
                    prompt = this.generateFileRefactoringPrompt(activeFile, project);
                }
            } else {
                // Generate project-wide refactoring suggestions
                prompt = this.generateProjectRefactoringPrompt(project);
            }
            
            const response = await this.makeRequest([
                { role: 'system', content: 'You are C3, a context-aware code assistant. You identify code smells, anti-patterns, and suggest specific, actionable refactoring steps with examples. Your refactoring suggestions should be concrete and detailed enough to implement. Focus on the most impactful improvements first. Use markdown for formatting and structure.' },
                { role: 'user', content: prompt }
            ]);

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error suggesting refactoring:', error);
            return 'Error generating refactoring suggestions. Please check console for details.';
        }
    }

    async generateAnswer(project: ProjectAnalysisResult, question: string, activeFileName?: string): Promise<string> {
        try {
            let prompt = '';
            
            if (activeFileName) {
                // Answer question about the active file
                const activeFile = project.files.find(file => file.fileName === activeFileName);
                if (activeFile) {
                    prompt = this.generateQuestionPromptForFile(activeFile, project, question);
                }
            } else {
                // Answer question about the whole project
                prompt = this.generateQuestionPromptForProject(project, question);
            }
            
            const response = await this.makeRequest([
                { role: 'system', content: 'You are C3, a context-aware code assistant. Answer questions about the provided code with specific, accurate information. Use code snippets, examples, and explanations to provide comprehensive answers. Use markdown for formatting and structure.' },
                { role: 'user', content: prompt }
            ]);

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error answering question:', error);
            return 'Error answering question. Please check console for details.';
        }
    }

    async generateOnboardingGuide(project: ProjectAnalysisResult): Promise<string> {
        try {
            const prompt = this.generateOnboardingPrompt(project);
            
            const response = await this.makeRequest([
                { role: 'system', content: 'You are C3, a context-aware code assistant. Create a comprehensive onboarding guide for new developers joining this project. Your guide should help them understand the project structure, key components, important workflows, and best practices. Use markdown for formatting and structure.' },
                { role: 'user', content: prompt }
            ]);

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error generating onboarding guide:', error);
            return 'Error generating onboarding guide. Please check console for details.';
        }
    }

    async suggestDocumentation(project: ProjectAnalysisResult, activeFileName?: string): Promise<string> {
        try {
            let prompt = '';
            
            if (activeFileName) {
                // Generate documentation for the active file
                const activeFile = project.files.find(file => file.fileName === activeFileName);
                if (activeFile) {
                    prompt = this.generateFileDocumentationPrompt(activeFile, project);
                }
            } else {
                // Generate documentation for the project
                prompt = this.generateProjectDocumentationPrompt(project);
            }
            
            const response = await this.makeRequest([
                { role: 'system', content: 'You are C3, a context-aware code assistant. Generate comprehensive documentation for the provided code. Your documentation should include purpose, usage, example calls, parameter descriptions, and return values where relevant. Use markdown for formatting and structure.' },
                { role: 'user', content: prompt }
            ]);

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error generating documentation:', error);
            return 'Error generating documentation. Please check console for details.';
        }
    }

    async makeRequest(messages: Message[]) {
        // Always use mock response if no API key is available or in development mode
        if (this.useMock) {
            console.log("Using mock response");
            return this.getMockResponse(messages);
        }

        try {
            return await axios.post(
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
        } catch (apiError) {
            console.error("API request failed:", apiError);
            console.log("Falling back to mock response");
            return this.getMockResponse(messages);
        }
    }

    // Helper to convert single file analysis to project format
    private convertToProjectAnalysis(code: string, analysis: AnalysisResult): ProjectAnalysisResult {
        // If analysis is already in the new format, return it
        if ('files' in analysis && 'projectMetrics' in analysis) {
            return analysis as unknown as ProjectAnalysisResult;
        }
        
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

    // Helper methods to generate AI prompts

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
        let mockContent = '';

        if (userMessage.includes('Explanation Request')) {
            mockContent = '## Code Explanation\n\nThis code implements the C3 (Context-Aware Code Companion) application, which is a powerful tool for analyzing, understanding, and refactoring code. The application is built with React and TypeScript, using a component-based architecture.\n\n### Main Components\n\n#### App Component\nThe App component is the main container for the application. It manages the state for:\n- The code being analyzed\n- Analysis results\n- UI state (active tabs, loading states)\n- User interactions (questions, answers)\n\nThe component is organized with a layout that includes:\n- A code input area where users can paste their code\n- A results container with tabs for different analyses\n- A metrics display showing code statistics\n\n#### DependencyVisualization Component\nThis component creates a visual representation of function dependencies using the HTML canvas. It:\n- Draws function nodes colored by complexity\n- Shows dependencies between functions as arrows\n- Provides a legend for complexity levels\n\n### Key Services\n\n#### CodeAnalyzer Service\nThis service uses Babel to parse the code into an Abstract Syntax Tree (AST) and then analyzes it to extract:\n- Functions and their complexity\n- Variables and their scope\n- Imports and dependencies\n- Metrics about the code quality\n\nIt provides a comprehensive analysis of the code structure which is then used for visualizations and AI insights.\n\n#### AI Service\nThis service interfaces with an AI model (likely OpenAI\'s GPT) to provide:\n- Human-readable explanations of the code\n- Refactoring suggestions\n- Answers to questions about the code\n\nThe service has a fallback to mock responses when no API key is available.\n\n### Architecture and Data Flow\n\n1. User inputs code via textarea\n2. When "Analyze" is clicked, CodeAnalyzer parses and processes the code\n3. Analysis results are stored in state\n4. Based on the active tab, different analyses are displayed:\n   - Explanation (AI-generated overview)\n   - Refactoring (AI suggestions)\n   - Q&A (interactive questions)\n   - Visualization (graphical representation)\n5. Metrics are displayed at the bottom\n\nThe application follows a unidirectional data flow pattern, with state management handled through React\'s useState hooks.\n\n### Notable Implementation Details\n\n- The application uses React\'s functional components with hooks\n- Error handling for code parsing and API requests\n- Canvas-based visualization of dependencies\n- Markdown support for AI-generated content\n- Responsive design with CSS media queries';
        } else if (userMessage.includes('Refactoring Request')) {
            mockContent = '## Refactoring Suggestions\n\nAfter analyzing the codebase, I\'ve identified several opportunities for improvement. Here are my recommended refactoring steps in order of priority:\n\n### 1. State Management Refactoring\n\n**Issue**: The App component is handling too much state and responsibility, making it difficult to maintain and test.\n\n**Refactoring Steps**:\n\n1. Implement React Context or Redux for global state management\n\n```typescript\n// Create a CodeContext.tsx file\nimport React, { createContext, useReducer, useContext } from \'react\';\n\ntype State = {\n  code: string;\n  analysis: AnalysisResult | null;\n  explanation: string;\n  refactoring: string;\n  // other state properties\n};\n\ntype Action = \n  | { type: \'SET_CODE\'; payload: string }\n  | { type: \'SET_ANALYSIS\'; payload: AnalysisResult | null }\n  | { type: \'SET_EXPLANATION\'; payload: string }\n  // other action types\n\nconst initialState: State = {\n  code: \'\',\n  analysis: null,\n  explanation: \'\',\n  refactoring: \'\',\n  // initialize other properties\n};\n\nconst CodeContext = createContext<{state: State; dispatch: React.Dispatch<Action>}>({\n  state: initialState,\n  dispatch: () => null\n});\n\nfunction codeReducer(state: State, action: Action): State {\n  switch (action.type) {\n    case \'SET_CODE\':\n      return { ...state, code: action.payload };\n    // handle other actions\n    default:\n      return state;\n  }\n}\n\nexport const CodeProvider: React.FC = ({ children }) => {\n  const [state, dispatch] = useReducer(codeReducer, initialState);\n  \n  return (\n    <CodeContext.Provider value={{ state, dispatch }}>\n      {children}\n    </CodeContext.Provider>\n  );\n};\n\nexport const useCodeContext = () => useContext(CodeContext);\n```\n\n2. Break the App component into smaller, more focused components:\n\n```typescript\n// App.tsx becomes much simpler\nimport React from \'react\';\nimport { CodeProvider } from \'./context/CodeContext\';\nimport Header from \'./components/Header\';\nimport CodeEditor from \'./components/CodeEditor\';\nimport ResultsPanel from \'./components/ResultsPanel\';\nimport MetricsPanel from \'./components/MetricsPanel\';\n\nfunction App() {\n  return (\n    <CodeProvider>\n      <div className="app">\n        <Header />\n        <div className="app-container">\n          <CodeEditor />\n          <ResultsPanel />\n        </div>\n        <MetricsPanel />\n      </div>\n    </CodeProvider>\n  );\n}\n\nexport default App;\n```\n\n### 2. Service Layer Improvements\n\n**Issue**: The AI Service has both API and mock implementations mixed together, and error handling is duplicated.\n\n**Refactoring Steps**:\n\n1. Apply the Strategy Pattern to separate API and mock implementations:\n\n```typescript\n// services/ai/AIServiceInterface.ts\nexport interface AIServiceInterface {\n  explainCode(code: string, analysis: any): Promise<string>;\n  suggestRefactoring(code: string, analysis: any): Promise<string>;\n  answerQuestion(code: string, analysis: any, question: string): Promise<string>;\n}\n\n// services/ai/OpenAIService.ts\nimport axios from \'axios\';\nimport { AIServiceInterface } from \'./AIServiceInterface\';\n\nexport class OpenAIService implements AIServiceInterface {\n  private apiKey: string;\n  private baseURL: string;\n  \n  constructor(apiKey: string) {\n    this.apiKey = apiKey;\n    this.baseURL = \'https://api.openai.com/v1/chat/completions\';\n  }\n  \n  // Implement methods\n}\n\n// services/ai/MockAIService.ts\nimport { AIServiceInterface } from \'./AIServiceInterface\';\n\nexport class MockAIService implements AIServiceInterface {\n  // Implement methods with mock responses\n}\n\n// services/ai/AIServiceFactory.ts\nimport { AIServiceInterface } from \'./AIServiceInterface\';\nimport { OpenAIService } from \'./OpenAIService\';\nimport { MockAIService } from \'./MockAIService\';\n\nexport class AIServiceFactory {\n  static createService(): AIServiceInterface {\n    const apiKey = process.env.REACT_APP_OPENAI_API_KEY || \'\';\n    if (apiKey && apiKey.trim() !== \'\') {\n      return new OpenAIService(apiKey);\n    }\n    return new MockAIService();\n  }\n}\n```\n\n### 3. Error Handling Improvements\n\n**Issue**: Error handling is inconsistent and often just logs to console.\n\n**Refactoring Steps**:\n\n1. Create a centralized error handling utility:\n\n```typescript\n// utils/ErrorHandler.ts\nexport class ErrorHandler {\n  static handleError(error: any, context: string): string {\n    // Log error with context\n    console.error(`Error in ${context}:`, error);\n    \n    // Format user-friendly error message\n    let userMessage = `An error occurred while ${context}.`;\n    \n    if (error.response?.status === 401) {\n      userMessage = \'Authentication failed. Please check your API key.\';\n    } else if (error.message) {\n      userMessage += ` Details: ${error.message}`;\n    }\n    \n    // Could also report to monitoring service here\n    \n    return userMessage;\n  }\n}\n```\n\n2. Apply consistent error handling throughout the app:\n\n```typescript\nimport { ErrorHandler } from \'../utils/ErrorHandler\';\n\ntry {\n  // Code that might throw\n} catch (error) {\n  const errorMessage = ErrorHandler.handleError(error, \'analyzing code\');\n  setExplanation(errorMessage);\n}\n```\n\n### 4. Improving the Visualization Component\n\n**Issue**: The DependencyVisualization component has hard-coded values and limited interactivity.\n\n**Refactoring Steps**:\n\n1. Refactor to be more configurable and interactive:\n\n```typescript\ninterface DependencyVisualizationProps {\n  analysis: AnalysisResult;\n  options?: {\n    maxFunctions?: number;\n    nodeRadius?: number;\n    colors?: {\n      lowComplexity?: string;\n      mediumComplexity?: string;\n      highComplexity?: string;\n    };\n  };\n}\n\nconst DependencyVisualization: React.FC<DependencyVisualizationProps> = ({ \n  analysis, \n  options = {} \n}) => {\n  const {\n    maxFunctions = 15,\n    nodeRadius = 30,\n    colors = {\n      lowComplexity: \'rgb(60, 255, 255)\',\n      mediumComplexity: \'rgb(60, 180, 255)\',\n      highComplexity: \'rgb(60, 60, 255)\'\n    }\n  } = options;\n  \n  // Add state for interactive features\n  const [selectedNode, setSelectedNode] = useState<string | null>(null);\n  const [zoom, setZoom] = useState<number>(1);\n  \n  // Add event handlers for canvas interactions\n  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {\n    // Detect clicked node and update selectedNode state\n  };\n  \n  // Rest of component with improved drawing logic\n}\n```\n\n### 5. Type Safety Improvements\n\n**Issue**: Some type definitions are incomplete or missing, relying on `any`.\n\n**Refactoring Steps**:\n\n1. Define comprehensive interfaces for all data structures:\n\n```typescript\n// types/index.ts\nexport interface Function {\n  name: string;\n  params: string[];\n  loc: SourceLocation;\n  complexity: number;\n}\n\nexport interface Variable {\n  name: string;\n  kind: \'var\' | \'let\' | \'const\';\n  loc: SourceLocation;\n}\n\nexport interface Import {\n  name: string;\n  source: string;\n  loc: SourceLocation;\n}\n\nexport interface Dependency {\n  caller: string;\n  callee: string;\n  loc: SourceLocation;\n}\n\nexport interface SourceLocation {\n  start: { line: number; column: number };\n  end: { line: number; column: number };\n}\n\nexport interface Metrics {\n  totalFunctions: number;\n  totalVariables: number;\n  averageComplexity: number;\n  highComplexityFunctions: number;\n  dependencies: number;\n}\n\nexport interface AnalysisResult {\n  functions: Function[];\n  variables: Variable[];\n  imports: Import[];\n  dependencies: Dependency[];\n  metrics: Metrics;\n  error?: string;\n}\n```\n\n2. Replace `any` types throughout the codebase with proper types.\n\n### Summary\n\nThese refactoring suggestions will significantly improve the maintainability, scalability, and reliability of the C3 application. The most impactful improvements are the introduction of proper state management and breaking down the monolithic App component, followed by service layer improvements that make the code more testable and modular.';
        } else if (userMessage.includes('Answer Request')) {
            const question = userMessage.includes('Question about') ? 
                userMessage.split('Question about')[1].split('"')[1] : 
                '';
            
            mockContent = `## Answer\n\n${question}\n\nBased on the code analysis, the C3 application uses a combination of React hooks for state management and external services for code analysis and AI-powered insights.\n\nThe main state management occurs in the App.tsx component using React's useState hooks. Here are the key state variables:\n\n\`\`\`typescript\nconst [code, setCode] = useState<string>("");\nconst [analysis, setAnalysis] = useState<AnalysisResult | null>(null);\nconst [explanation, setExplanation] = useState<string>("");\nconst [refactoring, setRefactoring] = useState<string>("");\nconst [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);\nconst [activeTab, setActiveTab] = useState<string>("explanation");\nconst [question, setQuestion] = useState<string>("");\nconst [answer, setAnswer] = useState<string>("");\nconst [isAskingQuestion, setIsAskingQuestion] = useState<boolean>(false);\n\`\`\`\n\nWhen a user pastes code and clicks "Analyze", the following flow occurs:\n\n1. The \`analyzeCode\` function is called\n2. It sets \`isAnalyzing\` to true (for UI loading state)\n3. It calls \`CodeAnalyzer.analyzeCode(code)\` to parse and analyze the code\n4. The analysis result is stored in state\n5. It then calls for code explanation and refactoring suggestions\n6. The results are stored in state variables\n7. Finally, \`isAnalyzing\` is set back to false\n\nThe application doesn't use Redux, Context API, or other external state management libraries. Instead, it relies on component state and props to pass data between components.\n\nThe AI-related functionality either connects to an OpenAI API or falls back to mock responses when no API key is available.\n\nThis approach works well for a single-page application of this complexity, but adopting a more structured state management solution would be beneficial for scaling the application.`;
        } else if (userMessage.includes('Onboarding Guide Request')) {
            mockContent = '# C3: Context-Aware Code Companion Onboarding Guide\n\n## Welcome to the C3 Project!\n\nThis guide will help you understand the C3 application, its architecture, and how to get started developing with it.\n\n## 1. Project Overview\n\n### What is C3?\n\nC3 (Context-Aware Code Companion) is an AI-powered developer tool that helps developers understand, navigate, and improve codebases. The application analyzes code to provide:\n\n- Plain English explanations of code functionality\n- Intelligent refactoring suggestions\n- Interactive visualizations of code dependencies\n- A Q&A interface for asking questions about the code\n\n### Key Features\n\n- **Code Analysis**: Parses and analyzes code structure using Abstract Syntax Trees (AST)\n- **AI-Powered Insights**: Generates human-readable explanations and refactoring suggestions\n- **Dependency Visualization**: Provides visual representation of function relationships\n- **Interactive Q&A**: Allows asking questions about specific parts of the code\n- **Code Metrics**: Shows statistics about code complexity and structure\n\n## 2. System Architecture\n\nC3 follows a component-based architecture using React and TypeScript. The application consists of these main parts:\n\n### Frontend (React)\n\n- **Components**: UI elements for code input, result display, and visualizations\n- **Services**: Business logic for code analysis and AI interactions\n- **CSS**: Styling for the UI components\n\n### Services\n\n- **CodeAnalyzer**: Parses and analyzes code structure using Babel\n- **AIService**: Interfaces with OpenAI API to generate insights\n\n### Data Flow\n\n1. User inputs code in the textarea\n2. Code is sent to CodeAnalyzer service\n3. Analysis results are passed to various components and AIService\n4. AIService generates explanations and suggestions\n5. Results are displayed in the UI\n\n## 3. Setup Instructions\n\n### Prerequisites\n\n- Node.js (v14 or higher)\n- npm or yarn\n- OpenAI API key (optional, app will use mock data without it)\n\n### Installation\n\n1. Clone the repository:\n   ```bash\n   git clone https://github.com/your-org/c3-app.git\n   cd c3-app\n   ```\n\n2. Install dependencies:\n   ```bash\n   npm install\n   # or\n   yarn install\n   ```\n\n3. Create a `.env` file in the root directory and add your OpenAI API key:\n   ```\n   REACT_APP_OPENAI_API_KEY=your_api_key_here\n   ```\n\n4. Start the development server:\n   ```bash\n   npm start\n   # or\n   yarn start\n   ```\n\n5. Open [http://localhost:3000](http://localhost:3000) in your browser\n\n## 4. Project Structure\n\n```\n├── public/             # Static files\n├── src/                # Source code\n│   ├── components/     # React components\n│   │   └── DependencyVisualization.tsx\n│   ├── services/       # Business logic\n│   │   ├── AIService.ts\n│   │   └── CodeAnalyzer.ts\n│   ├── App.css         # Main styles\n│   ├── App.tsx         # Main application component\n│   ├── index.css       # Global styles\n│   └── index.tsx       # Application entry point\n└── package.json        # Dependencies and scripts\n```\n\n## 5. Key Components\n\n### App.tsx\n\nThe main application component that orchestrates all functionality. It manages the state and coordinates between different services and UI components.\n\n### DependencyVisualization.tsx\n\nResponsible for rendering a visual representation of function dependencies using HTML Canvas.\n\n### CodeAnalyzer.ts\n\nParses code using Babel and traverses the AST to extract functions, variables, imports, and dependencies.\n\n### AIService.ts\n\nInterfaces with OpenAI\'s API to generate explanations, refactoring suggestions, and answers to questions.\n\n## 6. Development Workflow\n\n### Making Changes\n\n1. Create a feature branch from `main`:\n   ```bash\n   git checkout -b feature/your-feature-name\n   ```\n\n2. Make your changes\n\n3. Test your changes locally\n\n4. Submit a pull request to `main`\n\n### Code Standards\n\n- Use TypeScript for type safety\n- Follow functional React patterns with hooks\n- Include JSDoc comments for public functions and components\n- Use meaningful variable and function names\n- Keep components small and focused on a single responsibility\n\n## 7. Common Tasks\n\n### Adding a New Component\n\n1. Create a new file in `src/components/`\n2. Define your component using TypeScript and React\n3. Export the component and import it where needed\n\n### Modifying the Code Analyzer\n\nIf you need to extract additional information from the code:\n\n1. Update the relevant interfaces in `CodeAnalyzer.ts`\n2. Add new traversal logic in the `traverseAST` method\n3. Update the metrics calculation if needed\n\n### Extending AI Capabilities\n\nTo add new AI-powered features:\n\n1. Add new methods to `AIService.ts`\n2. Create appropriate prompts for the AI model\n3. Update the UI to incorporate the new functionality\n\n## 8. Troubleshooting\n\n### Common Issues\n\n- **API Key Issues**: Check that your OpenAI API key is correctly set in the `.env` file\n- **Parse Errors**: The code analyzer may fail on unsupported syntax. Look for errors in the console.\n- **UI Rendering Issues**: Check browser console for React errors\n\n### Debugging\n\n- Use browser developer tools to inspect state and component hierarchy\n- Check console logs for error messages\n- Add temporary `console.log` statements to trace execution flow\n\n## 9. Resources\n\n- [React Documentation](https://reactjs.org/docs/getting-started.html)\n- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)\n- [Babel Parser Documentation](https://babeljs.io/docs/en/babel-parser)\n- [OpenAI API Documentation](https://platform.openai.com/docs/)\n\nWelcome to the team! If you have any questions, feel free to reach out to the project maintainers.';
        } else if (userMessage.includes('Documentation Request')) {
            mockContent = '# C3: Context-Aware Code Companion Documentation\n\n## Overview\n\nC3 is an AI-powered code analysis tool designed to help developers understand, navigate, and improve codebases. This documentation provides comprehensive information about the application\'s components, services, and usage.\n\n## Table of Contents\n\n1. [Application Structure](#application-structure)\n2. [Components](#components)\n3. [Services](#services)\n4. [State Management](#state-management)\n5. [API Integration](#api-integration)\n6. [Visualization](#visualization)\n7. [Usage Guide](#usage-guide)\n\n## Application Structure\n\nThe application follows a React-based component architecture with TypeScript for type safety. The main structural elements are:\n\n- **Entry Point**: `index.tsx` - Renders the App component into the root DOM node\n- **Main Component**: `App.tsx` - The primary container component that orchestrates all functionality\n- **Components**: Reusable UI elements in the `components/` directory\n- **Services**: Business logic handlers in the `services/` directory\n- **Styles**: CSS files for styling the application\n\n## Components\n\n### App\n\n**Purpose**: Main application container that manages state and coordinates between services and UI components.\n\n**Props**: None\n\n**State**:\n- `code: string` - The current code being analyzed\n- `analysis: AnalysisResult | null` - Results of code analysis\n- `explanation: string` - AI-generated explanation of the code\n- `refactoring: string` - AI-generated refactoring suggestions\n- `isAnalyzing: boolean` - Loading state during analysis\n- `activeTab: string` - Currently selected tab\n- `question: string` - User\'s current question\n- `answer: string` - AI\'s answer to the question\n- `isAskingQuestion: boolean` - Loading state during question answering\n\n**Key Methods**:\n\n`handleCodeChange(e: React.ChangeEvent<HTMLTextAreaElement>): void`\n- **Parameters**: `e` - Change event from the textarea\n- **Description**: Updates the code state when the user types/pastes code\n- **Returns**: void\n\n`analyzeCode(): Promise<void>`\n- **Parameters**: None\n- **Description**: Analyzes the current code, generates explanations and refactoring suggestions\n- **Returns**: Promise that resolves when analysis is complete\n\n`handleAskQuestion(): Promise<void>`\n- **Parameters**: None\n- **Description**: Processes the current question and generates an answer\n- **Returns**: Promise that resolves when answer is generated\n\n**Usage Example**:\n```jsx\n<App />\n```\n\n### DependencyVisualization\n\n**Purpose**: Creates a visual representation of function dependencies using HTML Canvas.\n\n**Props**:\n- `analysis: AnalysisResult` - The code analysis result to visualize\n\n**Key Features**:\n- Draws function nodes colored by complexity\n- Shows dependencies between functions as arrows\n- Provides a legend for complexity levels\n\n**Usage Example**:\n```jsx\n<DependencyVisualization analysis={analysisResult} />\n```\n\n## Services\n\n### CodeAnalyzer\n\n**Purpose**: Parses and analyzes code to extract structure, dependencies, and metrics.\n\n**Key Methods**:\n\n`analyzeCode(code: string): AnalysisResult`\n- **Parameters**: `code` - The source code to analyze\n- **Description**: Parses the code and extracts functions, variables, imports, dependencies, and metrics\n- **Returns**: An AnalysisResult object with the analysis data\n- **Throws**: Error if the code cannot be parsed\n\n**Usage Example**:\n```typescript\nconst analysisResult = CodeAnalyzer.analyzeCode(sourceCode);\n```\n\n### AIService\n\n**Purpose**: Interfaces with AI models to generate explanations, refactoring suggestions, and answers to questions.\n\n**Key Methods**:\n\n`explainCode(code: string, analysis: any): Promise<string>`\n- **Parameters**: \n  - `code` - The source code to explain\n  - `analysis` - The analysis result from CodeAnalyzer\n- **Description**: Generates a human-readable explanation of the code\n- **Returns**: Promise that resolves to the explanation text\n\n`suggestRefactoring(code: string, analysis: any): Promise<string>`\n- **Parameters**: \n  - `code` - The source code to refactor\n  - `analysis` - The analysis result from CodeAnalyzer\n- **Description**: Generates refactoring suggestions\n- **Returns**: Promise that resolves to the refactoring suggestions text\n\n`answerQuestion(code: string, analysis: any, question: string): Promise<string>`\n- **Parameters**: \n  - `code` - The source code\n  - `analysis` - The analysis result from CodeAnalyzer\n  - `question` - The user\'s question\n- **Description**: Generates an answer to the question about the code\n- **Returns**: Promise that resolves to the answer text\n\n**Usage Example**:\n```typescript\nconst explanation = await AIService.explainCode(sourceCode, analysisResult);\nconst refactoring = await AIService.suggestRefactoring(sourceCode, analysisResult);\nconst answer = await AIService.answerQuestion(sourceCode, analysisResult, "How does this code work?");\n```\n\n## State Management\n\nThe application uses React\'s built-in useState hook for state management. All state is contained within the App component and passed to child components as props. This approach works well for the current application size but could be refactored to use Context API or Redux for larger scale.\n\n## API Integration\n\nThe application integrates with OpenAI\'s API through the AIService. It requires an API key stored in the environment variable `REACT_APP_OPENAI_API_KEY`. If no key is provided, the service falls back to using mock responses.\n\n**Configuration**:\n- Set the API key in a `.env` file: `REACT_APP_OPENAI_API_KEY=your_key_here`\n\n## Visualization\n\nThe DependencyVisualization component uses the HTML Canvas API to render a visual representation of function dependencies:\n\n- Functions are represented as circular nodes\n- Node color indicates complexity (blue gradient)\n- Arrows show dependencies between functions\n- A legend explains the complexity color coding\n\n## Usage Guide\n\n### Analyzing Code\n\n1. Paste your code into the text area\n2. Click the "Analyze Code" button\n3. Wait for the analysis to complete\n4. Navigate between tabs to see different insights:\n   - **Explanation**: AI-generated overview of the code\n   - **Refactoring**: Suggestions for improving the code\n   - **Ask Questions**: Q&A interface about the code\n   - **Visualization**: Graphical representation of dependencies\n5. View code metrics at the bottom of the page\n\n### Asking Questions\n\n1. Navigate to the "Ask Questions" tab\n2. Type your question in the input field\n3. Click "Ask"\n4. View the AI-generated answer\n\n### Interpreting Visualizations\n\n- **Blue Nodes**: Functions (darker blue indicates higher complexity)\n- **Arrows**: Function calls (A -> B means A calls B)\n- **Legend**: Shows the complexity scale from low to high\n\n## Error Handling\n\nThe application includes error handling for:\n- Code parsing errors\n- API request failures\n- Invalid user input\n\nErrors are displayed to the user and logged to the console for debugging.';
        } else {
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