/**
 * Generates JavaScript class code for browser execution
 */

import type { ParsedContract } from './types';

export interface MockContext {
  msgSender: string;
  msgValue: string;
  blockTimestamp: string;
  blockNumber: string;
}

export class BrowserJSGenerator {
  /**
   * Generates executable JavaScript class code
   */
  generate(contract: ParsedContract, mockContext?: MockContext): string {
    console.log('🏗️  Starting JavaScript generation for:', contract.name);
    const ctx = mockContext || {
      msgSender: '0x0000000000000000000000000000000000000001',
      msgValue: '0',
      blockTimestamp: Math.floor(Date.now() / 1000).toString(),
      blockNumber: '1',
    };
    const parts: string[] = [];

    try {
      // Generate enums
      console.log('   Generating', contract.enums.length, 'enums...');
      for (const enumDef of contract.enums) {
        parts.push(`const ${enumDef.name} = Object.freeze({`);
        enumDef.members.forEach((member: string, index: number) => {
          parts.push(`  ${member}: ${index},`);
        });
        parts.push('});');
        parts.push('');
      }

      // Mock Solidity global objects for sandbox environment
      console.log('   Adding mock context...');
      parts.push('// Mock Solidity global objects (sandbox only - not real blockchain)');
      parts.push('const msg = {');
      parts.push(`  sender: "${ctx.msgSender}",`);
      parts.push(`  value: ${ctx.msgValue}n,`);
      parts.push('};');
      parts.push('');
      parts.push('const block = {');
      parts.push(`  timestamp: ${ctx.blockTimestamp}n,`);
      parts.push(`  number: ${ctx.blockNumber}n,`);
      parts.push('};');
      parts.push('');

      // Generate contract class
      console.log('   Generating contract class...');
      parts.push(`class ${contract.name} {`);
      parts.push('  constructor() {');
      parts.push('    this._events = [];');
      
      // Initialize state variables
      console.log('   Initializing', contract.stateVariables.length, 'state variables...');
      for (const stateVar of contract.stateVariables) {
        const defaultValue = this.getDefaultValue(stateVar.type);
        parts.push(`    this._${stateVar.name} = ${defaultValue};`);
      }
      
      parts.push('  }');
      parts.push('');

      // Generate state variable getters
      console.log('   Generating state variable getters...');
      for (const stateVar of contract.stateVariables) {
        if (stateVar.visibility === 'public') {
          parts.push(`  get ${stateVar.name}() {`);
          parts.push(`    return this._${stateVar.name};`);
          parts.push('  }');
          parts.push('');
        }
      }

      // Generate functions
      console.log('   Generating', contract.functions.length, 'functions...');
      for (const func of contract.functions) {
        if (func.visibility === 'public' || func.visibility === 'external') {
          console.log('     - Function:', func.name);
          const funcCode = this.generateFunction(func);
          parts.push(funcCode);
          parts.push('');
        }
      }

      // Event emission helper
      console.log('   Adding helper methods...');
      parts.push('  _emit(eventName, data) {');
      parts.push('    this._events.push({ eventName, data, timestamp: Date.now() });');
      parts.push('  }');
      parts.push('');
      parts.push('  getEvents() {');
      parts.push('    return this._events;');
      parts.push('  }');
      parts.push('');
      parts.push('  getState() {');
      parts.push('    return {');
      for (const stateVar of contract.stateVariables) {
        parts.push(`      ${stateVar.name}: this._${stateVar.name},`);
      }
      parts.push('    };');
      parts.push('  }');

      parts.push('}');
      parts.push('');
      parts.push(`return ${contract.name};`);

      const generatedCode = parts.join('\n');
      console.log('✅ JavaScript generation complete');
      console.log('📊 Generated code length:', generatedCode.length, 'characters');
      console.log('📄 First 500 chars of generated code:', generatedCode.substring(0, 500));
      
      return generatedCode;
    } catch (error) {
      console.error('❌ Generation failed:', error);
      throw error;
    }
  }

  private generateFunction(func: { name: string; parameters: Array<{ name: string }>; body?: string }): string {
    const lines: string[] = [];
    const params = func.parameters.map((p: { name: string }) => p.name).join(', ');

    lines.push(`  ${func.name}(${params}) {`);

    if (func.body) {
      const bodyLines = func.body.split('\n');
      bodyLines.forEach((line: string) => {
        lines.push(`    ${line}`);
      });
    } else {
      lines.push('    throw new Error("Not implemented");');
    }

    lines.push('  }');

    return lines.join('\n');
  }

  private getDefaultValue(type: string): string {
    if (type.includes('mapping')) {
      return 'new Map()';
    }
    if (type.includes('[]')) {
      return '[]';
    }
    if (type.startsWith('uint') || type.startsWith('int')) {
      return '0n';
    }
    if (type === 'bool') {
      return 'false';
    }
    if (type === 'address') {
      return '"0x0000000000000000000000000000000000000000"';
    }
    if (type === 'string') {
      return '""';
    }
    return 'null';
  }
}
