import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Import AppRoutingModule
import { AppRoutingModule } from './app-routing.module';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TabViewModule } from 'primeng/tabview';
import { SidebarModule } from 'primeng/sidebar';
import { PasswordModule } from 'primeng/password';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

// Components
import { AppComponent } from './app.component';
// Use Supabase versions of components
import { RuleBuilderComponent } from './components/rule-builder/rule-builder.component.supabase';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';

// Services
import { SupabaseService } from './services/supabase.service';
import { AuthService } from './services/auth.service';
// Use Supabase versions of services
import { RuleService } from './services/rule.service.supabase';
import { LifecycleStageService } from './services/lifecycle-stage.service.supabase';

// Auth Guard
import { AuthGuard } from './guards/auth.guard';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    
    // PrimeNG Modules
    ButtonModule,
    CardModule,
    CheckboxModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    TableModule,
    ToastModule,
    DialogModule,
    ConfirmDialogModule,
    TabViewModule,
    SidebarModule,
    PasswordModule,
    ProgressSpinnerModule,
    
    // Standalone Components
    LoginComponent,
    RegisterComponent,
    RuleBuilderComponent
  ],
  providers: [
    SupabaseService,
    AuthService,
    RuleService,
    LifecycleStageService,
    MessageService,
    ConfirmationService,
    AuthGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }