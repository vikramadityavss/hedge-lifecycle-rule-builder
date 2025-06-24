import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { RuleService } from '../../services/rule.service';
import { LifecycleStageService } from '../../services/lifecycle-stage.service';
import { 
  Rule, 
  RuleCondition, 
  RuleAction,
  RuleConditionGroup,
  LogicalOperator,
  ActionType,
  RuleStatus,
  RulePriority,
  FieldDefinition,
  FieldType,
  ConditionOperator
} from '../../models/rule.model';

@Component({
  selector: 'app-rule-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    TabViewModule,
    ToastModule,
    DialogModule,
    TableModule,
    TagModule,
    TooltipModule,
    ChipModule,
    DividerModule,
    ToolbarModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './rule-builder.component.html'
})
export class RuleBuilderComponent implements OnInit {
  // Make ActionType available to template
  ActionType = ActionType;
  
  rules: Rule[] = [];
  currentRule: Rule | null = null;
  ruleForm: FormGroup;
  selectedRuleId: string | null = null;
  isNewRule = true;
  showRuleDialog = false;
  currentStageId: string | null = null;
  
  // UI options
  priorityOptions = [
    { label: 'High', value: RulePriority.HIGH },
    { label: 'Medium', value: RulePriority.MEDIUM },
    { label: 'Low', value: RulePriority.LOW }
  ];
  
  statusOptions = [
    { label: 'Active', value: RuleStatus.ACTIVE },
    { label: 'Inactive', value: RuleStatus.INACTIVE },
    { label: 'Draft', value: RuleStatus.DRAFT }
  ];
  
  logicalOperatorOptions = [
    { label: 'AND - All conditions must be met', value: LogicalOperator.AND },
    { label: 'OR - Any condition can be met', value: LogicalOperator.OR }
  ];
  
  // Field definitions
  fieldDefinitions: FieldDefinition[] = [];
  fieldOptions: { label: string, value: string }[] = [];
  
  // Condition builder
  newCondition: RuleCondition | null = null;
  conditionOperatorOptions = [
    { label: 'Equals', value: ConditionOperator.EQUALS },
    { label: 'Not Equals', value: ConditionOperator.NOT_EQUALS },
    { label: 'Greater Than', value: ConditionOperator.GREATER_THAN },
    { label: 'Less Than', value: ConditionOperator.LESS_THAN },
    { label: 'Contains', value: ConditionOperator.CONTAINS },
    { label: 'Not Contains', value: ConditionOperator.NOT_CONTAINS },
    { label: 'In List', value: ConditionOperator.IN },
    { label: 'Not In List', value: ConditionOperator.NOT_IN },
    { label: 'Greater Than or Equal', value: ConditionOperator.GREATER_THAN_OR_EQUALS },
    { label: 'Less Than or Equal', value: ConditionOperator.LESS_THAN_OR_EQUALS },
    { label: 'Starts With', value: ConditionOperator.STARTS_WITH },
    { label: 'Ends With', value: ConditionOperator.ENDS_WITH },
    { label: 'Between', value: ConditionOperator.BETWEEN }
  ];
  
  // Action builder
  newAction: Partial<RuleAction> = {};
  actionTypeOptions = [
    { label: 'Set Field Value', value: ActionType.SET_FIELD },
    { label: 'Send Notification', value: ActionType.NOTIFY },
    { label: 'Apply Lifecycle Stage', value: ActionType.APPLY_LIFECYCLE },
    { label: 'Halt Processing', value: ActionType.HALT_PROCESSING },
    { label: 'Modify Hedge', value: ActionType.MODIFY_HEDGE }
  ];

