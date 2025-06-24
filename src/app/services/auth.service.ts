import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<any>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    this.initializeUser();
  }

  private initializeUser(): void {
    // Subscribe to the session from Supabase service
    this.supabaseService.getSession().subscribe(session => {
      this.userSubject.next(session?.user || null);
    });
  }

  /**
   * Get the current authenticated user
   */
  getUser(): Observable<any> {
    return this.userSubject.asObservable();
  }

  /**
   * Get loading state
   */
  isLoading(): Observable<boolean> {
    return this.isLoadingSubject.asObservable();
  }

  /**
   * Sign in with email and password
   */
  signIn(email: string, password: string): Observable<any> {
    this.isLoadingSubject.next(true);
    
    return this.supabaseService.signIn(email, password).pipe(
      tap(data => {
        this.userSubject.next(data.user);
      }),
      catchError(error => {
        console.error('Authentication error:', error);
        throw error;
      }),
      tap(() => this.isLoadingSubject.next(false))
    );
  }

  /**
   * Sign up a new user
   */
  signUp(email: string, password: string): Observable<any> {
    this.isLoadingSubject.next(true);
    
    return this.supabaseService.signUp(email, password).pipe(
      tap(data => {
        // User might need to verify email depending on Supabase settings
        if (data.session) {
          this.userSubject.next(data.user);
        }
      }),
      catchError(error => {
        console.error('Registration error:', error);
        throw error;
      }),
      tap(() => this.isLoadingSubject.next(false))
    );
  }

  /**
   * Sign out the current user
   */
  signOut(): Observable<any> {
    this.isLoadingSubject.next(true);
    
    return this.supabaseService.signOut().pipe(
      tap(() => {
        this.userSubject.next(null);
        this.router.navigate(['/login']);
      }),
      catchError(error => {
        console.error('Sign out error:', error);
        throw error;
      }),
      tap(() => this.isLoadingSubject.next(false))
    );
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): Observable<boolean> {
    return this.getUser().pipe(map(user => !!user));
  }

  /**
   * Get user profile information
   */
  getUserProfile(): Observable<any> {
    const userId = this.supabaseService.getCurrentUserId();
    
    if (!userId) {
      return of(null);
    }
    
    return from(this.supabaseService['supabase']
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError(error => {
        console.error('Error fetching user profile:', error);
        return of(null);
      })
    );
  }

  /**
   * Update user profile information
   */
  updateUserProfile(profileData: any): Observable<any> {
    const userId = this.supabaseService.getCurrentUserId();
    
    if (!userId) {
      return of({ success: false, error: 'User not authenticated' });
    }
    
    return from(this.supabaseService['supabase']
      .from('profiles')
      .upsert({ id: userId, ...profileData, updated_at: new Date().toISOString() })
      .select()
      .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return { success: true, data: response.data };
      }),
      catchError(error => {
        console.error('Error updating user profile:', error);
        return of({ success: false, error });
      })
    );
  }

  /**
   * Reset password
   */
  resetPassword(email: string): Observable<any> {
    return from(this.supabaseService['supabase'].auth.resetPasswordForEmail(email)).pipe(
      map(response => {
        if (response.error) throw response.error;
        return { success: true };
      }),
      catchError(error => {
        console.error('Error sending password reset email:', error);
        return of({ success: false, error });
      })
    );
  }
}