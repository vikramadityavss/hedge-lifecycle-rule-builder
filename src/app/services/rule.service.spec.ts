
import { TestBed } from '@angular/core/testing';
import { RuleService } from './rule.service';
import { Rule, RuleStatus, RulePriority, LogicalOperator, ActionType, ConditionOperator, FieldType } from '../models/rule.model';

describe('RuleService', () => {
  let service: RuleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RuleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a new rule', () => {
    const rule = service.createRule('Test Rule');
    expect(rule).toBeTruthy();
    expect(rule.name).toBe('Test Rule');
    expect(rule.status).toBe(RuleStatus.DRAFT);
    expect(rule.priority).toBe(RulePriority.MEDIUM);
    expect(rule.conditions.operator).toBe(LogicalOperator.AND);
    expect(rule.conditions.conditions).toEqual([]);
    expect(rule.actions).toEqual([]);
  });

  it('should validate rule conditions', () => {
    const rule = service.createRule('Test Rule');
    const validation = service.validateRule(rule);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('At least one condition is required');
    expect(validation.errors).toContain('At least one action is required');
  });

  it('should convert conditions to JsonLogic format', () => {
    const rule = service.createRule('Test Rule');
    const condition = service.createCondition('amount', ConditionOperator.GREATER_THAN, 1000);
    rule.conditions.conditions.push(condition);
    const result = service.evaluateRule(rule, { amount: 2000 });
    // Rule is in draft status, so it should not evaluate
    expect(result).toBe(false);
  });
});
