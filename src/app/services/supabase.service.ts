import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { 
  Rule, 
  RuleCondition,
  RuleAction,
  RuleStatus,
  RulePriority,
  LogicalOperator,
  ActionType,
  FieldDefinition
} from '../models/rule.model';
import { LifecycleStage, LifecycleStageStatus } from '../models/lifecycle-stage.model';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private userSession = new BehaviorSubject<any>(null);
  private isInitialized = false;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    this.initializeSupabase();
  }

  private initializeSupabase(): void {
    // Check for existing session
    this.supabase.auth.getSession().then(({ data, error }) => {
      if (!error && data.session) {
        this.userSession.next(data.session);
      }
    });

    // Set up auth state change listener
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.userSession.next(session);
      this.isInitialized = true;
    });
  }

  // Authentication methods

  /**
   * Sign in with email and password
   */
  signIn(email: string, password: string): Observable<any> {
    return from(this.supabase.auth.signInWithPassword({ email, password }))
      .pipe(
        map(response => {
          if (response.error) throw response.error;
          return response.data;
        }),
        catchError(error => {
          console.error('Sign in error:', error);
          throw error;
        })
      );
  }

  /**
   * Sign up a new user with email and password
   */
  signUp(email: string, password: string): Observable<any> {
    return from(this.supabase.auth.signUp({ email, password }))
      .pipe(
        map(response => {
          if (response.error) throw response.error;
          return response.data;
        }),
        catchError(error => {
          console.error('Sign up error:', error);
          throw error;
        })
      );
  }

  /**
   * Sign out the current user
   */
  signOut(): Observable<any> {
    return from(this.supabase.auth.signOut())
      .pipe(
        map(response => {
          if (response.error) throw response.error;
          return response;
        }),
        catchError(error => {
          console.error('Sign out error:', error);
          throw error;
        })
      );
  }

  /**
   * Get the current user session
   */
  getSession(): Observable<any> {
    return this.userSession.asObservable();
  }

  /**
   * Get the current user ID
   */
  getCurrentUserId(): string | null {
    const session = this.userSession.value;
    return session?.user?.id || null;
  }

  /**
   * Check if the current user is authenticated
   */
  isAuthenticated(): Observable<boolean> {
    return this.getSession().pipe(map(session => !!session));
  }

  // Rule CRUD operations

  /**
   * Get all rules from Supabase
   */
  getRules(): Observable<Rule[]> {
    return from(this.supabase
      .from('rules')
      .select('*')
      .order('updatedAt', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.processRules(response.data || []);
      }),
      catchError(error => {
        console.error('Error fetching rules:', error);
        return of([]);
      })
    );
  }

  /**
   * Get rules for a specific lifecycle stage
   */
  getRulesByStageId(stageId: string): Observable<Rule[]> {
    return from(this.supabase
      .from('stage_rules')
      .select('rule_id')
      .eq('stage_id', stageId)
    ).pipe(
      switchMap(response => {
        if (response.error) throw response.error;
        
        const ruleIds = (response.data || []).map(r => r.rule_id);
        if (ruleIds.length === 0) return of([]);
        
        return from(this.supabase
          .from('rules')
          .select('*')
          .in('id', ruleIds)
        ).pipe(
          map(rulesResponse => {
            if (rulesResponse.error) throw rulesResponse.error;
            return this.processRules(rulesResponse.data || []);
          })
        );
      }),
      catchError(error => {
        console.error('Error fetching rules for stage:', error);
        return of([]);
      })
    );
  }

  /**
   * Get a rule by ID
   */
  getRuleById(id: string): Observable<Rule | null> {
    return from(this.supabase
      .from('rules')
      .select('*')
      .eq('id', id)
      .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data ? this.processRule(response.data) : null;
      }),
      catchError(error => {
        console.error(`Error fetching rule with ID ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Create a new rule
   */
  createRule(rule: Rule): Observable<Rule> {
    const userId = this.getCurrentUserId();
    const ruleData = {
      ...this.prepareRuleForDb(rule),
      created_by: userId,
      updated_by: userId
    };

    return from(this.supabase
      .from('rules')
      .insert(ruleData)
      .select()
      .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.processRule(response.data!);
      }),
      catchError(error => {
        console.error('Error creating rule:', error);
        throw error;
      })
    );
  }

  /**
   * Update an existing rule
   */
  updateRule(rule: Rule): Observable<Rule> {
    const ruleData = {
      ...this.prepareRuleForDb(rule),
      updated_by: this.getCurrentUserId(),
      updated_at: new Date().toISOString()
    };

    return from(this.supabase
      .from('rules')
      .update(ruleData)
      .eq('id', rule.id)
      .select()
      .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.processRule(response.data!);
      }),
      catchError(error => {
        console.error(`Error updating rule with ID ${rule.id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Delete a rule by ID
   */
  deleteRule(id: string): Observable<boolean> {
    return from(this.supabase
      .from('rules')
      .delete()
      .eq('id', id)
    ).pipe(
      switchMap(response => {
        if (response.error) throw response.error;
        
        // Also remove the rule from stage_rules mapping table
        return from(this.supabase
          .from('stage_rules')
          .delete()
          .eq('rule_id', id)
        );
      }),
      map(response => {
        if (response.error) throw response.error;
        return true;
      }),
      catchError(error => {
        console.error(`Error deleting rule with ID ${id}:`, error);
        return of(false);
      })
    );
  }

  // Lifecycle Stage CRUD operations

  /**
   * Get all lifecycle stages
   */
  getLifecycleStages(): Observable<LifecycleStage[]> {
    return from(this.supabase
      .from('lifecycle_stages')
      .select('*')
      .order('sequence', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.processLifecycleStages(response.data || []);
      }),
      catchError(error => {
        console.error('Error fetching lifecycle stages:', error);
        return of([]);
      })
    );
  }

  /**
   * Get a lifecycle stage by ID
   */
  getLifecycleStageById(id: string): Observable<LifecycleStage | null> {
    return from(this.supabase
      .from('lifecycle_stages')
      .select('*')
      .eq('id', id)
      .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data ? this.processLifecycleStage(response.data) : null;
      }),
      catchError(error => {
        console.error(`Error fetching lifecycle stage with ID ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Create a new lifecycle stage
   */
  createLifecycleStage(stage: LifecycleStage): Observable<LifecycleStage> {
    const userId = this.getCurrentUserId();
    const stageData = {
      ...this.prepareLifecycleStageForDb(stage),
      created_by: userId,
      updated_by: userId
    };

    return from(this.supabase
      .from('lifecycle_stages')
      .insert(stageData)
      .select()
      .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.processLifecycleStage(response.data!);
      }),
      catchError(error => {
        console.error('Error creating lifecycle stage:', error);
        throw error;
      })
    );
  }

  /**
   * Update an existing lifecycle stage
   */
  updateLifecycleStage(stage: LifecycleStage): Observable<LifecycleStage> {
    const stageData = {
      ...this.prepareLifecycleStageForDb(stage),
      updated_by: this.getCurrentUserId(),
      updated_at: new Date().toISOString()
    };

    return from(this.supabase
      .from('lifecycle_stages')
      .update(stageData)
      .eq('id', stage.id)
      .select()
      .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.processLifecycleStage(response.data!);
      }),
      catchError(error => {
        console.error(`Error updating lifecycle stage with ID ${stage.id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Delete a lifecycle stage by ID
   */
  deleteLifecycleStage(id: string): Observable<boolean> {
    return from(this.supabase
      .from('lifecycle_stages')
      .delete()
      .eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return true;
      }),
      catchError(error => {
        console.error(`Error deleting lifecycle stage with ID ${id}:`, error);
        return of(false);
      })
    );
  }

  // Stage-Rule relationship methods

  /**
   * Add a rule to a stage
   */
  addRuleToStage(stageId: string, ruleId: string): Observable<boolean> {
    return from(this.supabase
      .from('stage_rules')
      .insert({
        stage_id: stageId,
        rule_id: ruleId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: this.getCurrentUserId(),
        updated_by: this.getCurrentUserId()
      })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return true;
      }),
      catchError(error => {
        console.error('Error adding rule to stage:', error);
        return of(false);
      })
    );
  }

  /**
   * Remove a rule from a stage
   */
  removeRuleFromStage(stageId: string, ruleId: string): Observable<boolean> {
    return from(this.supabase
      .from('stage_rules')
      .delete()
      .eq('stage_id', stageId)
      .eq('rule_id', ruleId)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return true;
      }),
      catchError(error => {
        console.error('Error removing rule from stage:', error);
        return of(false);
      })
    );
  }

  /**
   * Get all rules for a stage
   */
  getStageRules(stageId: string): Observable<Rule[]> {
    return this.getRulesByStageId(stageId);
  }

  // Field Definitions

  /**
   * Get available field definitions from Supabase
   */
  getFieldDefinitions(): Observable<FieldDefinition[]> {
    return from(this.supabase
      .from('field_definitions')
      .select('*')
      .order('name', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.processFieldDefinitions(response.data || []);
      }),
      catchError(error => {
        console.error('Error fetching field definitions:', error);
        return of([]);
      })
    );
  }

  // Helper methods for data transformation

  /**
   * Process rules from the database format to the application model
   */
  private processRules(dbRules: any[]): Rule[] {
    return dbRules.map(dbRule => this.processRule(dbRule));
  }

  /**
   * Process a single rule from the database format to the application model
   */
  private processRule(dbRule: any): Rule {
    const rule: Rule = {
      id: dbRule.id,
      name: dbRule.name,
      description: dbRule.description,
      conditions: dbRule.conditions,
      actions: dbRule.actions,
      status: dbRule.status as RuleStatus,
      priority: dbRule.priority as RulePriority,
      createdAt: new Date(dbRule.created_at),
      updatedAt: new Date(dbRule.updated_at),
      createdBy: dbRule.created_by,
      updatedBy: dbRule.updated_by,
      tags: dbRule.tags,
      category: dbRule.category
    };

    return rule;
  }

  /**
   * Prepare a rule for saving to the database
   */
  private prepareRuleForDb(rule: Rule): any {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      conditions: rule.conditions,
      actions: rule.actions,
      status: rule.status,
      priority: rule.priority,
      created_at: rule.createdAt.toISOString(),
      updated_at: rule.updatedAt.toISOString(),
      tags: rule.tags,
      category: rule.category
    };
  }

  /**
   * Process lifecycle stages from the database format to the application model
   */
  private processLifecycleStages(dbStages: any[]): LifecycleStage[] {
    return dbStages.map(dbStage => this.processLifecycleStage(dbStage));
  }

  /**
   * Process a single lifecycle stage from the database format to the application model
   */
  private processLifecycleStage(dbStage: any): LifecycleStage {
    const stage: LifecycleStage = {
      id: dbStage.id,
      name: dbStage.name,
      description: dbStage.description,
      sequence: dbStage.sequence,
      status: dbStage.status as LifecycleStageStatus,
      rules: [], // Rules will be fetched separately
      icon: dbStage.icon,
      createdAt: new Date(dbStage.created_at),
      updatedAt: new Date(dbStage.updated_at)
    };

    return stage;
  }

  /**
   * Prepare a lifecycle stage for saving to the database
   */
  private prepareLifecycleStageForDb(stage: LifecycleStage): any {
    return {
      id: stage.id,
      name: stage.name,
      description: stage.description,
      sequence: stage.sequence,
      status: stage.status,
      icon: stage.icon,
      created_at: stage.createdAt.toISOString(),
      updated_at: stage.updatedAt.toISOString()
    };
  }

  /**
   * Process field definitions from the database format to the application model
   */
  private processFieldDefinitions(dbFields: any[]): FieldDefinition[] {
    return dbFields.map(dbField => ({
      id: dbField.id,
      name: dbField.name,
      type: dbField.type,
      options: dbField.options,
      description: dbField.description
    }));
  }
}