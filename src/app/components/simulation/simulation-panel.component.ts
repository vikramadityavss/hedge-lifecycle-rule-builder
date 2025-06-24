import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ChipModule } from 'primeng/chip';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { SimulationService } from '../../services/simulation.service';
import { LifecycleStageService } from '../../services/lifecycle-stage.service';
import { 
  SimulationEnvironment, 
  HedgeEntity, 
  SimulationOutput, 
  TraceEntry, 
  EntityAllocation 
} from '../../models/lifecycle-stage.model';
import { Rule, RuleAction } from '../../models/rule.model';

@Component({
  selector: 'app-simulation-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    DividerModule,
    DropdownModule,
    InputTextModule,
    InputNumberModule,
    InputSwitchModule,
    TableModule,
    ToastModule,
    TooltipModule,
    ChipModule,
    CheckboxModule,
    TagModule,
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  templateUrl: './simulation-panel.component.html'
})
export class SimulationPanelComponent implements OnInit {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  simulationForm: FormGroup;
  entityTypeOptions = [
    { label: 'Branch', value: 'Branch' },
    { label: 'Subsidiary', value: 'Subsidiary' },
    { label: 'Associate', value: 'Associate' }
  ];
  navTypeOptions = [
    { label: 'RE', value: 'RE' },
    { label: 'COI', value: 'COI' }
  ];
  
  selectedStageId: string | null = null;
  stageName = '';
  stageRules: Rule[] = [];
  
  isSimulating = false;
  simulationResult: SimulationOutput | null = null;
  traceLog: TraceEntry[] = [];
  entityAllocations: EntityAllocation[] = [];
  
  constructor(
    private fb: FormBuilder,
    private simulationService: SimulationService,
    private lifecycleStageService: LifecycleStageService,
    private messageService: MessageService
  ) {
    this.simulationForm = this.fb.group({
      instructionType: ['', Validators.required],
      exposureCurrency: ['', Validators.required],
      hedgeAmount: [0, [Validators.required, Validators.min(0)]],
      usdPbDepo: [0, [Validators.required, Validators.min(0)]],
      optimalCAR: [0, [Validators.required, Validators.min(0)]],
      entities: this.fb.array([])
    });
    
    // Add a default entity row
    this.addEntity();
  }

  ngOnInit(): void {
    // Get the currently selected stage
    this.lifecycleStageService.getSelectedStageId().subscribe(stageId => {
      if (stageId) {
        this.selectedStageId = stageId;
        
        // Get the stage details and rules
        this.lifecycleStageService.getStageById(stageId).subscribe(stage => {
          if (stage) {
            this.stageName = stage.name;
            this.stageRules = stage.rules;
          }
        });
      }
    });
    
    // Load previously saved simulation environment if available
    this.loadSimulationEnvironment();
  }

  // Entity form array control
  get entities(): FormArray {
    return this.simulationForm.get('entities') as FormArray;
  }
  
  // Add a new entity to the form
  addEntity(): void {
    const entityForm = this.fb.group({
      id: [this.generateEntityId()],
      name: ['', Validators.required],
      type: ['Branch', Validators.required],
      navType: ['RE', Validators.required],
      nav: [0, [Validators.required, Validators.min(0)]],
      carExempt: [false],
      optimalCAR: [0, [Validators.min(0)]],
      alreadyHedged: [0, [Validators.min(0)]],
      parentEntityId: [''],
      overlay: [0]
    });
    
    this.entities.push(entityForm);
  }
  
  // Remove an entity from the form
  removeEntity(index: number): void {
    this.entities.removeAt(index);
  }
  
  // Close the simulation panel
  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
  