  constructor(
    private ruleService: RuleService,
    private lifecycleStageService: LifecycleStageService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    // Initialize form
    this.ruleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      priority: [RulePriority.MEDIUM, Validators.required],
      status: [RuleStatus.DRAFT, Validators.required],
      logicalOperator: [LogicalOperator.AND]
    });
  }

  ngOnInit(): void {
    // Subscribe to the selected stage
    this.lifecycleStageService.getSelectedStageId().subscribe(stageId => {
      this.currentStageId = stageId;
      
      if (stageId) {
        // Load rules for the selected stage
        this.lifecycleStageService.getStageRules(stageId).subscribe(rules => {
          this.rules = rules;
        });
      } else {
        // Clear rules if no stage is selected
        this.rules = [];
      }
    });

    // Load field definitions
    this.ruleService.getFieldDefinitions().subscribe(fields => {
      this.fieldDefinitions = fields;
      // Convert field definitions to dropdown options
      this.fieldOptions = fields.map(f => ({ label: f.name, value: f.id }));
    });

    this.resetNewCondition();
    this.resetNewAction();
  }

  openNew(): void {
    this.isNewRule = true;
    this.currentRule = this.ruleService.createRule('');
    this.ruleForm.reset({
      name: '',
      description: '',
      priority: RulePriority.MEDIUM,
      status: RuleStatus.DRAFT,
      logicalOperator: LogicalOperator.AND
    });
    this.showRuleDialog = true;
  }

  editRule(rule: Rule): void {
    this.isNewRule = false;
    this.selectedRuleId = rule.id;
    this.currentRule = { ...rule };
    
    this.ruleForm.patchValue({
      name: rule.name,
      description: rule.description || '',
      priority: rule.priority,
      status: rule.status,
      logicalOperator: rule.conditions.operator
    });
    
    this.showRuleDialog = true;
  }

  deleteRule(rule: Rule): void {
    if (!this.currentStageId) return;
    
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the rule "${rule.name}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // First remove the rule from the stage
        this.lifecycleStageService.removeRuleFromStage(this.currentStageId!, rule.id).subscribe(success => {
          if (success) {
            // Then delete the rule from the rule service
            this.ruleService.deleteRule(rule.id).subscribe(deleteSuccess => {
              if (deleteSuccess) {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: 'Rule deleted successfully'
                });
                
                // Refresh the rules list
                this.lifecycleStageService.getStageRules(this.currentStageId!).subscribe(rules => {
                  this.rules = rules;
                });
              }
            });
          }
        });
      }
    });
  }

  saveRule(): void {
    if (!this.currentStageId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please select a lifecycle stage first'
      });
      return;
    }
    
    if (this.ruleForm.invalid || !this.currentRule) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please complete all required fields'
      });
      return;
    }
    
    // Update current rule with form values
    const formValue = this.ruleForm.value;
    this.currentRule.name = formValue.name;
    this.currentRule.description = formValue.description;
    this.currentRule.priority = formValue.priority;
    this.currentRule.status = formValue.status;
    this.currentRule.conditions.operator = formValue.logicalOperator;
    this.currentRule.updatedAt = new Date();
    
    // Validate rule
    const { isValid, errors } = this.ruleService.validateRule(this.currentRule);
    
    if (!isValid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: errors.join(', ')
      });
      return;
    }
    
    if (this.isNewRule) {
      this.ruleService.addRule(this.currentRule).subscribe(rule => {
        // Add the new rule to the current stage
        this.lifecycleStageService.addRuleToStage(this.currentStageId!, rule).subscribe(success => {
          if (success) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Rule created successfully'
            });
            
            // Refresh the rules list
            this.lifecycleStageService.getStageRules(this.currentStageId!).subscribe(rules => {
              this.rules = rules;
            });
            
            this.hideDialog();
          }
        });
      });
    } else {
      this.ruleService.updateRule(this.currentRule).subscribe(rule => {
        if (rule) {
          // Update the rule in the stage
          this.lifecycleStageService.updateRuleInStage(this.currentStageId!, rule).subscribe(success => {
            if (success) {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Rule updated successfully'
              });
              
              // Refresh the rules list
              this.lifecycleStageService.getStageRules(this.currentStageId!).subscribe(rules => {
                this.rules = rules;
              });
              
              this.hideDialog();
            }
          });
        }
      });
    }
  }

  hideDialog(): void {
    this.showRuleDialog = false;
    this.ruleForm.reset();
    this.currentRule = null;
  }

  // Condition management
  addCondition(): void {
    if (!this.currentRule || !this.newCondition) return;
    
    const condition = { ...this.newCondition };
    
    if (!this.currentRule.conditions.conditions) {
      this.currentRule.conditions.conditions = [];
    }
    
    this.currentRule.conditions.conditions.push(condition);
    this.resetNewCondition();
  }

  removeCondition(index: number): void {
    if (!this.currentRule || !this.currentRule.conditions.conditions) return;
    
    this.currentRule.conditions.conditions.splice(index, 1);
  }

  resetNewCondition(): void {
    this.newCondition = {
      id: this.ruleService.generateId(), // Fixed by making generateId method public
      field: '',
      operator: ConditionOperator.EQUALS,
      value: '',
      valueType: FieldType.STRING
    };
  }

  // Action management
  addAction(): void {
    if (!this.currentRule || !this.newAction.type) return;
    
    const action = this.ruleService.createAction(
      this.newAction.type,
      {
        field: this.newAction.field,
        value: this.newAction.value,
        message: this.newAction.message,
        lifecycleStage: this.newAction.lifecycleStage,
        parameters: this.newAction.parameters
      }
    );
    
    if (!this.currentRule.actions) {
      this.currentRule.actions = [];
    }
    
    this.currentRule.actions.push(action);
    this.resetNewAction();
  }

  removeAction(index: number): void {
    if (!this.currentRule || !this.currentRule.actions) return;
    
    this.currentRule.actions.splice(index, 1);
  }

  resetNewAction(): void {
    this.newAction = {
      type: undefined,
      field: '',
      value: '',
      message: '',
      parameters: {}
    };
  }

  // Field helpers
  getFieldNameById(fieldId: string): string {
    const field = this.fieldDefinitions.find(f => f.id === fieldId);
    return field ? field.name : fieldId;
  }

  getActionTypeLabel(actionType: ActionType): string {
    const option = this.actionTypeOptions.find(o => o.value === actionType);
    return option ? option.label : actionType;
  }

  // Define type for PrimeNG severity
  getStatusSeverity(status: RuleStatus): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' | undefined {
    switch (status) {
      case RuleStatus.ACTIVE:
        return 'success';
      case RuleStatus.INACTIVE:
        return 'danger';
      case RuleStatus.DRAFT:
        return 'warning';
      default:
        return 'info';
    }
  }

  getPrioritySeverity(priority: RulePriority): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' | undefined {
    switch (priority) {
      case RulePriority.HIGH:
        return 'danger';
      case RulePriority.MEDIUM:
        return 'warning';
      case RulePriority.LOW:
        return 'info';
      default:
        return 'info';
    }
  }
  
  // Condition type checks
  isSimpleCondition(condition: RuleCondition | RuleConditionGroup): boolean {
    return !('conditions' in condition);
  }
  
  isConditionGroup(condition: RuleCondition | RuleConditionGroup): boolean {
    return 'conditions' in condition;
  }
  
  // Condition field helpers
  getConditionField(condition: RuleCondition | RuleConditionGroup): string {
    if (this.isSimpleCondition(condition)) {
      return (condition as RuleCondition).field;
    }
    return '';
  }
  
  getConditionOperator(condition: RuleCondition | RuleConditionGroup): string {
    if (this.isSimpleCondition(condition)) {
      const operator = (condition as RuleCondition).operator;
      const operatorOption = this.conditionOperatorOptions.find(o => o.value === operator);
      return operatorOption ? operatorOption.label : String(operator);
    }
    return '';
  }
  
  getConditionValue(condition: RuleCondition | RuleConditionGroup): string {
    if (this.isSimpleCondition(condition)) {
      return (condition as RuleCondition).value;
    }
    return '';
  }
  
  getConditionGroupLength(condition: RuleCondition | RuleConditionGroup): number {
    if (this.isConditionGroup(condition)) {
      return (condition as RuleConditionGroup).conditions?.length || 0;
    }
    return 0;
  }
}
