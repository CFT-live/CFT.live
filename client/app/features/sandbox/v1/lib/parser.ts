/**
 * Browser-compatible Solidity parser
 */

import * as parser from '@solidity-parser/parser';
import type {
  ParsedContract,
  StateVariable,
  FunctionDefinition,
  StructDefinition,
  EnumDefinition,
  EventDefinition,
  Parameter,
} from './types';

export class SolidityParser {
  /**
   * Parses Solidity source code and returns contract information
   */
  parse(sourceCode: string): ParsedContract[] {
    console.log('🔍 Starting Solidity parsing...');
    console.log('📄 Source code length:', sourceCode.length, 'characters');
    console.log('📄 First 200 chars:', sourceCode.substring(0, 200));
    
    try {
      console.log('⚙️  Calling solidity-parser...');
      const ast = parser.parse(sourceCode, { tolerant: false, loc: true, range: true });
      console.log('✅ AST parsed successfully');
      console.log('📊 AST structure:', JSON.stringify(ast, null, 2).substring(0, 500));
      
      const contracts = this.extractContracts(ast);
      console.log('✅ Extracted', contracts.length, 'contract(s)');
      return contracts;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('❌ Parsing failed!');
      console.error('Error object:', error);
      console.error('Error keys:', Object.keys(error));
      console.error('Error message:', error.message);
      console.error('Error location:', error.location);
      console.error('Error stack:', error.stack);
      
      // Extract location info if available
      let errorMsg = 'Failed to parse Solidity code';
      if (error.message) {
        errorMsg += ': ' + error.message;
      }
      if (error.location) {
        const loc = error.location;
        errorMsg += ` at line ${loc.start?.line || '?'}, column ${loc.start?.column || '?'}`;
      }
      // Show problematic code snippet if range is available
      if (error.location?.start?.line) {
        const lines = sourceCode.split('\n');
        const lineNum = error.location.start.line - 1;
        if (lineNum >= 0 && lineNum < lines.length) {
          const problemLine = lines[lineNum];
          errorMsg += `\n\nProblematic line:\n${problemLine}`;
          if (error.location.start.column) {
            const pointer = ' '.repeat(error.location.start.column - 1) + '^';
            errorMsg += '\n' + pointer;
          }
        }
      }
      
      console.error('📝 Final error message:', errorMsg);
      throw new Error(errorMsg);
    }
  }

  private extractContracts(ast: unknown): ParsedContract[] {
    console.log('🔎 Extracting contracts from AST...');
    const contracts: ParsedContract[] = [];

    parser.visit(ast, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ContractDefinition: (node: any) => {
        console.log('📦 Found contract:', node.name);
        const contract: ParsedContract = {
          name: node.name as string,
          stateVariables: [],
          functions: [],
          structs: [],
          enums: [],
          events: [],
        };

        console.log('   Processing', node.subNodes?.length || 0, 'subNodes...');
        // Parse contract body
        for (const item of node.subNodes || []) {
          try {
            switch (item.type) {
              case 'StateVariableDeclaration':
                const vars = this.extractStateVariables(item);
                console.log('   ✓ State variables:', vars.map(v => v.name).join(', '));
                contract.stateVariables.push(...vars);
                break;
              case 'FunctionDefinition':
                if (item.isConstructor) {
                  console.log('   ✓ Constructor');
                  contract.constructorDef = this.extractFunction(item);
                } else {
                  console.log('   ✓ Function:', item.name || '(unnamed)');
                  contract.functions.push(this.extractFunction(item));
                }
                break;
              case 'StructDefinition':
                console.log('   ✓ Struct:', item.name);
                contract.structs.push(this.extractStruct(item));
                break;
              case 'EnumDefinition':
                console.log('   ✓ Enum:', item.name);
                contract.enums.push(this.extractEnum(item));
                break;
              case 'EventDefinition':
                console.log('   ✓ Event:', item.name);
                contract.events.push(this.extractEvent(item));
                break;
              default:
                console.log('   ⚠ Skipping:', item.type);
            }
          } catch (err) {
            console.error('   ❌ Error processing', item.type, ':', err);
            throw err;
          }
        }

        contracts.push(contract);
        console.log('✅ Contract extraction complete');
      },
    });