  // Save current simulation environment
  saveSimulationEnvironment(): void {
    if (!this.selectedStageId || this.simulationForm.invalid) {
      return;
    }
    
    const formValue = this.simulationForm.value;
    
    const environment: SimulationEnvironment = {
      stageId: this.selectedStageId,
      inputData: {
        instructionType: formValue.instructionType,
        exposureCurrency: formValue.exposureCurrency,
        hedgeAmount: formValue.hedgeAmount,
        usdPbDepo: formValue.usdPbDepo,
        optimalCAR: formValue.optimalCAR
      },
      entities: formValue.entities
    };
    
    this.simulationService.saveSimulationEnvironment(environment);
    
    this.messageService.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Simulation environment saved'
    });
  }
  
  // Load saved simulation environment
  loadSimulationEnvironment(): void {
    if (!this.selectedStageId) {
      return;
    }
    
    this.simulationService.getSimulationEnvironment(this.selectedStageId).subscribe(environment => {
      if (environment) {
        // Clear entity form array
        while (this.entities.length) {
          this.entities.removeAt(0);
        }
        
        // Set main form values
        this.simulationForm.patchValue({
          instructionType: environment.inputData['instructionType'] || '',
          exposureCurrency: environment.inputData['exposureCurrency'] || '',
          hedgeAmount: environment.inputData['hedgeAmount'] || 0,
          usdPbDepo: environment.inputData['usdPbDepo'] || 0,
          optimalCAR: environment.inputData['optimalCAR'] || 0
        });
        
        // Add entities
        if (environment.entities && environment.entities.length > 0) {
          environment.entities.forEach(entity => {
            const entityForm = this.fb.group({
              id: [entity.id || this.generateEntityId()],
              name: [entity.name || '', Validators.required],
              type: [entity.type || 'Branch', Validators.required],
              navType: [entity.navType || 'RE', Validators.required],
              nav: [entity.nav || 0, [Validators.required, Validators.min(0)]],
              carExempt: [entity.carExempt || false],
              optimalCAR: [entity.optimalCAR || 0, [Validators.min(0)]],
              alreadyHedged: [entity.alreadyHedged || 0, [Validators.min(0)]],
              parentEntityId: [entity.parentEntityId || ''],
              overlay: [entity.overlay || 0]
            });
            
            this.entities.push(entityForm);
          });
        }
      }
    });
  }
  
  // Run simulation
  runSimulation(): void {
    if (this.simulationForm.invalid || !this.selectedStageId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please complete all required fields'
      });
      return;
    }
    
    // Reset previous results
    this.isSimulating = true;
    this.simulationResult = null;
    this.traceLog = [];
    this.entityAllocations = [];
    
    const formValue = this.simulationForm.value;
    
    // Create the simulation data object
    const simulationData = {
      instructionType: formValue.instructionType,
      exposureCurrency: formValue.exposureCurrency,
      hedgeAmount: formValue.hedgeAmount,
      usdPbDepo: formValue.usdPbDepo,
      optimalCAR: formValue.optimalCAR,
      entities: formValue.entities
    };
    
    // Save the current environment
    this.saveSimulationEnvironment();
    
    // Run the simulation
    this.simulationService.runSimulation(this.selectedStageId, simulationData).subscribe({
      next: (result) => {
        this.simulationResult = result;
        this.traceLog = result.trace;
        this.entityAllocations = result.entityAllocations;
        this.isSimulating = false;
      },
      error: (error) => {
        console.error('Simulation error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Simulation Error',
          detail: 'An error occurred while running the simulation'
        });
        this.isSimulating = false;
      }
    });
  }
  
  // Reset the form
  resetForm(): void {
    this.simulationForm.reset({
      instructionType: '',
      exposureCurrency: '',
      hedgeAmount: 0,
      usdPbDepo: 0,
      optimalCAR: 0
    });
    
    // Clear entity form array
    while (this.entities.length) {
      this.entities.removeAt(0);
    }
    
    // Add a default entity row
    this.addEntity();
    
    // Clear results
    this.simulationResult = null;
    this.traceLog = [];
    this.entityAllocations = [];
  }
  
  // Helper to generate a unique entity ID
  private generateEntityId(): string {
    return 'entity-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
  
  // Helpers for UI
  getStatusSeverity(status: string): PrimeNg.Severity {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Partial':
        return 'warning';
      case 'Blocked':
      case 'NOK':
        return 'danger';
      default:
        return 'info';
    }
  }
  
  getValueDisplay(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return value.toString();
  }
  
  // Track trace items by index for better performance
  trackByFn(index: number): number {
    return index;
  }
}