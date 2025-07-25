import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { 
  Rule, 
  RuleCondition, 
  RuleAction, 
  ConditionOperator, 
  LogicalOperator,
  RuleStatus,
  RuleConditionGroup,
  FieldDefinition,
  ActionType,
  FieldType,
  RulePriority
} from '../models/rule.model';
import { SupabaseService } from './supabase.service';

// Import JsonLogic with lazy initialization
let JsonLogic: any = null;
let jsonLogicLoading: Promise<any> | null = null;

// Function to load JsonLogic when needed using dynamic imports instead of require
async function loadJsonLogic(): Promise<any> {
  if (!jsonLogicLoading) {
    jsonLogicLoading = import('json-logic-js').then(module => {
      JsonLogic = module.default || module;
      return JsonLogic;
    }).catch(err => {
      console.error('Error loading JsonLogic library:', err);
      jsonLogicLoading = null;
      return null;
    });
  }
  return jsonLogicLoading;
}

// Synchronous version for existing code (will return cached version or null)
function getJsonLogic(): any {
  if (!JsonLogic) {
    // Initiate loading if not already started
    loadJsonLogic();
    console.warn('JsonLogic not loaded yet - falling back to default behavior');
  }
  return JsonLogic;
}

@Injectable({
  providedIn: 'root'
})
export class RuleService {
  private fieldDefinitions: FieldDefinition[] = [];

  constructor(private supabaseService: SupabaseService) {
    // Initialize field definitions by fetching them from Supabase
    this.loadFieldDefinitions();
  }

  /**
   * Load field definitions from Supabase
   */
  private loadFieldDefinitions(): void {
    this.supabaseService.getFieldDefinitions().subscribe(
      definitions => {
        if (definitions && definitions.length > 0) {
          this.fieldDefinitions = definitions;
        } else {
          // If no field definitions exist in Supabase, use default ones
          this.fieldDefinitions = this.getDefaultFieldDefinitions();
        }
      },
      error => {
        console.error('Error loading field definitions:', error);
        // Use default field definitions as fallback
        this.fieldDefinitions = this.getDefaultFieldDefinitions();
      }
    );
  }

  /**
   * Get default field definitions (used as fallback)
   */
  private getDefaultFieldDefinitions(): FieldDefinition[] {
    return [
      { id: 'hedgeId', name: 'Hedge ID', type: FieldType.STRING, description: 'Unique identifier for the hedge' },
      { id: 'hedgeType', name: 'Hedge Type', type: FieldType.SELECT, options: [
        { value: 'interest_rate', label: 'Interest Rate' },
        { value: 'fx', label: 'Foreign Exchange' },
        { value: 'commodity', label: 'Commodity' },
      ]},
      { id: 'amount', name: 'Amount', type: FieldType.NUMBER, description: 'Hedge amount' },
      { id: 'tradeDate', name: 'Trade Date', type: FieldType.DATE, description: 'Date the hedge was traded' },
      { id: 'maturityDate', name: 'Maturity Date', type: FieldType.DATE, description: 'Date the hedge matures' },
      { id: 'status', name: 'Status', type: FieldType.SELECT, options: [
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' },
        { value: 'matured', label: 'Matured' },
        { value: 'terminated', label: 'Terminated' }
      ]},
      { id: 'counterparty', name: 'Counterparty', type: FieldType.STRING },
    ];
  }

  /**
   * Get all available field definitions
   */
  getFieldDefinitions(): Observable<FieldDefinition[]> {
    // If we already have field definitions, return them immediately
    if (this.fieldDefinitions.length > 0) {
      return of(this.fieldDefinitions);
    }
    
    // Otherwise, fetch from Supabase
    return this.supabaseService.getFieldDefinitions().pipe(
      tap(definitions => {
        if (definitions.length > 0) {
          this.fieldDefinitions = definitions;
        }
      }),
      catchError(error => {
        console.error('Error fetching field definitions:', error);
        // Use default field definitions as fallback
        this.fieldDefinitions = this.getDefaultFieldDefinitions();
        return of(this.fieldDefinitions);
      })
    );
  }

  /**
   * Get field definition by ID
   */
  getFieldDefinition(fieldId: string): FieldDefinition | undefined {
    return this.fieldDefinitions.find(field => field.id === fieldId);
  }

  /**
   * Get all rules
   */
  getRules(): Observable<Rule[]> {
    return this.supabaseService.getRules();
  }

  /**
   * Get a specific rule by ID
   */
  getRuleById(id: string): Observable<Rule | undefined> {
    return this.supabaseService.getRuleById(id).pipe(
      map(rule => rule || undefined)
    );
  }

  /**
   * Add a new rule
   */
  addRule(rule: Rule): Observable<Rule> {
    return this.supabaseService.createRule(rule);
  }

  /**
   * Update an existing rule
   */
  updateRule(rule: Rule): Observable<Rule | undefined> {
    return this.supabaseService.updateRule(rule);
  }

  /**
   * Delete a rule by ID
   */
  deleteRule(id: string): Observable<boolean> {
    return this.supabaseService.deleteRule(id);
  }

  /**
   * Create a new condition
   */
  createCondition(field: string, operator: ConditionOperator, value: any): RuleCondition {
    const fieldDef = this.getFieldDefinition(field);
    
    return {
      id: this.generateId(),
      field,
      operator,
      value,
      valueType: fieldDef?.type || FieldType.STRING
    };
  }

  /**
   * Create a new condition group
   */
  createConditionGroup(operator: LogicalOperator = LogicalOperator.AND): RuleConditionGroup {
    return {
      id: this.generateId(),
      operator,
      conditions: []
    };
  }

