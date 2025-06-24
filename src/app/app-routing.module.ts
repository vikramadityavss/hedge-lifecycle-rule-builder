import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { RuleBuilderComponent } from './components/rule-builder/rule-builder.component.supabase';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  // Auth routes
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  
  // Main application routes - protected by AuthGuard
  { 
    path: '', 
    component: RuleBuilderComponent, 
    canActivate: [AuthGuard] 
  },
  
  // Redirect any unknown paths to the main page
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }