import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private loggedInSubject = new BehaviorSubject<boolean>(this.hasToken());

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private hasToken(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem('adminToken');
    }
    return false;
  }

  isLoggedIn(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('adminToken');
      const userStr = localStorage.getItem('adminUser');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        return user.role && user.role.toLowerCase() === 'admin';
      }
    }
    return false;
  }

  get isLoggedIn$(): Observable<boolean> {
    return this.loggedInSubject.asObservable();
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin-login`, { email, password }).pipe(
      tap((res: any) => {
        if (res.token && res.user && res.user.role && res.user.role.toLowerCase() === 'admin') {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('adminToken', res.token);
            localStorage.setItem('adminUser', JSON.stringify(res.user));
          }
          this.loggedInSubject.next(true);
        }
      })
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
    }
    this.loggedInSubject.next(false);
    this.router.navigate(['/login']);
  }
}