  /**
   * Create a new action
   */
  createAction(type: ActionType, params?: Partial<RuleAction>): RuleAction {
    return {
      id: this.generateId(),
      type,
      ...params
    };
  }

  /**
   * Create a new empty rule
   */
  createRule(name: string): Rule {
    return {
      id: this.generateId(),
      name,
      description: '',
      conditions: this.createConditionGroup(),
      actions: [],
      status: RuleStatus.DRAFT,
      priority: RulePriority.MEDIUM,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    };
  }

  /**
   * Evaluate a rule against provided data
   */
  async evaluateRule(rule: Rule, data: any): Promise<boolean> {
    if (rule.status !== RuleStatus.ACTIVE) {
      return false;
    }

    try {
      const jsonLogicRules = this.convertConditionsToJsonLogic(rule.conditions);
      
      // Use async loading to ensure JsonLogic is loaded
      await loadJsonLogic();
      const jsonLogic = getJsonLogic();
      
      // If JsonLogic failed to load, return false
      if (!jsonLogic) {
        console.error('JsonLogic failed to load');
        return false;
      }
      
      return jsonLogic.apply(jsonLogicRules, data);
    } catch (error) {
      console.error('Error evaluating rule:', error);
      return false;
    }
  }

  /**
   * Execute rule actions if conditions are met
   * Returns the actions that were executed
   */
  async executeRule(rule: Rule, data: any): Promise<RuleAction[]> {
    const isRuleMatch = await this.evaluateRule(rule, data);
    if (!isRuleMatch) {
      return [];
    }

    // In a real application, this would actually perform the actions
    // Here we just return the actions that would be executed
    return rule.actions;
  }

  /**
   * Validate a rule structure
   */
  validateRule(rule: Rule): { isValid: boolean, errors: string[] } {
    const errors: string[] = [];
    
    // Basic validation
    if (!rule.name || rule.name.trim() === '') {
      errors.push('Rule name is required');
    }
    
    // Validate conditions
    if (!rule.conditions || !rule.conditions.conditions || rule.conditions.conditions.length === 0) {
      errors.push('At least one condition is required');
    }
    
    // Validate actions
    if (!rule.actions || rule.actions.length === 0) {
      errors.push('At least one action is required');
    }
    
    return { 
      isValid: errors.length === 0,
      errors 
    };
  }

  /**
   * Convert rule conditions to JsonLogic format
   */
  convertConditionsToJsonLogic(conditionGroup: RuleConditionGroup): any {
    const logicOperator = conditionGroup.operator;
    const conditions = conditionGroup.conditions;
    
    if (!conditions || conditions.length === 0) {
      return true; // Empty conditions group always evaluates to true
    }
    
    const jsonLogicConditions = conditions.map(condition => {
      if ('operator' in condition && 'conditions' in condition) {
        // This is a nested condition group
        return this.convertConditionsToJsonLogic(condition as RuleConditionGroup);
      } else {
        // This is a leaf condition
        const ruleCondition = condition as RuleCondition;
        return this.convertConditionToJsonLogic(ruleCondition);
      }
    });
    
    return { [logicOperator]: jsonLogicConditions };
  }

  /**
   * Convert a single condition to JsonLogic format
   */
  convertConditionToJsonLogic(condition: RuleCondition): any {
    const { field, operator, value, negated } = condition;
    let logicExpr: any = null;
    
    // Convert condition based on operator
    switch (operator) {
      case ConditionOperator.EQUALS:
        logicExpr = { "==": [{ var: field }, value] };
        break;
      case ConditionOperator.NOT_EQUALS:
        logicExpr = { "!=": [{ var: field }, value] };
        break;
      case ConditionOperator.GREATER_THAN:
        logicExpr = { ">": [{ var: field }, value] };
        break;
      case ConditionOperator.LESS_THAN:
        logicExpr = { "<": [{ var: field }, value] };
        break;
      case ConditionOperator.GREATER_THAN_OR_EQUALS:
        logicExpr = { ">=": [{ var: field }, value] };
        break;
      case ConditionOperator.LESS_THAN_OR_EQUALS:
        logicExpr = { "<=": [{ var: field }, value] };
        break;
      case ConditionOperator.CONTAINS:
        logicExpr = { in: [value, { var: field }] };
        break;
      case ConditionOperator.NOT_CONTAINS:
        logicExpr = { "!": { in: [value, { var: field }] } };
        break;
      case ConditionOperator.IN:
        logicExpr = { in: [{ var: field }, value] };
        break;
      case ConditionOperator.NOT_IN:
        logicExpr = { "!": { in: [{ var: field }, value] } };
        break;
      
      case ConditionOperator.STARTS_WITH:
        logicExpr = { "startsWith": [{ var: field }, value] };
        break;
      case ConditionOperator.ENDS_WITH:
        logicExpr = { "endsWith": [{ var: field }, value] };
        break;
      case ConditionOperator.BETWEEN:
        // For BETWEEN operator, value should be an array of [min, max]
        if (Array.isArray(value) && value.length === 2) {
          logicExpr = { "and": [
            { ">=": [{ var: field }, value[0]] },
            { "<=": [{ var: field }, value[1]] }
          ]};
        } else {
          logicExpr = { "==": [{ var: field }, value] }; // Fallback to equals if value format is incorrect
        }
        break;
      default:
        logicExpr = { "==": [{ var: field }, value] };
    }
    
    // Apply negation if needed
    if (negated) {
      logicExpr = { "!": logicExpr };
    }
    
    return logicExpr;
  }

  /**
   * Generate a simple unique ID
   */
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}