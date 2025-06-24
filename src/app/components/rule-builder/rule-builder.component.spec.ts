
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RuleBuilderComponent } from './rule-builder.component';
import { RuleService } from '../../services/rule.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

describe('RuleBuilderComponent', () => {
  let component: RuleBuilderComponent;
  let fixture: ComponentFixture<RuleBuilderComponent>;
  let ruleServiceSpy: jasmine.SpyObj<RuleService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('RuleService', ['getRules', 'getFieldDefinitions', 'createRule', 'addRule', 'updateRule', 'deleteRule', 'validateRule']);
    
    await TestBed.configureTestingModule({
      imports: [RuleBuilderComponent],
      providers: [
        { provide: RuleService, useValue: spy },
        MessageService,
        ConfirmationService,
        FormBuilder
      ]
    }).compileComponents();
    
    ruleServiceSpy = TestBed.inject(RuleService) as jasmine.SpyObj<RuleService>;
    ruleServiceSpy.getRules.and.returnValue(of([]));
    ruleServiceSpy.getFieldDefinitions.and.returnValue(of([]));
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RuleBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