    return contracts;
  }

  private extractStateVariables(node: Record<string, unknown>): StateVariable[] {
    const variables: StateVariable[] = [];

    for (const variable of (node.variables || []) as Array<Record<string, unknown>>) {
      variables.push({
        name: variable.name as string,
        type: this.formatTypeName(variable.typeName as Record<string, unknown>),
        visibility: (variable.visibility as string) || 'internal',
      });
    }

    return variables;
  }

  private extractFunction(node: Record<string, unknown>): FunctionDefinition {
    const parameters = this.extractParameters(node.parameters);
    return {
      name: (node.name as string) || '',
      visibility: (node.visibility as string) || 'public',
      stateMutability: (node.stateMutability as string) || 'nonpayable',
      parameters: parameters,
      returnParameters: this.extractParameters(node.returnParameters),
      modifiers: (node.modifiers as Array<Record<string, unknown>> | undefined)?.map((m: Record<string, unknown>) => m.name as string) || [],
      body: node.body ? this.convertFunctionBody(node.body as Record<string, unknown>, parameters) : undefined,
    };
  }

  private extractStruct(node: Record<string, unknown>): StructDefinition {
    return {
      name: node.name as string,
      members: (node.members as Array<Record<string, unknown>>).map((m: Record<string, unknown>) => ({
        name: m.name as string,
        type: this.formatTypeName(m.typeName as Record<string, unknown>),
      })),
    };
  }

  private extractEnum(node: Record<string, unknown>): EnumDefinition {
    return {
      name: node.name as string,
      members: (node.members as Array<Record<string, unknown>>).map((m: Record<string, unknown>) => m.name as string),
    };
  }

  private extractEvent(node: Record<string, unknown>): EventDefinition {
    return {
      name: node.name as string,
      parameters: (node.parameters as Array<Record<string, unknown>>).map((p: Record<string, unknown>) => ({
        name: p.name as string,
        type: this.formatTypeName(p.typeName as Record<string, unknown>),
      })),
    };
  }

  private extractParameters(params: unknown): Parameter[] {
    if (!params || !Array.isArray(params)) {
      return [];
    }

    return params.map((p: Record<string, unknown>) => ({
      name: (p.name as string) || '',
      type: this.formatTypeName(p.typeName as Record<string, unknown>),
    }));
  }

  private formatTypeName(typeName: Record<string, unknown> | null | undefined): string {
    if (!typeName) return 'unknown';

    switch (typeName.type) {
      case 'ElementaryTypeName':
        return typeName.name as string;

      case 'UserDefinedTypeName':
        return typeName.namePath as string;

      case 'ArrayTypeName': {
        const baseType = this.formatTypeName(typeName.baseTypeName as Record<string, unknown>);
        return `${baseType}[]`;
      }

      case 'Mapping': {
        const keyType = this.formatTypeName(typeName.keyType as Record<string, unknown>);
        const valueType = this.formatTypeName(typeName.valueType as Record<string, unknown>);
        return `mapping(${keyType} => ${valueType})`;
      }

      default:
        return 'unknown';
    }
  }

  /**
   * Converts a Solidity function body to JavaScript
   */
  private convertFunctionBody(body: Record<string, unknown> | null | undefined, parameters: Parameter[] = []): string {
    if (!body || body.type !== 'Block') {
      return '';
    }

    const lines: string[] = [];
    const paramNames = new Set(parameters.map(p => p.name));
    
    for (const statement of (body.statements as Array<Record<string, unknown>> || [])) {
      const code = this.convertStatement(statement, paramNames);
      if (code) {
        lines.push(code);
      }
    }

    return lines.join('\n');
  }

  private convertStatement(stmt: Record<string, unknown>, paramNames: Set<string> = new Set()): string {
    switch (stmt.type) {
      case 'ExpressionStatement': {
        const expr = stmt.expression as Record<string, unknown>;
        if (expr.type === 'FunctionCall') {
          const funcExpr = expr.expression as Record<string, unknown>;
          if (funcExpr.type === 'Identifier') {
            if (funcExpr.name === 'require') {
              const args = (expr.arguments as Array<Record<string, unknown>> | undefined)?.map((a: Record<string, unknown>) => this.convertExpression(a, paramNames)) || [];
              const condition = args[0] || 'false';
              const message = args[1] || '"Requirement failed"';
              return `if (!(${condition})) throw new Error(${message});`;
            }
            if (funcExpr.name === 'revert') {
              const args = (expr.arguments as Array<Record<string, unknown>> | undefined)?.map((a: Record<string, unknown>) => this.convertExpression(a, paramNames)) || [];
              return `throw new Error(${args[0] || '"Reverted"'});`;
            }
            if (funcExpr.name === 'assert') {
              const args = (expr.arguments as Array<Record<string, unknown>> | undefined)?.map((a: Record<string, unknown>) => this.convertExpression(a, paramNames)) || [];
              return `if (!(${args[0]})) throw new Error("Assertion failed");`;
            }
          }
        }
        return this.convertExpression(expr, paramNames) + ';';
      }

      case 'ReturnStatement':
        if (stmt.expression) {
          return `return ${this.convertExpression(stmt.expression as Record<string, unknown>, paramNames)};`;
        }
        return 'return;';

      case 'IfStatement':
        return this.convertIfStatement(stmt, paramNames);

      case 'VariableDeclarationStatement':
        return this.convertVariableDeclaration(stmt, paramNames);

      case 'EmitStatement':
        return this.convertEmitStatement(stmt, paramNames);

      case 'RevertStatement': {
        const funcCall = stmt.revertCall as Record<string, unknown> | undefined;
        if (funcCall && funcCall.type === 'FunctionCall') {
          const funcExpr = funcCall.expression as Record<string, unknown>;
          if (funcExpr.type === 'Identifier') {
            const errorName = funcExpr.name as string;
            return `throw new Error("${errorName}");`;
          }
        }
        return 'throw new Error("Revert");';
      }

      case 'ForStatement':
        return this.convertForStatement(stmt, paramNames);

      case 'Block': {
        const statements = (stmt.statements as Array<Record<string, unknown>> | undefined) || [];
        const lines = statements.map(s => this.convertStatement(s, paramNames)).filter(l => l);
        if (lines.length === 1) return lines[0];
        return '\n' + lines.map(l => '  ' + l).join('\n');
      }

      case 'ContinueStatement':
        return 'continue;';

      case 'BreakStatement':
        return 'break;';

      default:
        return `// TODO: Convert ${stmt.type}`;
    }
  }

  private convertExpression(expr: Record<string, unknown> | null | undefined, paramNames: Set<string> = new Set()): string {
    if (!expr) return '';

    switch (expr.type) {
      case 'Identifier':
        if (paramNames.has(expr.name as string)) {
          return expr.name as string;
        }
        if (expr.name === 'msg' || expr.name === 'block') {
          return expr.name as string;
        }
        return `this._${expr.name as string}`;

      case 'NumberLiteral':
        return (expr.number as string).includes('.') ? (expr.number as string) : `${expr.number}n`;

      case 'BooleanLiteral':
        return (expr.value as boolean).toString();

      case 'StringLiteral':
        return `"${expr.value}"`;

      case 'BinaryOperation': {
        const left = this.convertExpression(expr.left as Record<string, unknown>, paramNames);
        const right = this.convertExpression(expr.right as Record<string, unknown>, paramNames);
        return `${left} ${expr.operator} ${right}`;
      }

      case 'UnaryOperation': {
        const sub = this.convertExpression(expr.subExpression as Record<string, unknown>, paramNames);
        return expr.isPrefix ? `${expr.operator}${sub}` : `${sub}${expr.operator}`;
      }

      case 'FunctionCall':
        return this.convertFunctionCall(expr, paramNames);

      case 'MemberAccess': {
        const base = this.convertExpression(expr.expression as Record<string, unknown>, paramNames);
        return `${base}.${expr.memberName as string}`;
      }

      case 'IndexAccess': {
        const baseExpr = this.convertExpression(expr.base as Record<string, unknown>, paramNames);
        const indexExpr = this.convertExpression(expr.index as Record<string, unknown>, paramNames);
        if (baseExpr.startsWith('this._')) {
          return `${baseExpr}.get(${indexExpr})`;
        }
        return `${baseExpr}[${indexExpr}]`;
      }

      case 'Conditional': {
        const condition = this.convertExpression(expr.condition as Record<string, unknown>, paramNames);
        const trueExpr = this.convertExpression(expr.trueExpression as Record<string, unknown>, paramNames);
        const falseExpr = this.convertExpression(expr.falseExpression as Record<string, unknown>, paramNames);
        return `${condition} ? ${trueExpr} : ${falseExpr}`;
      }

      case 'TupleExpression': {
        const components = (expr.components as Array<Record<string, unknown> | null> | undefined) || [];
        const values = components.map(c => c ? this.convertExpression(c, paramNames) : 'null');
        if (expr.isArray) {
          return `[${values.join(', ')}]`;
        }
        return `{ ${values.map((v, i) => `value${i}: ${v}`).join(', ')} }`;
      }

      case 'TypeKeyword':
      case 'ElementaryTypeNameExpression': {
        // Handle type(uint256).max, etc.
        const typeName = expr.typeName || expr.name;
        if (typeof typeName === 'string') {
          return `/* type(${typeName}) */`;
        }
        return '/* type expression */';
      }

      default:
        return `/* ${expr.type} */`;
    }
  }

  private convertForStatement(stmt: Record<string, unknown>, paramNames: Set<string> = new Set()): string {
    const initExpr = stmt.initExpression as Record<string, unknown> | undefined;
    const condExpr = stmt.conditionExpression as Record<string, unknown> | undefined;
    const loopExpr = stmt.loopExpression as Record<string, unknown> | undefined;
    const body = stmt.body as Record<string, unknown> | undefined;

    // Extract loop variable from initialization
    let loopVar = 'i';
    if (initExpr && initExpr.type === 'VariableDeclarationStatement') {
      const declarations = (initExpr.variables || []) as Array<Record<string, unknown>>;
      if (declarations.length > 0) {
        loopVar = declarations[0].name as string;
        paramNames.add(loopVar);
      }
    }

    const init = initExpr ? this.convertStatement(initExpr, paramNames).replace(/;$/, '') : '';
    const condition = condExpr ? this.convertExpression(condExpr, paramNames) : 'true';
    const loop = loopExpr ? (loopExpr.type === 'ExpressionStatement' 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? this.convertExpression((loopExpr as any).expression, paramNames) 
      : this.convertExpression(loopExpr, paramNames)) : '';
    
    let bodyCode = '';
    if (body) {
      const bodyStr = this.convertStatement(body, paramNames);
      // If body is a block, it's already properly formatted
      if (bodyStr.includes('\n')) {
        bodyCode = bodyStr;
      } else {
        bodyCode = '\n  ' + bodyStr;
      }
    }

    return `for (${init}; ${condition}; ${loop}) {${bodyCode}\n}`;
  }

  private convertFunctionCall(expr: Record<string, unknown>, paramNames: Set<string> = new Set()): string {
    const funcExpr = this.convertExpression(expr.expression as Record<string, unknown> | null | undefined, paramNames);
    const args = (expr.arguments as Array<Record<string, unknown>> | undefined)?.map((a: Record<string, unknown>) => this.convertExpression(a, paramNames)) || [];

    if (funcExpr === 'require') {
      const condition = args[0] || 'false';
      const message = args[1] || '"Requirement failed"';
      return `if (!(${condition})) throw new Error(${message})`;
    }

    if (funcExpr === 'revert') {
      return `throw new Error(${args[0] || '"Reverted"'})`;
    }

    if (funcExpr === 'assert') {
      return `if (!(${args[0]})) throw new Error("Assertion failed")`;
    }

    return `${funcExpr}(${args.join(', ')})`;
  }

  private convertIfStatement(stmt: Record<string, unknown>, paramNames: Set<string> = new Set()): string {
    const condition = this.convertExpression(stmt.condition as Record<string, unknown>, paramNames);
    const trueBody = stmt.trueBody ? this.convertStatement(stmt.trueBody as Record<string, unknown>, paramNames) : '';
    const falseBody = stmt.falseBody ? this.convertStatement(stmt.falseBody as Record<string, unknown>, paramNames) : '';

    let result = `if (${condition}) {\n  ${trueBody}\n}`;
    if (falseBody) {
      result += ` else {\n  ${falseBody}\n}`;
    }
    return result;
  }

  private convertVariableDeclaration(stmt: Record<string, unknown>, paramNames: Set<string> = new Set()): string {
    const declarations = (stmt.variables || []) as Array<Record<string, unknown>>;
    const initialValue = stmt.initialValue ? this.convertExpression(stmt.initialValue as Record<string, unknown>, paramNames) : undefined;

    if (declarations.length === 0) return '';

    const varName = declarations[0].name as string;

    if (initialValue) {
      return `let ${varName} = ${initialValue};`;
    }
    return `let ${varName};`;
  }

  private convertEmitStatement(stmt: Record<string, unknown>, paramNames: Set<string> = new Set()): string {
    if (stmt.eventCall && (stmt.eventCall as Record<string, unknown>).type === 'FunctionCall') {
      const eventCall = stmt.eventCall as Record<string, unknown>;
      const eventExpr = eventCall.expression as Record<string, unknown>;
      const eventName = eventExpr.type === 'Identifier' ? (eventExpr.name as string) : 'Event';
      const args = (eventCall.arguments as Array<Record<string, unknown>> | undefined)?.map((a: Record<string, unknown>, idx: number) => {
        const expr = this.convertExpression(a, paramNames);
        // Create a simple field name based on the argument index or extract identifier
        let fieldName = `arg${idx}`;
        
        // Try to extract a clean field name from the expression
        if (a.type === 'Identifier') {
          fieldName = a.name as string;
        } else if (a.type === 'MemberAccess') {
          // For expressions like balanceOf[msg.sender], use just the member name
          fieldName = a.memberName as string;
        } else if (a.type === 'IndexAccess') {
          // For map.get(key), try to use the base name
          const base = a.base as Record<string, unknown>;
          if (base.type === 'Identifier') {
            fieldName = base.name as string;
          }
        }
        
        return `${fieldName}: ${expr}`;
      }) || [];
      
      return `this._emit('${eventName}', { ${args.join(', ')} });`;
    }
    return '// TODO: Convert emit statement';
  }
}
