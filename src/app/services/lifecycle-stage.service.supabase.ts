import { Injectable } from '@angular/core';
import { Observable, of, combineLatest, BehaviorSubject } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { LifecycleStage, LifecycleStageStatus } from '../models/lifecycle-stage.model';
import { Rule } from '../models/rule.model';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class LifecycleStageService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Get all lifecycle stages as an observable
   */
  getStages(): Observable<LifecycleStage[]> {
    return this.supabaseService.getLifecycleStages().pipe(
      switchMap(stages => {
        // For each stage, get its rules
        if (stages.length === 0) {
          return of([]);
        }
        
        // Get rules for each stage
        const stageWithRules$ = stages.map(stage =>
          this.getStageRules(stage.id).pipe(
            map(rules => ({
              ...stage,
              rules
            }))
          )
        );
        
        return combineLatest(stageWithRules$);
      }),
      catchError(error => {
        console.error('Error getting stages with rules:', error);
        return of([]);
      })
    );
  }

  /**
   * Get a specific lifecycle stage by ID
   */
  getStageById(id: string): Observable<LifecycleStage | undefined> {
    return this.supabaseService.getLifecycleStageById(id).pipe(
      switchMap(stage => {
        if (!stage) {
          return of(undefined);
        }
        
        // Get rules for the stage
        return this.getStageRules(stage.id).pipe(
          map(rules => ({
            ...stage,
            rules
          }))
        );
      }),
      catchError(error => {
        console.error(`Error getting stage with ID ${id}:`, error);
        return of(undefined);
      })
    );
  }

  /**
   * Track the currently selected stage ID
   */
  // Use BehaviorSubject so components can react to stage changes
  private selectedStageId$ = new BehaviorSubject<string | null>(null);

  /**
   * Get the currently selected stage ID
   */
  getSelectedStageId(): Observable<string | null> {
    return this.selectedStageId$.asObservable();
  }

  /**
   * Get the currently selected stage
   */
  getSelectedStage(): Observable<LifecycleStage | undefined> {
    const stageId = this.selectedStageId$.getValue();
    if (!stageId) {
      return of(undefined);
    }

    return this.getStageById(stageId);
  }

  /**
   * Select a lifecycle stage by ID
   */
  selectStage(id: string): void {
    this.selectedStageId$.next(id);
  }

  /**
   * Add a new lifecycle stage
   */
  addStage(stage: LifecycleStage): Observable<LifecycleStage> {
    return this.supabaseService.createLifecycleStage(stage);
  }

  /**
   * Update an existing lifecycle stage
   */
  updateStage(stage: LifecycleStage): Observable<LifecycleStage | undefined> {
    return this.supabaseService.updateLifecycleStage(stage).pipe(
      map(updatedStage => ({
        ...updatedStage,
        rules: stage.rules // Preserve the rules from the input stage
      })),
      catchError(error => {
        console.error(`Error updating stage with ID ${stage.id}:`, error);
        return of(undefined);
      })
    );
  }

  /**
   * Delete a lifecycle stage by ID
   */
  deleteStage(id: string): Observable<boolean> {
    return this.supabaseService.deleteLifecycleStage(id);
  }

  /**
   * Get all rules for a specific lifecycle stage
   */
  getStageRules(stageId: string): Observable<Rule[]> {
    return this.supabaseService.getStageRules(stageId);
  }

  /**
   * Add a rule to a specific lifecycle stage
   */
  addRuleToStage(stageId: string, rule: Rule): Observable<boolean> {
    return this.supabaseService.addRuleToStage(stageId, rule.id);
  }

  /**
   * Update a rule in a specific lifecycle stage
   */
  updateRuleInStage(stageId: string, rule: Rule): Observable<boolean> {
    // First update the rule itself
    return this.supabaseService.updateRule(rule).pipe(
      map(() => true),
      catchError(error => {
        console.error(`Error updating rule with ID ${rule.id} in stage ${stageId}:`, error);
        return of(false);
      })
    );
  }

  /**
   * Remove a rule from a specific lifecycle stage
   */
  removeRuleFromStage(stageId: string, ruleId: string): Observable<boolean> {
    return this.supabaseService.removeRuleFromStage(stageId, ruleId);
  }

  /**
   * Create a new lifecycle stage
   */
  createStage(name: string, description: string): LifecycleStage {
    // Find the highest sequence number and increment by 1
    const id = this.generateId();
    
    return {
      id,
      name,
      description,
      sequence: 0, // This will be updated after getting all stages
      status: LifecycleStageStatus.DRAFT,
      rules: [],
      icon: 'pi pi-star',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Generate a simple unique ID
   */
  private generateId(): string {
    return 'stage-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}