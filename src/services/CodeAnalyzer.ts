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

  // New enhanced method - for multiple files
  analyzeProject(files: { name: string; content: string }[]): ProjectAnalysisResult {
    this.reset();
    
    try {
      // Analyze each file individually
      files.forEach(file => {
        const fileAnalysis = this.analyzeFile(file.name, file.content);
        this.fileAnalyses.push(fileAnalysis);
      });
      
      // Consolidate all results
      const allFunctions = this.fileAnalyses.flatMap(file => file.functions);
      const allVariables = this.fileAnalyses.flatMap(file => file.variables);
      const allImports = this.fileAnalyses.flatMap(file => file.imports);
      const allClasses = this.fileAnalyses.flatMap(file => file.classes);
      const allComponents = this.fileAnalyses.flatMap(file => file.components);
      
      // Analyze cross-file dependencies
      const allDependencies = this.analyzeCrossFileDependencies();
      
      // Calculate project-wide metrics
      const projectMetrics = this.calculateProjectMetrics();
      
      return {
        files: this.fileAnalyses,
        functions: allFunctions,
        variables: allVariables,
        imports: allImports,
        dependencies: allDependencies,
        classes: allClasses,
        components: allComponents,
        projectMetrics
      };
    } catch (error: any) {
      console.error('Error analyzing project:', error);
      return {
        files: [],
        functions: [],
        variables: [],
        imports: [],
        dependencies: [],
        classes: [],
        components: [],
        projectMetrics: this.getEmptyProjectMetrics(),
        error: error.message
      };
    }
  }

  private analyzeFile(fileName: string, code: string): FileAnalysis {
    const functions: Function[] = [];
    const variables: Variable[] = [];
    const imports: Import[] = [];
    const dependencies: Dependency[] = [];
    const classes: ClassInfo[] = [];
    const components: Component[] = [];
    
    try {
      // Parse the code into an AST
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
      });
      
      // Traverse the AST to extract information
      this.traverseAST(ast, fileName, functions, variables, imports, dependencies, classes, components);
      
      // Calculate file metrics
      const fileMetrics = this.calculateFileMetrics(code, functions, variables, dependencies, imports, classes, components);
      
      return {
        fileName,
        functions,
        variables,
        imports,
        dependencies,
        classes,
        components,
        fileMetrics
      };
    } catch (error) {
      console.error(`Error analyzing file ${fileName}:`, error);
      return {
        fileName,
        functions: [],
        variables: [],
        imports: [],
        dependencies: [],
        classes: [],
        components: [],
        fileMetrics: this.getEmptyFileMetrics()
      };
    }
  }

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
    
    // Create traverse visitor object
    const visitor: any = {
      // Extract function declarations
      FunctionDeclaration: (path: any) => {
        if (path.node.id) {
          const name = path.node.id.name;
          const isComponent = this.isReactComponent(path);
          
          // If this is a React component
          if (isComponent) {
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
      
      // Extract arrow functions
      ArrowFunctionExpression: (path: any) => {
        if (path.parent.type === 'VariableDeclarator' && t.isIdentifier(path.parent.id)) {
          const name = path.parent.id.name;
          const isComponent = this.isReactComponent(path);
          
          // If this is a React component
          if (isComponent) {
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
      
      // Extract classes
      ClassDeclaration: (path: any) => {
        if (path.node.id) {
          const name = path.node.id.name;
          currentClass = name;
          
          // Check if this is a React component
          const isComponent = this.isReactComponentClass(path);
          if (isComponent) {
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
      
      // Exit handlers
      "ClassDeclaration.exit": (path: any) => {
        if (path.node.id && path.node.id.name === currentClass) {
          currentClass = '';
          if (this.isReactComponentClass(path)) {
            inReactComponent = false;
            currentComponent = '';
          }
        }
      },
      
      "FunctionDeclaration.exit": (path: any) => {
        if (path.node.id && path.node.id.name === currentFunction) {
          currentFunction = 'global';
          if (this.isReactComponent(path)) {
            inReactComponent = false;
            currentComponent = '';
          }
        }
      },
      
      "ArrowFunctionExpression.exit": (path: any) => {
        if (path.parent.type === 'VariableDeclarator' && 
            t.isIdentifier(path.parent.id) && 
            path.parent.id.name === currentFunction) {
          currentFunction = 'global';
          if (this.isReactComponent(path)) {
            inReactComponent = false;
            currentComponent = '';
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
    traverse(ast, visitor);
  }

  private isReactHook(name: string): boolean {
    return name.startsWith('use') && /^[A-Z]/.test(name.charAt(3));
  }

  private isReactComponent(path: any): boolean {
    // Check if this returns JSX
    let returnsJSX = false;
    
    traverse(path.node, {
      ReturnStatement: (returnPath) => {
        if (returnPath.node.argument && 
            (t.isJSXElement(returnPath.node.argument) || 
             t.isJSXFragment(returnPath.node.argument))) {
          returnsJSX = true;
        }
      }
    }, path.scope);
    
    return returnsJSX;
  }

  private isReactComponentClass(path: any): boolean {
    // Check if it extends React.Component or Component
    let extendsReactComponent = false;
    
    if (path.node.superClass) {
      if (t.isIdentifier(path.node.superClass) && 
          (path.node.superClass.name === 'Component' || 
           path.node.superClass.name === 'PureComponent')) {
        extendsReactComponent = true;
      } else if (t.isMemberExpression(path.node.superClass) && 
                t.isIdentifier(path.node.superClass.object) && 
                t.isIdentifier(path.node.superClass.property) && 
                path.node.superClass.object.name === 'React' && 
                (path.node.superClass.property.name === 'Component' || 
                 path.node.superClass.property.name === 'PureComponent')) {
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
        }
      });
      
      return hasRenderMethod;
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
    let complexity = 0;
    
    // Count if/else statements
    traverse(path.node, {
      IfStatement: () => { complexity++; }
    }, path.scope);
    
    // Count loops
    traverse(path.node, {
      ForStatement: () => { complexity++; },
      WhileStatement: () => { complexity++; },
      DoWhileStatement: () => { complexity++; },
      ForInStatement: () => { complexity++; },
      ForOfStatement: () => { complexity++; }
    }, path.scope);
    
    // Count switch cases
    traverse(path.node, {
      SwitchCase: () => { complexity++; }
    }, path.scope);
    
    // Count logical expressions
    traverse(path.node, {
      LogicalExpression: () => { complexity++; }
    }, path.scope);
    
    // Count try/catch
    traverse(path.node, {
      TryStatement: () => { complexity++; }
    }, path.scope);
    
    // Add 1 for the function itself
    return complexity + 1;
  }

  private calculateMethodComplexity(node: t.ClassMethod): number {
    let complexity = 0;
    
    // Count if/else statements
    traverse(node, {
      IfStatement: () => { complexity++; }
    });
    
    // Count loops
    traverse(node, {
      ForStatement: () => { complexity++; },
      WhileStatement: () => { complexity++; },
      DoWhileStatement: () => { complexity++; },
      ForInStatement: () => { complexity++; },
      ForOfStatement: () => { complexity++; }
    });
    
    // Count switch cases
    traverse(node, {
      SwitchCase: () => { complexity++; }
    });
    
    // Count logical expressions
    traverse(node, {
      LogicalExpression: () => { complexity++; }
    });
    
    // Count try/catch
    traverse(node, {
      TryStatement: () => { complexity++; }
    });
    
    // Add 1 for the method itself
    return complexity + 1;
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