import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

// Extended interface definitions
export interface Function {
  name: string;
  params: string[];
  loc: any;
  complexity: number;
  description?: string;
  returnType?: string;
  isAsync?: boolean;
  fileName?: string;
}

export interface Variable {
  name: string;
  kind: string;
  loc: any;
  fileName?: string;
  isState?: boolean;
  type?: string;
}

export interface Import {
  name: string;
  source: string;
  loc: any;
  fileName?: string;
  isLocal?: boolean;
}

export interface Dependency {
  caller: string;
  callee: string;
  loc: any;
  fileName?: string;
  callerFileName?: string;
  calleeFileName?: string;
  isCrossFile?: boolean;
}

export interface ClassInfo {
  name: string;
  methods: Function[];
  properties: Variable[];
  superClass?: string;
  fileName?: string;
  loc: any;
}

export interface Component {
  name: string;
  props: string[];
  hooks: string[];
  stateVariables: Variable[];
  effectDependencies: string[][];
  fileName?: string;
  loc: any;
}

export interface FileAnalysis {
  fileName: string;
  functions: Function[];
  variables: Variable[];
  imports: Import[];
  dependencies: Dependency[];
  classes: ClassInfo[];
  components: Component[];
  fileMetrics: FileMetrics;
  error?: string;
}

export interface FileMetrics {
  linesOfCode: number;
  totalFunctions: number;
  totalVariables: number;
  totalClasses: number;
  totalComponents: number;
  averageComplexity: number;
  highComplexityFunctions: number;
  dependencies: number;
  imports: number;
}

export interface ProjectMetrics {
  totalFiles: number;
  totalLinesOfCode: number;
  totalFunctions: number;
  totalVariables: number;
  totalClasses: number;
  totalComponents: number;
  averageComplexity: number;
  highComplexityFunctions: number;
  totalDependencies: number;
  crossFileDependencies: number;
  mostComplexFile: {
    fileName: string;
    complexity: number;
  };
  mostDependedOnFile: {
    fileName: string;
    dependencies: number;
  };
}

export interface ProjectAnalysisResult {
  files: FileAnalysis[];
  functions: Function[];
  variables: Variable[];
  imports: Import[];
  dependencies: Dependency[];
  classes: ClassInfo[];
  components: Component[];
  projectMetrics: ProjectMetrics;
  error?: string;
}

export interface AnalysisResult {
  functions: Function[];
  variables: Variable[];
  imports: Import[];
  dependencies: Dependency[];
  metrics: {
    totalFunctions: number;
    totalVariables: number;
    averageComplexity: number;
    highComplexityFunctions: number;
    dependencies: number;
  };
  error?: string;
}

class CodeAnalyzer {
  private fileAnalyses: FileAnalysis[] = [];
  private functions: Function[] = [];
  private variables: Variable[] = [];
  private imports: Import[] = [];
  private dependencies: Dependency[] = [];
  private classes: ClassInfo[] = [];
  private components: Component[] = [];
  
  constructor() {
    this.reset();
  }

  reset() {
    this.fileAnalyses = [];
    this.functions = [];
    this.variables = [];
    this.imports = [];
    this.dependencies = [];
    this.classes = [];
    this.components = [];
  }

  // Original interface method - for single file analysis
  analyzeCode(code: string): AnalysisResult {
    this.reset();
    
    try {
      // Use our enhanced file analyzer with a default filename
      const fileName = 'input.js';
      const fileAnalysis = this.analyzeFile(fileName, code);
      
      // Store the file analysis
      this.fileAnalyses = [fileAnalysis];
      this.functions = fileAnalysis.functions;
      this.variables = fileAnalysis.variables;
      this.imports = fileAnalysis.imports;
      this.dependencies = fileAnalysis.dependencies;
      
      // Calculate metrics
      const metrics = {
        totalFunctions: fileAnalysis.fileMetrics.totalFunctions,
        totalVariables: fileAnalysis.fileMetrics.totalVariables,
        averageComplexity: fileAnalysis.fileMetrics.averageComplexity,
        highComplexityFunctions: fileAnalysis.fileMetrics.highComplexityFunctions,
        dependencies: fileAnalysis.fileMetrics.dependencies
      };
      
      return {
        functions: this.functions,
        variables: this.variables,
        imports: this.imports,
        dependencies: this.dependencies,
        metrics
      };
    } catch (error: any) {
      console.error('Error analyzing code:', error);
      return {
        error: error.message,
        functions: [],
        variables: [],
        imports: [],
        dependencies: [],
        metrics: {
          totalFunctions: 0,
          totalVariables: 0,
          averageComplexity: 0,
          highComplexityFunctions: 0,
          dependencies: 0
        }
      };
    }
  }

  private logFileContentInfo(fileName: string, content: string): void {
    console.log(`File ${fileName} content info:`);
    console.log(`- Length: ${content.length} characters`);
    console.log(`- Lines: ${content.split('\n').length}`);
    
    // Log a preview of the content (first 200 chars)
    const preview = content.length > 200 
      ? content.substring(0, 197) + '...' 
      : content;
    
    console.log(`- Preview: ${preview.replace(/\n/g, ' ')}`);
    
    // Check for potential issues
    const potentialIssues = [];
    
    if (content.includes('```')) {
      potentialIssues.push('Contains Markdown code blocks');
    }
    
    if (content.includes('<script>') || content.includes('</script>')) {
      potentialIssues.push('Contains script tags');
    }
    
    if (potentialIssues.length > 0) {
      console.warn(`- Potential issues: ${potentialIssues.join(', ')}`);
    }
  }

