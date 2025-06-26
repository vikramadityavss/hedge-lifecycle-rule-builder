import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
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
  // Sample field definitions
  private fieldDefinitions: FieldDefinition[] = [
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

  // Local storage of rules
  private rules: Rule[] = [];
  private rulesSubject = new BehaviorSubject<Rule[]>([]);

  constructor() {
    // Load rules from localStorage on initialization if available
    this.loadRules();
  }

  /**
   * Get all available field definitions
   */
  getFieldDefinitions(): Observable<FieldDefinition[]> {
    return of(this.fieldDefinitions);
  }

  /**
   * Get field definition by ID
   */
  getFieldDefinition(fieldId: string): FieldDefinition | undefined {
    return this.fieldDefinitions.find(field => field.id === fieldId);
  }

  /**
   * Get all rules as an observable
   */
  getRules(): Observable<Rule[]> {
    return this.rulesSubject.asObservable();
  }

  /**
   * Get a specific rule by ID
   */
  getRuleById(id: string): Observable<Rule | undefined> {
    return this.rulesSubject.pipe(
      map(rules => rules.find(rule => rule.id === id))
    );
  }

  /**
   * Add a new rule
   */
  addRule(rule: Rule): Observable<Rule> {
    this.rules.push(rule);
    this.rulesSubject.next([...this.rules]);
    this.saveRules();
    return of(rule);
  }

  /**
   * Update an existing rule
   */
  updateRule(rule: Rule): Observable<Rule | undefined> {
    const index = this.rules.findIndex(r => r.id === rule.id);
    if (index !== -1) {
      this.rules[index] = { ...rule, updatedAt: new Date() };
      this.rulesSubject.next([...this.rules]);
      this.saveRules();
      return of(this.rules[index]);
    }
    return of(undefined);
  }

  /**
   * Delete a rule by ID
   */
  deleteRule(id: string): Observable<boolean> {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.id !== id);
    
    if (initialLength !== this.rules.length) {
      this.rulesSubject.next([...this.rules]);
      this.saveRules();
      return of(true);
    }
    
    return of(false);
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
   * Private helper methods
   */

  /**
   * Convert rule conditions to JsonLogic format
   * This method is now marked as public to allow for testing
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
        return this.convertConditionsToJsonLogic(condition);
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
   * This method is now marked as public to allow for testing
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

  /**
   * Save rules to localStorage
   */
  private saveRules(): void {
    try {
      localStorage.setItem('hedgeRules', JSON.stringify(this.rules));
    } catch (error) {
      console.error('Error saving rules to localStorage:', error);
    }
  }

  /**
   * Load rules from localStorage
   */
  private loadRules(): void {
    try {
      const savedRules = localStorage.getItem('hedgeRules');
      if (savedRules) {
        this.rules = JSON.parse(savedRules);
        
        // Convert string dates back to Date objects
        this.rules = this.rules.map(rule => ({
          ...rule,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt)
        }));
        
        this.rulesSubject.next([...this.rules]);
      }
    } catch (error) {
      console.error('Error loading rules from localStorage:', error);
    }
  }
}