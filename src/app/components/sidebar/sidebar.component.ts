import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LifecycleStageService } from '../../services/lifecycle-stage.service';
import { LifecycleStage, LifecycleStageStatus } from '../../models/lifecycle-stage.model';

// PrimeNG imports
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarModule,
    ButtonModule,
    RippleModule,
    DividerModule,
    TooltipModule,
    BadgeModule
  ],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent implements OnInit {
  stages: LifecycleStage[] = [];
  selectedStageId: string | null = null;
  LifecycleStageStatus = LifecycleStageStatus; // For use in template

  constructor(
    private lifecycleStageService: LifecycleStageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to the lifecycle stages
    this.lifecycleStageService.getStages().subscribe(stages => {
      this.stages = stages.sort((a, b) => a.sequence - b.sequence);
    });

    // Subscribe to the selected stage ID
    this.lifecycleStageService.getSelectedStageId().subscribe(id => {
      this.selectedStageId = id;
    });
  }

  /**
   * Select a lifecycle stage
   */
  selectStage(stageId: string): void {
    this.lifecycleStageService.selectStage(stageId);
  }

  /**
   * Check if a stage is selected
   */
  isSelected(stageId: string): boolean {
    return this.selectedStageId === stageId;
  }

  /**
   * Get the number of rules for a stage
   */
  getRuleCount(stage: LifecycleStage): number {
    return stage.rules.length;
  }

  /**
   * Get the number of active rules for a stage
   */
  getActiveRuleCount(stage: LifecycleStage): number {
    return stage.rules.filter(rule => rule.status === 'active').length;
  }

  /**
   * Get the CSS class for the selection indicator
   */
  getSelectionClass(stageId: string): string {
    return this.isSelected(stageId) ? 'bg-blue-50 border-l-4 border-blue-500' : '';
  }

  /**
   * Get the severity class for the stage status
   */
  getStatusSeverity(status: LifecycleStageStatus): string {
    switch (status) {
      case LifecycleStageStatus.ACTIVE:
        return 'success';
      case LifecycleStageStatus.INACTIVE:
        return 'danger';
      case LifecycleStageStatus.DRAFT:
        return 'warning';
      default:
        return 'info';
    }
  }
}