  // New enhanced method - for multiple files
  analyzeProject(files: { 
    name: string; 
    content: string; 
    path?: string; 
    language?: string; 
    size?: number; 
    lastModified?: number 
  }[]): ProjectAnalysisResult {
    console.log(`CodeAnalyzer.analyzeProject called with ${files.length} files`);
    
    // Reset the analyzer state
    this.reset();
    console.log("Reset analyzer state");
    
    try {
      // Track successfully analyzed files and any errors
      const failedFiles: {name: string, error: string}[] = [];
      
      // Process each file individually
      files.forEach(file => {
        try {
          console.log(`Starting analysis for file: ${file.name}`);
          
          if (!file.content) {
            console.error(`File ${file.name} has no content!`);
            failedFiles.push({name: file.name, error: "No content"});
            return; // Skip to next file
          }
          
          // Add special handling for TypeScript/TSX files
          const isTSX = file.name.endsWith('.tsx') || file.name.endsWith('.jsx');
          if (isTSX) {
            console.log(`Special handling for React file: ${file.name}`);
            
            // Look for React component patterns
            if (file.content.includes('React.FC') || 
                file.content.includes('<React.') ||
                file.content.includes('extends React.Component') ||
                (file.content.includes('return (') && file.content.includes('<'))) {
              console.log("Detected likely React component patterns");
            }
          }
          
          // Log file content info for debugging
          this.logFileContentInfo(file.name, file.content);
          
          // Analyze this file
          const fileAnalysis = this.analyzeFile(file.name, file.content);
          console.log(`Successfully analyzed file: ${file.name}`);
          console.log(`Found: ${fileAnalysis.functions.length} functions, ${fileAnalysis.variables.length} variables, ${fileAnalysis.components.length} components`);
          
          // Store the analysis
          this.fileAnalyses.push(fileAnalysis);
        } catch (fileError) {
          const errorMessage = fileError instanceof Error 
            ? fileError.message 
            : String(fileError);
            
          console.error(`Error analyzing file ${file.name}:`, errorMessage);
          failedFiles.push({name: file.name, error: errorMessage});
          
          // Continue with other files even if one fails
        }
      });
      
      if (failedFiles.length > 0) {
        console.warn(`Failed to analyze ${failedFiles.length} files:`, failedFiles);
      }
      
      if (this.fileAnalyses.length === 0) {
        console.error("No files were successfully analyzed!");
        throw new Error("Failed to analyze any files. Check console for details.");
      }
      
      // Consolidate all results from the files that were successfully analyzed
      console.log("Consolidating results from all files...");
      
      // Extract all entities
      const allFunctions = this.fileAnalyses.flatMap(file => file.functions);
      const allVariables = this.fileAnalyses.flatMap(file => file.variables);
      const allImports = this.fileAnalyses.flatMap(file => file.imports);
      const allClasses = this.fileAnalyses.flatMap(file => file.classes);
      const allComponents = this.fileAnalyses.flatMap(file => file.components);
      
      console.log(`Consolidated data: ${allFunctions.length} functions, ${allVariables.length} variables, ${allClasses.length} classes, ${allComponents.length} components`);
      
      // Analyze cross-file dependencies
      console.log("Analyzing cross-file dependencies...");
      const allDependencies = this.analyzeCrossFileDependencies();
      console.log(`Found ${allDependencies.length} dependencies (${allDependencies.filter(d => d.isCrossFile).length} cross-file)`);
      
      // Calculate project-wide metrics
      console.log("Calculating project metrics...");
      const projectMetrics = this.calculateProjectMetrics();
      
      // Create the complete analysis result
      const result: ProjectAnalysisResult = {
        files: this.fileAnalyses,
        functions: allFunctions,
        variables: allVariables,
        imports: allImports,
        dependencies: allDependencies,
        classes: allClasses,
        components: allComponents,
        projectMetrics
      };
      
      // Add warnings about failed files if any
      if (failedFiles.length > 0) {
        result.error = `Warning: ${failedFiles.length} files failed to analyze. The analysis is incomplete.`;
      }
      
      console.log("Project analysis complete!");
      return result;
    } catch (error: any) {
      console.error('CRITICAL ERROR in analyzeProject:', error);
      return {
        files: [],
        functions: [],
        variables: [],
        imports: [],
        dependencies: [],
        classes: [],
        components: [],
        projectMetrics: this.getEmptyProjectMetrics(),
        error: `Analysis failed: ${error.message || 'Unknown error'}`
      };
    }
  }
  
  // Get parser plugins based on file extension
  private getParserPlugins(fileName: string): string[] {
    const plugins = ['jsx']; // Base plugins for all files
    
    // Add TypeScript support
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
      plugins.push('typescript');
    }
    
    // Add class properties and modern JS features support
    plugins.push(
      'classProperties', 
      'classPrivateProperties', 
      'classPrivateMethods',
      'decorators-legacy',
      'objectRestSpread', 
      'dynamicImport', 
      'optionalChaining', 
      'nullishCoalescingOperator'
    );
    
