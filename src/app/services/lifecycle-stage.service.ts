import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { LifecycleStage, LifecycleStageStatus } from '../models/lifecycle-stage.model';
import { Rule, RuleStatus } from '../models/rule.model';
import { RuleService } from './rule.service';

@Injectable({
  providedIn: 'root'
})
export class LifecycleStageService {
  // Predefined lifecycle stages based on the PRD
  private defaultStages: LifecycleStage[] = [
    {
      id: 'stage-1a',
      name: 'Stage 1A: Pre-Utilisation Check',
      description: 'Check conditions before hedge utilization',
      sequence: 1,
      status: LifecycleStageStatus.ACTIVE,
      rules: [],
      icon: 'pi pi-check-circle',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'stage-1b',
      name: 'Stage 1B: FPM Instructions',
      description: 'Process FPM instructions for the hedge',
      sequence: 2,
      status: LifecycleStageStatus.ACTIVE,
      rules: [],
      icon: 'pi pi-file',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'stage-2',
      name: 'Stage 2: Murex Booking',
      description: 'Manage Murex booking process',
      sequence: 3,
      status: LifecycleStageStatus.ACTIVE,
      rules: [],
      icon: 'pi pi-book',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'stage-3',
      name: 'Stage 3: GL Booking',
      description: 'General ledger booking procedures',
      sequence: 4,
      status: LifecycleStageStatus.ACTIVE,
      rules: [],
      icon: 'pi pi-wallet',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'stage-4',
      name: 'Stage 4: Externalization Check',
      description: 'Verify hedge externalization requirements',
      sequence: 5,
      status: LifecycleStageStatus.ACTIVE,
      rules: [],
      icon: 'pi pi-globe',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'stage-5',
      name: 'Stage 5: Daily Monitoring',
      description: 'Regular monitoring of hedge performance',
      sequence: 6,
      status: LifecycleStageStatus.ACTIVE,
      rules: [],
      icon: 'pi pi-chart-line',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'stage-6',
      name: 'Stage 6: Hedge Failure Detected',
      description: 'Actions to take when hedge failure is detected',
      sequence: 7,
      status: LifecycleStageStatus.ACTIVE,
      rules: [],
      icon: 'pi pi-exclamation-triangle',
      createdAt: new Date(),
      updatedAt: new Date()
    },
  ];

  // Local storage of lifecycle stages
  private stages: LifecycleStage[] = [];
  private stagesSubject = new BehaviorSubject<LifecycleStage[]>([]);
  private selectedStageId = new BehaviorSubject<string | null>(null);

  constructor(private ruleService: RuleService) {
    // Load stages from localStorage on initialization or use defaults
    this.loadStages();

    // If no stages were loaded, initialize with defaults
    if (this.stages.length === 0) {
      this.stages = [...this.defaultStages];
      this.saveStages();
    }

    // Initialize the subject with the loaded stages
    this.stagesSubject.next([...this.stages]);

    // Select the first stage by default if available
    if (this.stages.length > 0) {
      this.selectStage(this.stages[0].id);
    }

    // Pre-populated the Stage 1A (Pre-Utilisation Check) with rules as specified in PRD
    this.setupStage1ARules();
  }

  /**
   * Get all lifecycle stages as an observable
   */
  getStages(): Observable<LifecycleStage[]> {
    return this.stagesSubject.asObservable();
  }

  /**
   * Get a specific lifecycle stage by ID
   */
  getStageById(id: string): Observable<LifecycleStage | undefined> {
    return this.stagesSubject.pipe(
      map(stages => stages.find(stage => stage.id === id))
    );
  }

  /**
   * Get the currently selected stage ID
   */
  getSelectedStageId(): Observable<string | null> {
    return this.selectedStageId.asObservable();
  }

  /**
   * Get the currently selected stage
   */
  getSelectedStage(): Observable<LifecycleStage | undefined> {
    return this.selectedStageId.pipe(
      map(id => id ? this.stages.find(stage => stage.id === id) : undefined)
    );
  }

  /**
   * Select a lifecycle stage by ID
   */
  selectStage(id: string): void {
    this.selectedStageId.next(id);
  }

  /**
   * Add a new lifecycle stage
   */
  addStage(stage: LifecycleStage): Observable<LifecycleStage> {
    this.stages.push(stage);
    this.stagesSubject.next([...this.stages]);
    this.saveStages();
    return of(stage);
  }

  /**
   * Update an existing lifecycle stage
   */
  updateStage(stage: LifecycleStage): Observable<LifecycleStage | undefined> {
    const index = this.stages.findIndex(s => s.id === stage.id);
    if (index !== -1) {
      this.stages[index] = { ...stage, updatedAt: new Date() };
      this.stagesSubject.next([...this.stages]);
      this.saveStages();
      return of(this.stages[index]);
    }
    return of(undefined);
  }

