/**
 * Lifecycle stage model interfaces for the Hedge Lifecycle Rule Builder
 */
import { Rule } from './rule.model';

// Lifecycle Stage statuses
export enum LifecycleStageStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft'
}

// Main Lifecycle Stage interface
export interface LifecycleStage {
  id: string;
  name: string;
  description: string;
  sequence: number;
  status: LifecycleStageStatus;
  rules: Rule[];
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Simulation environment data for lifecycle stages
export interface SimulationEnvironment {
  stageId: string;
  inputData: Record<string, any>;
  entities: HedgeEntity[];
}

// Hedge entity model for simulations
export interface HedgeEntity {
  id: string;
  name: string;
  type: 'Branch' | 'Subsidiary' | 'Associate';
  navType: 'RE' | 'COI';
  nav: number;
  carExempt: boolean;
  optimalCAR: number;
  alreadyHedged: number;
  parentEntityId?: string;
  overlay?: number;
}

// Simulation output model
export interface SimulationOutput {
  status: 'Approved' | 'Partial' | 'Blocked' | 'NOK';
  reason?: string;
  action?: string;
  trace: TraceEntry[];
  entityAllocations: EntityAllocation[];
  calculatedFields?: Record<string, any>;
}

export interface TraceEntry {
  ruleId: string;
  ruleName: string;
  conditionEvaluation: boolean;
  actionsExecuted: any[];
  inputState?: Record<string, any>;
  outputState?: Record<string, any>;
  timestamp: Date;
}

export interface EntityAllocation {
  entityId: string;
  entityName: string;
  allocation: number;
  availableAmount: number;
  buffer: number;
  navAfterCAR: number;
  exhausted: boolean;
}