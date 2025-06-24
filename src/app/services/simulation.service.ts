import { Injectable } from '@angular/core';
import { Observable, of, from, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  SimulationEnvironment, 
  SimulationOutput, 
  TraceEntry, 
  EntityAllocation,
  HedgeEntity
} from '../models/lifecycle-stage.model';
import { LifecycleStageService } from './lifecycle-stage.service';
import { RuleService } from './rule.service';
import { Rule, RuleAction, ActionType } from '../models/rule.model';
// No need to import JsonLogic directly as we'll use RuleService

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  // Store simulation environments by stage ID
  private simulationEnvironments: { [stageId: string]: SimulationEnvironment } = {};

  constructor(
    private lifecycleStageService: LifecycleStageService,
    private ruleService: RuleService
  ) {
    // Load saved simulation environments from localStorage
    this.loadSimulationEnvironments();
  }

  /**
   * Save a simulation environment for a specific stage
   */
  saveSimulationEnvironment(environment: SimulationEnvironment): void {
    this.simulationEnvironments[environment.stageId] = environment;
    this.saveToLocalStorage();
  }

  /**
   * Get the simulation environment for a specific stage
   */
  getSimulationEnvironment(stageId: string): Observable<SimulationEnvironment | null> {
    return of(this.simulationEnvironments[stageId] || null);
  }

  /**
   * Run a simulation using the provided data and the rules from the specified stage
   */
  runSimulation(stageId: string, data: any): Observable<SimulationOutput> {
    return from(this.runSimulationAsync(stageId, data));
  }

  /**
   * Run a simulation asynchronously
   */
  async runSimulationAsync(stageId: string, data: any): Promise<SimulationOutput> {
    const stage = await firstValueFrom(this.lifecycleStageService.getStageById(stageId));
    
    if (!stage) {
      throw new Error(`Stage with ID ${stageId} not found`);
    }

    // Create deep copy of data to avoid modifying the original
    const simulationData = JSON.parse(JSON.stringify(data));
    
    // Get rules for the stage, ordered by priority
    const rules = [...stage.rules].sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Prepare trace log and simulation state
    const traceLog: TraceEntry[] = [];
    const simulationState = {
      input: simulationData,
      entities: simulationData.entities || [],
      status: 'Approved',
      reason: '',
      action: '',
      calculatedFields: {},
      haltProcessing: false
    };

    // Execute rules in priority order
    for (const rule of rules) {
      if (simulationState.haltProcessing) {
        break;
      }

      // Create snapshot of state before rule execution
      const inputState = JSON.parse(JSON.stringify(simulationState));
      
      // Evaluate rule conditions (async)
      const conditionsMet = await this.ruleService.evaluateRule(rule, simulationState);
      
      // Create trace entry
      const traceEntry: TraceEntry = {
        ruleId: rule.id,
        ruleName: rule.name,
        conditionEvaluation: conditionsMet,
        actionsExecuted: [],
        inputState: inputState,
        outputState: {}, // Empty object instead of null
        timestamp: new Date()
      };
      
      // Execute actions if conditions are met
      if (conditionsMet && rule.actions && rule.actions.length > 0) {
        traceEntry.actionsExecuted = [...rule.actions];
        
        // Apply each action to the simulation state
        for (const action of rule.actions) {
          this.executeAction(action, simulationState);
          
          // Break the loop if a halt action is encountered
          if (simulationState.haltProcessing) {
            break;
          }
        }
      }
      
      // Capture state after rule execution
      traceEntry.outputState = JSON.parse(JSON.stringify(simulationState));
      traceLog.push(traceEntry);
    }

    // Calculate entity allocations based on final state
    const entityAllocations = this.calculateEntityAllocations(simulationState.entities, simulationData.hedgeAmount);

    // Prepare and return the simulation output
    return {
      status: simulationState.status as any,
      reason: simulationState.reason,
      action: simulationState.action,
      trace: traceLog,
      entityAllocations: entityAllocations,
      calculatedFields: simulationState.calculatedFields
    };
  }

  /**
   * Execute a rule action and update the simulation state
   */
  private executeAction(action: RuleAction, state: any): void {
    switch (action.type) {
      case ActionType.SET_FIELD:
        if (action.field) {
          // Handle dot notation for nested properties
          const fieldParts = action.field.split('.');
          let currentObj = state;
          
          // Navigate to the deepest level but one
          for (let i = 0; i < fieldParts.length - 1; i++) {
            if (!currentObj[fieldParts[i]]) {
              currentObj[fieldParts[i]] = {};
            }
            currentObj = currentObj[fieldParts[i]];
          }
          
          // Set the value on the final property
          const finalField = fieldParts[fieldParts.length - 1];
          currentObj[finalField] = action.value;
          
          // Also track in calculatedFields for visibility
          state.calculatedFields[action.field] = action.value;
        }
        break;
        
      case ActionType.NOTIFY:
        // In a real system, this would send a notification
        // For simulation purposes, we just record the action
        if (!state.notifications) {
          state.notifications = [];
        }
        state.notifications.push({
          message: action.message,
          timestamp: new Date()
        });
        break;
        
      case ActionType.APPLY_LIFECYCLE:
        // Set the lifecycle stage
        state.lifecycleStage = action.lifecycleStage;
        break;
        
      case ActionType.HALT_PROCESSING:
        // Stop processing further rules
        state.haltProcessing = true;
        break;
        
      case ActionType.MODIFY_HEDGE:
        // Apply custom hedge modifications from parameters
        if (action.parameters) {
          Object.keys(action.parameters).forEach(key => {
            state[key] = action.parameters![key];
          });
        }
        break;
    }
  }

  /**
   * Calculate entity allocations based on the hedge amount and entity data
   */
  private calculateEntityAllocations(entities: HedgeEntity[], totalAmount: number): EntityAllocation[] {
    if (!entities || !totalAmount) {
      return [];
    }

    const allocations: EntityAllocation[] = [];
    let remainingAmount = totalAmount;

    // Sort entities by NAV (descending) for allocation
    const sortedEntities = [...entities].sort((a, b) => b.nav - a.nav);

    for (const entity of sortedEntities) {
      if (remainingAmount <= 0) {
        // No more amount to allocate
        allocations.push({
          entityId: entity.id,
          entityName: entity.name,
          allocation: 0,
          availableAmount: this.calculateAvailableAmount(entity),
          buffer: this.calculateBuffer(entity),
          navAfterCAR: this.calculateNavAfterCAR(entity),
          exhausted: true
        });
        continue;
      }

      const availableAmount = this.calculateAvailableAmount(entity);
      const allocation = Math.min(availableAmount, remainingAmount);
      remainingAmount -= allocation;

      allocations.push({
        entityId: entity.id,
        entityName: entity.name,
        allocation: allocation,
        availableAmount: availableAmount,
        buffer: this.calculateBuffer(entity),
        navAfterCAR: this.calculateNavAfterCAR(entity),
        exhausted: allocation >= availableAmount
      });
    }

    return allocations;
  }

  /**
   * Calculate the available amount for an entity
   */
  private calculateAvailableAmount(entity: HedgeEntity): number {
    if (entity.carExempt) {
      // CAR exempt entities have their full NAV available
      return entity.nav - (entity.alreadyHedged || 0);
    } else {
      // Non-exempt entities need to maintain optimal CAR
      const navAfterCAR = this.calculateNavAfterCAR(entity);
      return Math.max(0, navAfterCAR - (entity.alreadyHedged || 0));
    }
  }

  /**
   * Calculate the buffer for an entity (amount set aside for CAR)
   */
  private calculateBuffer(entity: HedgeEntity): number {
    if (entity.carExempt) {
      return 0;
    }
    return entity.nav * (entity.optimalCAR || 0) / 100;
  }

  /**
   * Calculate the NAV after applying CAR requirements
   */
  private calculateNavAfterCAR(entity: HedgeEntity): number {
    if (entity.carExempt) {
      return entity.nav;
    }
    const buffer = this.calculateBuffer(entity);
    return Math.max(0, entity.nav - buffer);
  }

  /**
   * Save all simulation environments to localStorage
   */
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('hedgeSimulationEnvironments', JSON.stringify(this.simulationEnvironments));
    } catch (error) {
      console.error('Error saving simulation environments to localStorage:', error);
    }
  }

  /**
   * Load simulation environments from localStorage
   */
  private loadSimulationEnvironments(): void {
    try {
      const savedEnvironments = localStorage.getItem('hedgeSimulationEnvironments');
      if (savedEnvironments) {
        this.simulationEnvironments = JSON.parse(savedEnvironments);
      }
    } catch (error) {
      console.error('Error loading simulation environments from localStorage:', error);
    }
  }

  /**
   * Clear all simulation environments
   */
  clearSimulationEnvironments(): void {
    this.simulationEnvironments = {};
    this.saveToLocalStorage();
  }
}