  /**
   * Delete a lifecycle stage by ID
   */
  deleteStage(id: string): Observable<boolean> {
    const initialLength = this.stages.length;
    this.stages = this.stages.filter(stage => stage.id !== id);
    
    if (initialLength !== this.stages.length) {
      // If the deleted stage was selected, select the first remaining stage
      if (this.selectedStageId.value === id && this.stages.length > 0) {
        this.selectStage(this.stages[0].id);
      }
      
      this.stagesSubject.next([...this.stages]);
      this.saveStages();
      return of(true);
    }
    
    return of(false);
  }

  /**
   * Get all rules for a specific lifecycle stage
   */
  getStageRules(stageId: string): Observable<Rule[]> {
    const stage = this.stages.find(s => s.id === stageId);
    return of(stage?.rules || []);
  }

  /**
   * Add a rule to a specific lifecycle stage
   */
  addRuleToStage(stageId: string, rule: Rule): Observable<boolean> {
    const stage = this.stages.find(s => s.id === stageId);
    if (stage) {
      stage.rules.push(rule);
      stage.updatedAt = new Date();
      this.stagesSubject.next([...this.stages]);
      this.saveStages();
      return of(true);
    }
    return of(false);
  }

  /**
   * Update a rule in a specific lifecycle stage
   */
  updateRuleInStage(stageId: string, rule: Rule): Observable<boolean> {
    const stage = this.stages.find(s => s.id === stageId);
    if (stage) {
      const index = stage.rules.findIndex(r => r.id === rule.id);
      if (index !== -1) {
        stage.rules[index] = { ...rule, updatedAt: new Date() };
        stage.updatedAt = new Date();
        this.stagesSubject.next([...this.stages]);
        this.saveStages();
        return of(true);
      }
    }
    return of(false);
  }

  /**
   * Remove a rule from a specific lifecycle stage
   */
  removeRuleFromStage(stageId: string, ruleId: string): Observable<boolean> {
    const stage = this.stages.find(s => s.id === stageId);
    if (stage) {
      const initialLength = stage.rules.length;
      stage.rules = stage.rules.filter(r => r.id !== ruleId);
      
      if (initialLength !== stage.rules.length) {
        stage.updatedAt = new Date();
        this.stagesSubject.next([...this.stages]);
        this.saveStages();
        return of(true);
      }
    }
    return of(false);
  }

  /**
   * Create a new lifecycle stage
   */
  createStage(name: string, description: string): LifecycleStage {
    // Find the highest sequence number and increment by 1
    const maxSequence = this.stages.reduce((max, stage) => 
      stage.sequence > max ? stage.sequence : max, 0);

    return {
      id: this.generateId(),
      name,
      description,
      sequence: maxSequence + 1,
      status: LifecycleStageStatus.DRAFT,
      rules: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Private helper methods
   */

  /**
   * Generate a simple unique ID
   */
  private generateId(): string {
    return 'stage-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Save stages to localStorage
   */
  private saveStages(): void {
    try {
      localStorage.setItem('hedgeLifecycleStages', JSON.stringify(this.stages));
    } catch (error) {
      console.error('Error saving stages to localStorage:', error);
    }
  }

  /**
   * Load stages from localStorage
   */
  private loadStages(): void {
    try {
      const savedStages = localStorage.getItem('hedgeLifecycleStages');
      if (savedStages) {
        this.stages = JSON.parse(savedStages);
        
        // Convert string dates back to Date objects
        this.stages = this.stages.map(stage => ({
          ...stage,
          createdAt: new Date(stage.createdAt),
          updatedAt: new Date(stage.updatedAt)
        }));
      }
    } catch (error) {
      console.error('Error loading stages from localStorage:', error);
    }
  }

  /**
   * Setup the predefined rules for Stage 1A (Pre-Utilisation Check)
   */
  private setupStage1ARules(): void {
    // Find Stage 1A
    const stage1A = this.stages.find(s => s.id === 'stage-1a');
    if (stage1A && stage1A.rules.length === 0) {
      // Create the 10 rules defined in the PRD
      const rule1 = this.ruleService.createRule('Message Validation');
      rule1.description = 'Validates that required message fields are present';
      rule1.status = RuleStatus.ACTIVE;
      
      // Add more rules per the PRD requirements
      // In a real implementation, we'd populate all 10 rules with appropriate conditions and actions

      // Add the rules to the stage
      stage1A.rules.push(rule1);
      // Add more rules...

      // Update the stage
      this.stagesSubject.next([...this.stages]);
      this.saveStages();
    }
  }
}