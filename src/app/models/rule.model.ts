/**
 * Rule model interfaces for the Hedge Lifecycle Rule Builder
 */

// Define the condition operators available
export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'notEquals',
  GREATER_THAN = 'greaterThan',
  LESS_THAN = 'lessThan',
  GREATER_THAN_OR_EQUALS = 'greaterThanOrEquals',
  LESS_THAN_OR_EQUALS = 'lessThanOrEquals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notContains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  IN = 'in',
  NOT_IN = 'notIn',
  BETWEEN = 'between'
}

// Define the logical operators for combining conditions
export enum LogicalOperator {
  AND = 'and',
  OR = 'or'
}

// Action types that can be performed
export enum ActionType {
  SET_FIELD = 'setField',
  NOTIFY = 'notify',
  APPLY_LIFECYCLE = 'applyLifecycle',
  HALT_PROCESSING = 'haltProcessing',
  MODIFY_HEDGE = 'modifyHedge'
}

// Field types for rule conditions and actions
export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  SELECT = 'select',
  MULTI_SELECT = 'multiSelect'
}

// Status options for rules
export enum RuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft'
}

// Priority levels for rule execution order
export enum RulePriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Field definition for dropdown options 
export interface FieldOption {
  value: string;
  label: string;
}

// Field definition interface
export interface FieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  options?: FieldOption[]; // For select and multi-select fields
  description?: string;
}

// Rule condition interface
export interface RuleCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: any;
  valueType: FieldType;
  negated?: boolean;
}

// Group of conditions combined with logical operator
export interface RuleConditionGroup {
  id: string;
  operator: LogicalOperator;
  conditions: (RuleCondition | RuleConditionGroup)[];
}

// Action definition interface
export interface RuleAction {
  id: string;
  type: ActionType;
  field?: string; // Field to modify, if applicable
  value?: any;    // Value to set, if applicable
  message?: string; // For notifications
  lifecycleStage?: string; // For lifecycle changes
  parameters?: Record<string, any>; // Additional parameters for complex actions
}

// Main Rule interface
export interface Rule {
  id: string;
  name: string;
  description?: string;
  conditions: RuleConditionGroup;
  actions: RuleAction[];
  status: RuleStatus;
  priority: RulePriority;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  tags?: string[];
  category?: string;
}