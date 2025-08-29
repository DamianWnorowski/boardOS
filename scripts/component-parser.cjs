#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

/**
 * Advanced TypeScript AST-based React Component Parser
 * 
 * Replaces regex-based parsing with sophisticated TypeScript compiler API
 * for accurate component detection and prop extraction
 */

class ComponentParser {
  constructor() {
    this.components = [];
    this.interfaces = new Map();
    this.typeAliases = new Map();
    this.compilerOptions = {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      strict: false,
      skipLibCheck: true
    };
  }

  /**
   * Parse all components in a directory
   */
  async parseDirectory(dirPath) {
    console.log(`🔍 Parsing components in: ${dirPath}`);
    
    this.components = [];
    this.interfaces.clear();
    this.typeAliases.clear();
    
    await this.walkDirectory(dirPath);
    
    console.log(`✅ Found ${this.components.length} components`);
    return this.components;
  }

  /**
   * Recursively walk directory and parse TypeScript/TSX files
   */
  async walkDirectory(dir) {
    try {
      const items = await fs.promises.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.promises.stat(fullPath);
        
        if (stat.isDirectory()) {
          await this.walkDirectory(fullPath);
        } else if (this.isComponentFile(fullPath)) {
          await this.parseFile(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to parse directory ${dir}: ${error.message}`);
    }
  }

  /**
   * Check if file is a component file
   */
  isComponentFile(filePath) {
    return /\.(tsx|ts)$/.test(filePath) && 
           !filePath.includes('.test.') &&
           !filePath.includes('.spec.') &&
           !filePath.includes('__tests__');
  }

  /**
   * Parse a single TypeScript file
   */
  async parseFile(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      // First pass: collect interfaces and type aliases
      this.collectTypes(sourceFile);
      
      // Second pass: find components
      this.findComponents(sourceFile, filePath);
      
    } catch (error) {
      console.warn(`⚠️  Failed to parse ${filePath}: ${error.message}`);
    }
  }

  /**
   * Collect interface and type alias definitions
   */
  collectTypes(sourceFile) {
    const visit = (node) => {
      if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        this.interfaces.set(name, node);
      } else if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.text;
        this.typeAliases.set(name, node);
      }
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
  }

  /**
   * Find React components in the source file
   */
  findComponents(sourceFile, filePath) {
    const visit = (node) => {
      // Check for various component patterns
      const component = this.tryExtractComponent(node, sourceFile, filePath);
      if (component) {
        this.components.push(component);
      }
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
  }

  /**
   * Try to extract component information from a node
   */
  tryExtractComponent(node, sourceFile, filePath) {
    // Pattern 1: export const Component = (props) => JSX
    if (ts.isVariableStatement(node) && this.hasExportModifier(node)) {
      return this.extractFromVariableStatement(node, sourceFile, filePath);
    }
    
    // Pattern 2: export function Component() { return JSX }
    if (ts.isFunctionDeclaration(node) && this.hasExportModifier(node)) {
      return this.extractFromFunctionDeclaration(node, sourceFile, filePath);
    }
    
    // Pattern 3: export default Component
    if (ts.isExportAssignment(node)) {
      return this.extractFromExportAssignment(node, sourceFile, filePath);
    }
    
    return null;
  }

  /**
   * Extract component from variable statement (const Component = ...)
   */
  extractFromVariableStatement(node, sourceFile, filePath) {
    const declaration = node.declarationList.declarations[0];
    if (!declaration || !declaration.name || !ts.isIdentifier(declaration.name)) {
      return null;
    }
    
    const name = declaration.name.text;
    const initializer = declaration.initializer;
    
    // Check if it's a React component (arrow function returning JSX)
    if (!this.isReactComponent(initializer)) {
      return null;
    }
    
    // Also look for type annotations on the variable
    let props = this.extractProps(initializer);
    if (props.length === 0 && declaration.type) {
      props = this.extractPropsFromTypeAnnotation(declaration.type);
    }
    
    return {
      name,
      displayName: name,
      type: this.getComponentType(initializer),
      filePath,
      fileName: path.basename(filePath),
      isDefaultExport: false,
      isNamedExport: true,
      props,
      description: this.extractJSDocDescription(node),
      category: this.categorizeComponent(filePath),
      lineNumber: sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1,
      dependencies: this.extractImports(sourceFile),
      hasJSDoc: this.hasJSDoc(node)
    };
  }

  /**
   * Extract component from function declaration
   */
  extractFromFunctionDeclaration(node, sourceFile, filePath) {
    if (!node.name || !ts.isIdentifier(node.name)) {
      return null;
    }
    
    const name = node.name.text;
    
    // Check if it returns JSX
    if (!this.functionReturnsJSX(node)) {
      return null;
    }
    
    return {
      name,
      displayName: name,
      type: 'function',
      filePath,
      fileName: path.basename(filePath),
      isDefaultExport: this.hasDefaultModifier(node),
      isNamedExport: this.hasExportModifier(node) && !this.hasDefaultModifier(node),
      props: this.extractPropsFromFunction(node),
      description: this.extractJSDocDescription(node),
      category: this.categorizeComponent(filePath),
      lineNumber: sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1,
      dependencies: this.extractImports(sourceFile),
      hasJSDoc: this.hasJSDoc(node)
    };
  }

  /**
   * Extract component from export assignment (export default ...)
   */
  extractFromExportAssignment(node, sourceFile, filePath) {
    if (!node.expression || !ts.isIdentifier(node.expression)) {
      return null;
    }
    
    const name = node.expression.text;
    
    return {
      name,
      displayName: name,
      type: 'exported',
      filePath,
      fileName: path.basename(filePath),
      isDefaultExport: true,
      isNamedExport: false,
      props: [],
      description: this.extractJSDocDescription(node),
      category: this.categorizeComponent(filePath),
      lineNumber: sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1,
      dependencies: this.extractImports(sourceFile),
      hasJSDoc: this.hasJSDoc(node)
    };
  }

  /**
   * Check if node has export modifier
   */
  hasExportModifier(node) {
    return node.modifiers && 
           node.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
  }

  /**
   * Check if node has default modifier
   */
  hasDefaultModifier(node) {
    return node.modifiers && 
           node.modifiers.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword);
  }

  /**
   * Check if initializer is a React component
   */
  isReactComponent(initializer) {
    if (!initializer) return false;
    
    // Arrow function: () => JSX
    if (ts.isArrowFunction(initializer)) {
      return this.arrowFunctionReturnsJSX(initializer);
    }
    
    // Function expression: function() { return JSX }
    if (ts.isFunctionExpression(initializer)) {
      return this.functionReturnsJSX(initializer);
    }
    
    // React.memo, React.forwardRef, etc.
    if (ts.isCallExpression(initializer)) {
      return this.isReactHOC(initializer);
    }
    
    return false;
  }

  /**
   * Check if arrow function returns JSX
   */
  arrowFunctionReturnsJSX(node) {
    if (!node.body) return false;
    
    // Direct JSX return: () => <div />
    if (ts.isJsxElement(node.body) || ts.isJsxSelfClosingElement(node.body)) {
      return true;
    }
    
    // Block with return: () => { return <div /> }
    if (ts.isBlock(node.body)) {
      return this.blockReturnsJSX(node.body);
    }
    
    return false;
  }

  /**
   * Check if function returns JSX
   */
  functionReturnsJSX(node) {
    if (!node.body || !ts.isBlock(node.body)) {
      return false;
    }
    
    return this.blockReturnsJSX(node.body);
  }

  /**
   * Check if block returns JSX
   */
  blockReturnsJSX(block) {
    const returnStatements = [];
    
    const visit = (node) => {
      if (ts.isReturnStatement(node)) {
        returnStatements.push(node);
      }
      ts.forEachChild(node, visit);
    };
    
    visit(block);
    
    return returnStatements.some(stmt => 
      stmt.expression && (
        ts.isJsxElement(stmt.expression) || 
        ts.isJsxSelfClosingElement(stmt.expression) ||
        ts.isJsxFragment(stmt.expression)
      )
    );
  }

  /**
   * Check if call expression is React HOC
   */
  isReactHOC(node) {
    if (!node.expression) return false;
    
    const expr = node.expression;
    
    // React.memo, React.forwardRef
    if (ts.isPropertyAccessExpression(expr)) {
      const obj = expr.expression;
      const prop = expr.name;
      
      if (ts.isIdentifier(obj) && obj.text === 'React' && ts.isIdentifier(prop)) {
        return ['memo', 'forwardRef'].includes(prop.text);
      }
    }
    
    return false;
  }

  /**
   * Get component type
   */
  getComponentType(initializer) {
    if (ts.isArrowFunction(initializer)) return 'arrow';
    if (ts.isFunctionExpression(initializer)) return 'function';
    if (ts.isCallExpression(initializer)) {
      const expr = initializer.expression;
      if (ts.isPropertyAccessExpression(expr)) {
        return expr.name.text; // 'memo', 'forwardRef', etc.
      }
    }
    return 'unknown';
  }

  /**
   * Extract props from component
   */
  extractProps(initializer) {
    if (ts.isArrowFunction(initializer)) {
      return this.extractPropsFromFunction(initializer);
    }
    if (ts.isFunctionExpression(initializer)) {
      return this.extractPropsFromFunction(initializer);
    }
    return [];
  }

  /**
   * Extract props from function parameters
   */
  extractPropsFromFunction(node) {
    if (!node.parameters || node.parameters.length === 0) {
      return [];
    }
    
    const propsParam = node.parameters[0];
    if (!propsParam.type) return [];
    
    // Handle different prop type patterns
    if (ts.isTypeReferenceNode(propsParam.type)) {
      return this.extractPropsFromTypeReference(propsParam.type);
    }
    
    if (ts.isTypeLiteralNode(propsParam.type)) {
      return this.extractPropsFromTypeLiteral(propsParam.type);
    }
    
    return [];
  }

  /**
   * Extract props from type reference (MyComponentProps)
   */
  extractPropsFromTypeReference(typeRef) {
    if (!ts.isIdentifier(typeRef.typeName)) return [];
    
    const typeName = typeRef.typeName.text;
    
    // Look up interface or type alias
    const interfaceDecl = this.interfaces.get(typeName);
    if (interfaceDecl) {
      return this.extractPropsFromInterface(interfaceDecl);
    }
    
    const typeAlias = this.typeAliases.get(typeName);
    if (typeAlias) {
      return this.extractPropsFromTypeAlias(typeAlias);
    }
    
    return [];
  }

  /**
   * Extract props from interface declaration
   */
  extractPropsFromInterface(interfaceDecl) {
    const props = [];
    
    for (const member of interfaceDecl.members) {
      if (ts.isPropertySignature(member)) {
        const prop = this.extractPropFromPropertySignature(member);
        if (prop) props.push(prop);
      }
    }
    
    return props;
  }

  /**
   * Extract props from type literal
   */
  extractPropsFromTypeLiteral(typeLiteral) {
    const props = [];
    
    for (const member of typeLiteral.members) {
      if (ts.isPropertySignature(member)) {
        const prop = this.extractPropFromPropertySignature(member);
        if (prop) props.push(prop);
      }
    }
    
    return props;
  }

  /**
   * Extract props from type alias
   */
  extractPropsFromTypeAlias(typeAlias) {
    if (ts.isTypeLiteralNode(typeAlias.type)) {
      return this.extractPropsFromTypeLiteral(typeAlias.type);
    }
    return [];
  }

  /**
   * Extract single prop from property signature
   */
  extractPropFromPropertySignature(member) {
    if (!member.name || !ts.isIdentifier(member.name)) return null;
    
    const name = member.name.text;
    const required = !member.questionToken;
    const type = member.type ? this.getTypeString(member.type) : 'any';
    const description = this.extractJSDocFromMember(member);
    
    return {
      name,
      type,
      required,
      description
    };
  }

  /**
   * Get type string from TypeScript type node
   */
  getTypeString(typeNode) {
    if (ts.isKeywordTypeNode(typeNode)) {
      return ts.SyntaxKind[typeNode.kind].toLowerCase().replace('keyword', '');
    }
    
    if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
      return typeNode.typeName.text;
    }
    
    if (ts.isLiteralTypeNode(typeNode)) {
      return typeNode.literal.getText();
    }
    
    if (ts.isArrayTypeNode(typeNode)) {
      return `${this.getTypeString(typeNode.elementType)}[]`;
    }
    
    if (ts.isUnionTypeNode(typeNode)) {
      return typeNode.types.map(t => this.getTypeString(t)).join(' | ');
    }
    
    return 'unknown';
  }

  /**
   * Extract JSDoc description from node
   */
  extractJSDocDescription(node) {
    const jsDocTags = ts.getJSDocTags(node);
    if (!jsDocTags || jsDocTags.length === 0) return '';
    
    const jsDoc = jsDocTags.find(tag => !tag.tagName);
    return jsDoc ? jsDoc.comment || '' : '';
  }

  /**
   * Extract JSDoc from member
   */
  extractJSDocFromMember(member) {
    const jsDoc = ts.getJSDocTags(member);
    return jsDoc && jsDoc.length > 0 ? jsDoc[0].comment || '' : '';
  }

  /**
   * Check if node has JSDoc
   */
  hasJSDoc(node) {
    const jsDoc = ts.getJSDocTags(node);
    return jsDoc && jsDoc.length > 0;
  }

  /**
   * Extract imports from source file
   */
  extractImports(sourceFile) {
    const imports = [];
    
    const visit = (node) => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push(node.moduleSpecifier.text);
      }
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return imports;
  }

  /**
   * Extract props from type annotation
   */
  extractPropsFromTypeAnnotation(typeAnnotation) {
    // Handle React.FC<PropsType>
    if (ts.isTypeReferenceNode(typeAnnotation) && 
        ts.isQualifiedName(typeAnnotation.typeName) &&
        typeAnnotation.typeName.left.text === 'React' &&
        typeAnnotation.typeName.right.text === 'FC' &&
        typeAnnotation.typeArguments && 
        typeAnnotation.typeArguments.length > 0) {
      return this.extractPropsFromTypeReference(typeAnnotation.typeArguments[0]);
    }
    return [];
  }

  /**
   * Categorize component based on file path
   */
  categorizeComponent(filePath) {
    if (filePath.includes('\\board\\') || filePath.includes('/board/')) return 'Board';
    if (filePath.includes('\\resources\\') || filePath.includes('/resources/')) return 'Resources';
    if (filePath.includes('\\modals\\') || filePath.includes('/modals/')) return 'Modals';
    if (filePath.includes('\\mobile\\') || filePath.includes('/mobile/')) return 'Mobile';
    if (filePath.includes('\\ui\\') || filePath.includes('/ui/')) return 'UI';
    if (filePath.includes('\\common\\') || filePath.includes('/common/')) return 'Common';
    if (filePath.includes('\\layout\\') || filePath.includes('/layout/')) return 'Layout';
    if (filePath.includes('\\magnets\\') || filePath.includes('/magnets/')) return 'Magnets';
    if (filePath.includes('\\jobs\\') || filePath.includes('/jobs/')) return 'Jobs';
    return 'Other';
  }
}

module.exports = ComponentParser;