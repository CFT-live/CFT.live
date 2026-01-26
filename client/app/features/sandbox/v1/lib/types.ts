/**
 * Type definitions for the Solidity parser
 */

export interface Parameter {
  name: string;
  type: string;
}

export interface FunctionDefinition {
  name: string;
  visibility: string;
  stateMutability: string;
  parameters: Parameter[];
  returnParameters: Parameter[];
  modifiers: string[];
  body?: string;
}

export interface StateVariable {
  name: string;
  type: string;
  visibility: string;
}

export interface EventDefinition {
  name: string;
  parameters: Parameter[];
}

export interface StructDefinition {
  name: string;
  members: Parameter[];
}

export interface EnumDefinition {
  name: string;
  members: string[];
}

export interface ParsedContract {
  name: string;
  constructorDef?: FunctionDefinition;
  functions: FunctionDefinition[];
  stateVariables: StateVariable[];
  events: EventDefinition[];
  structs: StructDefinition[];
  enums: EnumDefinition[];
}