    return plugins;
  }
  
  // Clean potential markdown code blocks in source
  private cleanMarkdownCodeBlocks(code: string): string {
    console.log('🧹 Cleaning markdown code blocks');
    
    // Replace markdown code blocks with just their content
    let cleanedCode = code;
    const codeBlockRegex = /```(?:[a-zA-Z]+)?\n([\s\S]*?)```/g;
    
    // Fix: Instead of using matchAll, use a traditional approach
    let match;
    let matchCount = 0;
    
    while ((match = codeBlockRegex.exec(code)) !== null) {
      matchCount++;
    }
    
    if (matchCount > 0) {
      console.log(`🔍 Found ${matchCount} markdown code blocks to clean`);
      cleanedCode = code.replace(codeBlockRegex, (match, codeContent) => codeContent);
    }
    
    return cleanedCode;
  }

  // Enhanced file analysis method
  private analyzeFile(fileName: string, code: string): FileAnalysis {
    console.log(`Starting analysis for file: ${fileName}`);
    
    const functions: Function[] = [];
    const variables: Variable[] = [];
    const imports: Import[] = [];
    const dependencies: Dependency[] = [];
    const classes: ClassInfo[] = [];
    const components: Component[] = [];
    
    try {
        // Log information about the file content for debugging
        this.logFileContentInfo(fileName, code);
        
        // Check for potentially problematic content
        if (code.includes('```')) {
            console.warn(`File ${fileName} contains markdown code blocks which may cause parsing issues`);
            // Clean markdown code blocks
            code = this.cleanMarkdownCodeBlocks(code);
        }
        
        // Check if file content is valid
        if (!code || code.trim().length === 0) {
            console.error(`File ${fileName} has no content or is empty!`);
            throw new Error(`File ${fileName} is empty`);
        }
        
        // Determine file type for special handling
        const isTypeScript = fileName.endsWith('.ts') || fileName.endsWith('.tsx');
        const isReactFile = fileName.endsWith('.jsx') || fileName.endsWith('.tsx');
        
        console.log(`Analyzing file type: ${isTypeScript ? 'TypeScript' : 'JavaScript'}, React: ${isReactFile ? 'Yes' : 'No'}`);
        
        // Configure parser options based on file type
        const parserOptions: any = {
            sourceType: 'module',
            plugins: this.getParserPlugins(fileName),
            errorRecovery: true, // Continue parsing even if there are errors
        };
        
        // Parse the code into an AST
        console.log(`Parsing file: ${fileName}`);
        let ast;
        
        try {
            ast = parser.parse(code, parserOptions);
            console.log(`Successfully parsed ${fileName}`);
        } catch (parseError: any) {
            console.error(`Parse error in ${fileName}: ${parseError.message}`);
            
            // Try again with more lenient options if initial parse fails
            try {
                console.log(`Retrying parse with more lenient options...`);
                parserOptions.allowImportExportEverywhere = true;
                parserOptions.allowReturnOutsideFunction = true;
                parserOptions.allowAwaitOutsideFunction = true;
                parserOptions.allowSuperOutsideMethod = true;
                
                ast = parser.parse(code, parserOptions);
                console.log(`Lenient parse successful for ${fileName}`);
            } catch (secondError: any) {
                console.error(`Failed to parse ${fileName} even with lenient options: ${secondError.message}`);
                throw new Error(`Failed to parse ${fileName}: ${parseError.message}`);
            }
        }
        
        // Traverse the AST to extract information
        this.traverseAST(ast, fileName, functions, variables, imports, dependencies, classes, components);
        
        console.log(`AST traversal complete for ${fileName}`);
        console.log(`Found: ${functions.length} functions, ${variables.length} variables, ${classes.length} classes, ${components.length} components`);
        
        // Calculate file metrics
        const fileMetrics = this.calculateFileMetrics(code, functions, variables, dependencies, imports, classes, components);
        
        // Create and return the file analysis object
        const fileAnalysis: FileAnalysis = {
            fileName,
            functions,
            variables,
            imports,
            dependencies,
            classes,
            components,
            fileMetrics
        };
        
        console.log(`Analysis complete for file: ${fileName}`);
        return fileAnalysis;
        
    } catch (error: any) {
        console.error(`Error analyzing file ${fileName}:`, error);
        
        // Create a minimal file analysis with the error information
        const errorMetrics = this.getEmptyFileMetrics();
        errorMetrics.linesOfCode = code ? code.split('\n').length : 0;
        
        // Return a partial analysis with whatever we could extract
        return {
            fileName,
            functions,
            variables,
            imports,
            dependencies,
            classes,
            components,
            fileMetrics: errorMetrics,
            error: error instanceof Error ? error.message : String(error)
        };
    }
  }

  // Check if a file has React import
  private checkReactImportInScope(path: any): boolean {
    let hasReactImport = false;
    
    // Go up to the program level to check all imports
    let programPath = path.findParent((p: any) => p.isProgram());
    if (programPath) {
        try {
            programPath.traverse({
                ImportDeclaration(importPath: any) {
                    const source = importPath.node.source.value;
                    if (source === 'react') {
                        hasReactImport = true;
                    }
                }
            });
        } catch (error) {
            console.error("Error checking React imports:", error);
        }
    }
    
    return hasReactImport;
  }

  // Improved traverseAST method with fixed visitor pattern
  private traverseAST(
    ast: parser.ParseResult<t.File>, 
    fileName: string,
    functions: Function[],
    variables: Variable[],
    imports: Import[],
    dependencies: Dependency[],
    classes: ClassInfo[],
    components: Component[]
  ) {
    // Track the current function/class/component scope
    let currentFunction: string = 'global';
    let currentClass: string = '';
    let currentComponent: string = '';
    let inReactComponent = false;
    
    // For tracking React hooks in components
    const componentMap = new Map<string, Component>();
    
    // Create traverse visitor object with correct pattern
    const visitor: any = {
      // Extract function declarations
      FunctionDeclaration: {
        enter: (path: any) => {
          if (path.node.id) {
            const name = path.node.id.name;
            console.log(`Found function declaration: ${name}`);
            
            // Check if this is a React component - improved detection
            const isComponent = this.isReactComponent(path);
            
            // If this is a React component
            if (isComponent) {
              console.log(`Identified ${name} as a React component`);
              inReactComponent = true;
              currentComponent = name;
              
              const props = this.extractProps(path);
              const component: Component = {
                name,
                props,
                hooks: [],
                stateVariables: [],
                effectDependencies: [],
                fileName,
                loc: path.node.loc
              };
              
              components.push(component);
              componentMap.set(name, component);
            }
            
            currentFunction = name;
            
            const func: Function = {
              name,
              params: path.node.params.map((param: any) => this.getParamName(param)),
              loc: path.node.loc,
              complexity: this.calculateFunctionComplexity(path),
              isAsync: path.node.async,
              fileName
            };
            
            functions.push(func);
          }
        },
        exit: (path: any) => {
          if (path.node.id && path.node.id.name === currentFunction) {
            currentFunction = 'global';
            if (this.isReactComponent(path)) {
              inReactComponent = false;
              currentComponent = '';
            }
          }
        }
      },
      
      // Extract arrow functions
      ArrowFunctionExpression: {
        enter: (path: any) => {
          // Variable declarator (const x = () => {})
          if (path.parent.type === 'VariableDeclarator' && t.isIdentifier(path.parent.id)) {
            const name = path.parent.id.name;
            console.log(`Found arrow function in variable declaration: ${name}`);
            
            // Check for React component - improved detection
            const isComponent = this.isReactComponent(path);
            
            // If this is a React component
            if (isComponent) {
              console.log(`Identified arrow function ${name} as a React component`);
              inReactComponent = true;
              currentComponent = name;
              
              const props = this.extractProps(path);
              const component: Component = {
                name,
                props,
                hooks: [],
                stateVariables: [],
                effectDependencies: [],
                fileName,
                loc: path.node.loc
              };
              
              components.push(component);
              componentMap.set(name, component);
            }
            
            currentFunction = name;
            
            const func: Function = {
              name,
              params: path.node.params.map((param: any) => this.getParamName(param)),
              loc: path.node.loc,
              complexity: this.calculateFunctionComplexity(path),
              isAsync: path.node.async,
              fileName
            };
            
            functions.push(func);
          }
          // Export declaration (export const x = () => {})
          else if (path.parent.type === 'VariableDeclarator' && 
                   path.parent.parent?.type === 'VariableDeclaration' &&
                   path.parent.parent.parent?.type === 'ExportNamedDeclaration') {
            if (t.isIdentifier(path.parent.id)) {
              const name = path.parent.id.name;
              console.log(`Found exported arrow function: ${name}`);
              
              // Check for React component - improved detection
              const isComponent = this.isReactComponent(path);
              
              // If this is a React component
              if (isComponent) {
                console.log(`Identified exported arrow function ${name} as a React component`);
                inReactComponent = true;
                currentComponent = name;
                
                const props = this.extractProps(path);
                const component: Component = {
                  name,
                  props,
                  hooks: [],
                  stateVariables: [],
                  effectDependencies: [],
                  fileName,
                  loc: path.node.loc
                };
                
                components.push(component);
                componentMap.set(name, component);
              }
              
              currentFunction = name;
              
              const func: Function = {
                name,
                params: path.node.params.map((param: any) => this.getParamName(param)),
                loc: path.node.loc,
                complexity: this.calculateFunctionComplexity(path),
                isAsync: path.node.async,
                fileName
              };
              
              functions.push(func);
            }
          }
        },
        exit: (path: any) => {
          if (path.parent.type === 'VariableDeclarator' && 
              t.isIdentifier(path.parent.id) && 
              path.parent.id.name === currentFunction) {
            currentFunction = 'global';
            if (this.isReactComponent(path)) {
              inReactComponent = false;
              currentComponent = '';
            }
          }
        }
      },
      
      // Extract classes
      ClassDeclaration: {
        enter: (path: any) => {
          if (path.node.id) {
            const name = path.node.id.name;
            console.log(`Found class declaration: ${name}`);
            currentClass = name;
            
            // Check if this is a React component - improved detection
            const isComponent = this.isReactComponentClass(path);
            if (isComponent) {
              console.log(`Identified class ${name} as a React component`);
              inReactComponent = true;
              currentComponent = name;
              
              const component: Component = {
                name,
                props: [],
                hooks: [],
                stateVariables: [],
                effectDependencies: [],
                fileName,
                loc: path.node.loc
              };
              
              components.push(component);
              componentMap.set(name, component);
            }
            
            // Extract superclass
            let superClass = undefined;
            if (path.node.superClass && t.isIdentifier(path.node.superClass)) {
              superClass = path.node.superClass.name;
            }
            
            // Create class info object
            const classInfo: ClassInfo = {
              name,
              methods: [],
              properties: [],
              superClass,
              fileName,
              loc: path.node.loc
            };
            
            // Process class methods
            path.node.body.body.forEach((member: any) => {
              if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
                const methodName = member.key.name;
                
                const method: Function = {
                  name: `${name}.${methodName}`,
                  params: member.params.map((param: any) => this.getParamName(param)),
                  loc: member.loc,
                  complexity: this.calculateMethodComplexity(member),
                  isAsync: member.async,
                  fileName
                };
                
                classInfo.methods.push(method);
                functions.push(method);
              } else if (t.isClassProperty(member) && t.isIdentifier(member.key)) {
                const propertyName = member.key.name;
                
                const property: Variable = {
                  name: `${name}.${propertyName}`,
                  kind: 'property',
                  loc: member.loc,
                  fileName
                };
                
                classInfo.properties.push(property);
                variables.push(property);
              }
            });
            
            classes.push(classInfo);
          }
        },
        exit: (path: any) => {
          if (path.node.id && path.node.id.name === currentClass) {
            currentClass = '';
            if (this.isReactComponentClass(path)) {
              inReactComponent = false;
              currentComponent = '';
            }
          }
        }
      },
      
      // Extract variable declarations
      VariableDeclarator: (path: any) => {
        if (t.isIdentifier(path.node.id)) {
          // Get variable kind (const, let, var)
          let kind = 'var'; // default
          if (path.parent && path.parent.type === 'VariableDeclaration' && 'kind' in path.parent) {
            kind = path.parent.kind as string;
          }
          
          const name = path.node.id.name;
          
          // Check if this is a useState hook call
          let isState = false;
          let stateType = undefined;
          
          if (inReactComponent && 
              path.node.init && 
              t.isCallExpression(path.node.init) && 
              t.isIdentifier(path.node.init.callee) && 
              path.node.init.callee.name === 'useState') {
            isState = true;
            console.log(`Found useState hook call in ${currentComponent}: ${name}`);
            
            // Track state variables in the component
            const component = componentMap.get(currentComponent);
            if (component) {
              const stateVar: Variable = {
                name,
                kind,
                loc: path.node.loc,
                fileName,
                isState: true
              };
              
              component.stateVariables.push(stateVar);
              
              // Add useState to hooks if not already there
              if (!component.hooks.includes('useState')) {
                component.hooks.push('useState');
              }
            }
          }
          
          variables.push({
            name,
            kind,
            loc: path.node.loc,
            fileName,
            isState
          });
        }
      },
      
      // Extract import statements
      ImportDeclaration: (path: any) => {
        const source = path.node.source.value;
        const isLocalImport = !source.startsWith('@') && !source.includes('/') && !source.includes('.');
        
        path.node.specifiers.forEach((specifier: any) => {
          if (t.isImportSpecifier(specifier) || t.isImportDefaultSpecifier(specifier)) {
            imports.push({
              name: specifier.local.name,
              source,
              loc: path.node.loc,
              fileName,
              isLocal: isLocalImport
            });
          }
        });
      },
      
      // Track function calls to build dependencies
      CallExpression: (path: any) => {
        // Regular function calls
        if (t.isIdentifier(path.node.callee)) {
          const callee = path.node.callee.name;
          
          // Check for React hooks
          if (inReactComponent && this.isReactHook(callee)) {
            console.log(`Found React hook: ${callee} in component ${currentComponent}`);
            const component = componentMap.get(currentComponent);
            if (component && !component.hooks.includes(callee)) {
              component.hooks.push(callee);
              
              // If this is useEffect, track dependencies
              if (callee === 'useEffect' && path.node.arguments.length > 1) {
                const depsArg = path.node.arguments[1];
                if (t.isArrayExpression(depsArg)) {
                  const deps = depsArg.elements
                    .filter((element: any): element is t.Identifier => t.isIdentifier(element))
                    .map((element: t.Identifier) => element.name);
                  
                  component.effectDependencies.push(deps);
                }
              }
            }
          }
          
          dependencies.push({
            caller: currentFunction,
            callee,
            loc: path.node.loc,
            fileName,
            callerFileName: fileName,
            calleeFileName: fileName, // Will be updated later for cross-file calls
            isCrossFile: false
          });
        }
        
        // Method calls (obj.method())
        if (t.isMemberExpression(path.node.callee) && 
            t.isIdentifier(path.node.callee.property)) {
          const methodName = path.node.callee.property.name;
          let objectName = '';
          
          if (t.isIdentifier(path.node.callee.object)) {
            objectName = path.node.callee.object.name;
          }
          
          if (objectName) {
            dependencies.push({
              caller: currentFunction,
              callee: `${objectName}.${methodName}`,
              loc: path.node.loc,
              fileName,
              callerFileName: fileName,
              calleeFileName: fileName, // Will be updated later for cross-file calls
              isCrossFile: false
            });
          }
        }
      },
      
      // Track JSX elements for React component usage
      JSXElement: (path: any) => {
        const jsxName = path.node.openingElement.name;
        
        // Only track component usage (starts with uppercase)
        if (t.isJSXIdentifier(jsxName) && /^[A-Z]/.test(jsxName.name)) {
          dependencies.push({
            caller: currentFunction,
            callee: jsxName.name,
            loc: path.node.loc,
            fileName,
            callerFileName: fileName,
            calleeFileName: fileName, // Will be updated later for cross-file calls
            isCrossFile: false
          });
        }
      }
    };
    
    // Run traverse with our visitors
    try {
      traverse(ast, visitor);
    } catch (error) {
      console.error(`Error traversing AST for ${fileName}:`, error);
      // Continue with partial results
    }
  }
  
  // Improved React component detection
  private isReactComponent(path: any): boolean {
    console.log(`Checking if path is a React component`);
    
    // Direct JSX return in arrow function
    if (path.node.body && (t.isJSXElement(path.node.body) || t.isJSXFragment(path.node.body))) {
      console.log("Function body is directly a JSX element");
      return true;
    }
    
    // Check for React import in file
    const hasReactImport = this.checkReactImportInScope(path);
    
    // Get function name for PascalCase check
    const functionName = path.node.id?.name || (path.parent?.id?.name) || '';
    const isPascalCase = /^[A-Z][A-Za-z0-9]*$/.test(functionName);
    
    // Track if JSX is found in the function body
    let hasJSX = false;
    let returnsJSX = false;
    
    // Check function body for JSX and return statements
    try {
      if (path.node.body && t.isBlockStatement(path.node.body)) {
        path.traverse({
          // Track any JSX in the function
          JSXElement() { 
            hasJSX = true; 
          },
          JSXFragment() { 
            hasJSX = true; 
          },
          
          // Check return statements for JSX
          ReturnStatement(returnPath: any) {
            if (returnPath.node.argument) {
              // Direct JSX return
              if (t.isJSXElement(returnPath.node.argument) || t.isJSXFragment(returnPath.node.argument)) {
                returnsJSX = true;
              }
              // Conditional expressions that might return JSX
              else if (t.isConditionalExpression(returnPath.node.argument)) {
                if (t.isJSXElement(returnPath.node.argument.consequent) || 
                    t.isJSXElement(returnPath.node.argument.alternate) ||
                    t.isJSXFragment(returnPath.node.argument.consequent) || 
                    t.isJSXFragment(returnPath.node.argument.alternate)) {
                  returnsJSX = true;
                }
              }
              // TypeScript as expressions
              else if (t.isTSAsExpression && t.isTSAsExpression(returnPath.node.argument) && 
                      (t.isJSXElement(returnPath.node.argument.expression) || 
                       t.isJSXFragment(returnPath.node.argument.expression))) {
                returnsJSX = true;
              }
            }
          }
        });
      }
    } catch (error) {
      console.error("Error traversing function body:", error);
    }
    
    // Check TypeScript React.FC pattern
    let isTypeScriptFC = false;
    if (path.parent?.type === 'VariableDeclarator') {
      // Look for TypeScript annotations
      const id = path.parent.id;
      if (id.typeAnnotation && id.typeAnnotation.typeAnnotation) {
        const typeAnnotation = id.typeAnnotation.typeAnnotation;
        
        // Check for FC, React.FC, FunctionComponent, React.FunctionComponent
        if (typeAnnotation.type === 'TSTypeReference') {
          const typeName = typeAnnotation.typeName;
          if ((typeName.type === 'Identifier' && 
              (typeName.name === 'FC' || typeName.name === 'FunctionComponent')) ||
             (typeName.type === 'TSQualifiedName' && 
              typeName.left.name === 'React' && 
              (typeName.right.name === 'FC' || typeName.right.name === 'FunctionComponent'))) {
            isTypeScriptFC = true;
          }
        }
      }
      
      // Check for JSX.Element as return type
      if (id.typeAnnotation && id.typeAnnotation.typeAnnotation && 
          id.typeAnnotation.typeAnnotation.type === 'TSTypeReference' &&
          id.typeAnnotation.typeAnnotation.typeName.type === 'TSQualifiedName' &&
          id.typeAnnotation.typeAnnotation.typeName.left.name === 'JSX' &&
          id.typeAnnotation.typeAnnotation.typeName.right.name === 'Element') {
        isTypeScriptFC = true;
      }
    }
    
    // Decision making for component detection
    if (returnsJSX) {
      console.log("Function returns JSX - it's a component");
      return true;
    }
    
    if (isTypeScriptFC) {
      console.log("Function has React.FC type annotation - it's a component");
      return true;
    }
    
    if (isPascalCase && hasJSX) {
      console.log("Function uses PascalCase naming and contains JSX - it's likely a component");
      return true;
    }
    
    if (hasReactImport && isPascalCase) {
      console.log("Function uses PascalCase naming in a file with React import - might be a component");
      return true;
    }
    
    // For exported functions with PascalCase, assume they might be components
    if (isPascalCase && 
        path.parent?.type === 'VariableDeclarator' && 
        path.parent.parent?.type === 'VariableDeclaration' &&
        path.parent.parent.parent?.type === 'ExportNamedDeclaration') {
      console.log("Exported PascalCase function - might be a component");
      return true;
    }
    
    return false;
  }

  private isReactHook(name: string): boolean {
    return name.startsWith('use') && /^[A-Z]/.test(name.charAt(3));
  }

  private isReactComponentClass(path: any): boolean {
    // Check if it extends React.Component or Component
    let extendsReactComponent = false;
    
    if (path.node.superClass) {
      if (t.isIdentifier(path.node.superClass) && 
          (path.node.superClass.name === 'Component' || 
           path.node.superClass.name === 'PureComponent')) {
        console.log(`Class extends Component directly`);
        extendsReactComponent = true;
      } else if (t.isMemberExpression(path.node.superClass) && 
                t.isIdentifier(path.node.superClass.object) && 
                t.isIdentifier(path.node.superClass.property) && 
                path.node.superClass.object.name === 'React' && 
                (path.node.superClass.property.name === 'Component' || 
                 path.node.superClass.property.name === 'PureComponent')) {
        console.log(`Class extends React.Component`);
        extendsReactComponent = true;
      }
    }
    
    // If it extends Component, check if it has a render method
    if (extendsReactComponent) {
      let hasRenderMethod = false;
      
      path.node.body.body.forEach((member: any) => {
        if (t.isClassMethod(member) && 
            t.isIdentifier(member.key) && 
            member.key.name === 'render') {
          hasRenderMethod = true;
          console.log("Found render method in React class component");
        }
      });
      
      return hasRenderMethod;
    }
    
    // Additional check for classes that have a render method and use JSX
    let hasRenderMethod = false;
    let hasJSXInRender = false;
    
    path.node.body.body.forEach((member: any) => {
      if (t.isClassMethod(member) && 
          t.isIdentifier(member.key) && 
          member.key.name === 'render') {
        
        hasRenderMethod = true;
        
        // Check for JSX in render method
        try {
          traverse(member, {
            JSXElement() { hasJSXInRender = true; },
            JSXFragment() { hasJSXInRender = true; }
          });
        } catch (error) {
          console.error("Error traversing render method:", error);
        }
      }
    });
    
    // If it has a render method with JSX but doesn't explicitly extend Component
    if (hasRenderMethod && hasJSXInRender) {
      console.log("Found class with render method returning JSX - likely a component");
      return true;
    }
    
    return false;
  }

  private extractProps(path: any): string[] {
    const props: string[] = [];
    
    // Handle destructured props in function parameters
    if (path.node.params.length > 0) {
      const firstParam = path.node.params[0];
      
      if (t.isObjectPattern(firstParam)) {
        firstParam.properties.forEach((prop: any) => {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
            props.push(prop.key.name);
          } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
            props.push(`...${prop.argument.name}`);
          }
        });
      } else if (t.isIdentifier(firstParam)) {
        // Track non-destructured props parameter
        props.push(firstParam.name);
      }
    }
    
    // Check for TypeScript PropTypes annotation
    if (path.parent?.type === 'VariableDeclarator' && 
        path.parent.id.typeAnnotation && 
        path.parent.id.typeAnnotation.typeAnnotation &&
        path.parent.id.typeAnnotation.typeAnnotation.typeParameters &&
        path.parent.id.typeAnnotation.typeAnnotation.typeParameters.params &&
        path.parent.id.typeAnnotation.typeAnnotation.typeParameters.params.length > 0) {
      
      const propsType = path.parent.id.typeAnnotation.typeAnnotation.typeParameters.params[0];
      
      if (propsType.type === 'TSTypeLiteral' && propsType.members) {
        // Extract prop names from type literal
        propsType.members.forEach((member: any) => {
          if (member.type === 'TSPropertySignature' && member.key) {
            if (member.key.type === 'Identifier') {
              props.push(member.key.name);
            }
          }
        });
      }
    }
    
    return props;
  }

  private getParamName(param: any): string {
    if (t.isIdentifier(param)) {
      return param.name;
    } else if (t.isObjectPattern(param)) {
      return '{...}';
    } else if (t.isArrayPattern(param)) {
      return '[...]';
    } else if (t.isRestElement(param)) {
      if (t.isIdentifier(param.argument)) {
        return `...${param.argument.name}`;
      }
      return '...rest';
    }
    return 'unknown';
  }

  private calculateFunctionComplexity(path: any): number {
    let complexity = 1; // Start with 1 for the function itself
    
    try {
      // Count if/else statements
      path.traverse({
        IfStatement() { complexity++; },
        ForStatement() { complexity++; },
        WhileStatement() { complexity++; },
        DoWhileStatement() { complexity++; },
        ForInStatement() { complexity++; },
        ForOfStatement() { complexity++; },
        SwitchCase() { complexity++; },
        LogicalExpression() { complexity++; },
        TryStatement() { complexity++; }
      });
    } catch (error) {
      console.error("Error calculating function complexity:", error);
    }
    
    return complexity;
  }

  private calculateMethodComplexity(node: t.ClassMethod): number {
    let complexity = 1; // Start with 1 for the method itself
    
    try {
      // Count if/else statements
      traverse(node, {
        IfStatement() { complexity++; },
        ForStatement() { complexity++; },
        WhileStatement() { complexity++; },
        DoWhileStatement() { complexity++; },
        ForInStatement() { complexity++; },
        ForOfStatement() { complexity++; },
        SwitchCase() { complexity++; },
        LogicalExpression() { complexity++; },
        TryStatement() { complexity++; }
      });
    } catch (error) {
      console.error("Error calculating method complexity:", error);
    }
    
    return complexity;
  }

  private analyzeCrossFileDependencies(): Dependency[] {
    const allDependencies: Dependency[] = [];
    const functionMap = new Map<string, string>();
    
    // Build a map of function names to file names
    this.fileAnalyses.forEach(file => {
      file.functions.forEach(func => {
        functionMap.set(func.name, file.fileName);
      });
    });
    
    // Update dependencies with cross-file information
    this.fileAnalyses.forEach(file => {
      file.dependencies.forEach(dep => {
        const calleeFileName = functionMap.get(dep.callee);
        
        if (calleeFileName && calleeFileName !== file.fileName) {
          // This is a cross-file dependency
          const updatedDep: Dependency = {
            ...dep,
            calleeFileName,
            isCrossFile: true
          };
          
          allDependencies.push(updatedDep);
        } else {
          allDependencies.push(dep);
        }
      });
    });
    
    return allDependencies;
  }

  private calculateFileMetrics(
    code: string,
    functions: Function[],
    variables: Variable[],
    dependencies: Dependency[],
    imports: Import[],
    classes: ClassInfo[],
    components: Component[]
  ): FileMetrics {
    const linesOfCode = code.split('\n').length;
    const totalFunctions = functions.length;
    const totalVariables = variables.length;
    const totalClasses = classes.length;
    const totalComponents = components.length;
    
    const totalComplexity = functions.reduce((sum, fn) => sum + fn.complexity, 0);
    const averageComplexity = totalFunctions ? totalComplexity / totalFunctions : 0;
    const highComplexityFunctions = functions.filter(fn => fn.complexity > 5).length;
    
    return {
      linesOfCode,
      totalFunctions,
      totalVariables,
      totalClasses,
      totalComponents,
      averageComplexity,
      highComplexityFunctions,
      dependencies: dependencies.length,
      imports: imports.length
    };
  }

  private calculateProjectMetrics(): ProjectMetrics {
    const totalFiles = this.fileAnalyses.length;
    const totalLinesOfCode = this.fileAnalyses.reduce((sum, file) => sum + file.fileMetrics.linesOfCode, 0);
    const totalFunctions = this.fileAnalyses.reduce((sum, file) => sum + file.fileMetrics.totalFunctions, 0);
    const totalVariables = this.fileAnalyses.reduce((sum, file) => sum + file.fileMetrics.totalVariables, 0);
    const totalClasses = this.fileAnalyses.reduce((sum, file) => sum + file.fileMetrics.totalClasses, 0);
    const totalComponents = this.fileAnalyses.reduce((sum, file) => sum + file.fileMetrics.totalComponents, 0);
    
    const totalComplexity = this.fileAnalyses.reduce((sum, file) => {
      return sum + file.functions.reduce((fSum, fn) => fSum + fn.complexity, 0);
    }, 0);
    
    const averageComplexity = totalFunctions ? totalComplexity / totalFunctions : 0;
    const highComplexityFunctions = this.fileAnalyses.reduce(
      (sum, file) => sum + file.fileMetrics.highComplexityFunctions, 0
    );
    
    const totalDependencies = this.fileAnalyses.reduce(
      (sum, file) => sum + file.fileMetrics.dependencies, 0
    );
    
    const crossFileDependencies = this.fileAnalyses.reduce((sum, file) => {
      return sum + file.dependencies.filter(dep => dep.isCrossFile).length;
    }, 0);
    
    // Find most complex file
    let mostComplexFile = { fileName: '', complexity: 0 };
    let mostDependedOnFile = { fileName: '', dependencies: 0 };
    
    this.fileAnalyses.forEach(file => {
      const fileComplexity = file.functions.reduce((sum, fn) => sum + fn.complexity, 0);
      
      if (fileComplexity > mostComplexFile.complexity) {
        mostComplexFile = {
          fileName: file.fileName,
          complexity: fileComplexity
        };
      }
      
      // Count how many dependencies point to functions in this file
      const dependenciesOnFile = this.fileAnalyses.reduce((sum, otherFile) => {
        return sum + otherFile.dependencies.filter(dep => dep.calleeFileName === file.fileName).length;
      }, 0);
      
      if (dependenciesOnFile > mostDependedOnFile.dependencies) {
        mostDependedOnFile = {
          fileName: file.fileName,
          dependencies: dependenciesOnFile
        };
      }
    });
    
    return {
      totalFiles,
      totalLinesOfCode,
      totalFunctions,
      totalVariables,
      totalClasses,
      totalComponents,
      averageComplexity,
      highComplexityFunctions,
      totalDependencies,
      crossFileDependencies,
      mostComplexFile,
      mostDependedOnFile
    };
  }

  private getEmptyFileMetrics(): FileMetrics {
    return {
      linesOfCode: 0,
      totalFunctions: 0,
      totalVariables: 0,
      totalClasses: 0,
      totalComponents: 0,
      averageComplexity: 0,
      highComplexityFunctions: 0,
      dependencies: 0,
      imports: 0
    };
  }

  private getEmptyProjectMetrics(): ProjectMetrics {
    return {
      totalFiles: 0,
      totalLinesOfCode: 0,
      totalFunctions: 0,
      totalVariables: 0,
      totalClasses: 0,
      totalComponents: 0,
      averageComplexity: 0,
      highComplexityFunctions: 0,
      totalDependencies: 0,
      crossFileDependencies: 0,
      mostComplexFile: {
        fileName: '',
        complexity: 0
      },
      mostDependedOnFile: {
        fileName: '',
        dependencies: 0
      }
    };
  }
}

export default new CodeAnalyzer();
// Ensures file is treated as a module
export {};