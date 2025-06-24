import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  title = 'Hedge Lifecycle Rule Builder';
  isAuthenticated = false;
  userName: string | null = null;
  currentYear = new Date().getFullYear();
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}
  
  ngOnInit(): void {
    // Check authentication status
    this.authService.isAuthenticated().subscribe(isAuthenticated => {
      this.isAuthenticated = isAuthenticated;
    });
    
    // Get user info if authenticated
    this.authService.getUser().subscribe(user => {
      this.userName = user?.email || null;
    });
    
    // Track navigation events
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Scroll to top on navigation
      window.scrollTo(0, 0);
    });
  }
  
  logout(): void {
    this.authService.signOut().subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'You have been logged out successfully'
        });
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to log out. Please try again.'
        });
      }
    });
  }
}