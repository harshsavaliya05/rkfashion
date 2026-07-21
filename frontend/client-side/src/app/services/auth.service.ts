import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';

export interface UserAddress {
  id?: string;
  firstName: string;
  lastName: string;
  flatNo: string;
  areaName: string;
  landmark: string;
  city: string;
  state: string;
  postcode: string;
  phone: string;
  addressType: 'home' | 'office';
  isDefault?: boolean;
}

export interface OrderDetail {
  orderId: string;
  date: string;
  items: any[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  shippingAddress: UserAddress;
  userEmail: string;
  statusHistory?: any[];
  returnRequests?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authUrl = 'http://localhost:3000/api/auth';
  private usersUrl = 'http://localhost:3000/api/users';
  private ordersUrl = 'http://localhost:3000/api/orders';

  private authStatusChanged = new BehaviorSubject<boolean>(this.checkLoginStatus());
  authStatusChanged$ = this.authStatusChanged.asObservable();

  constructor(
    private snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient
  ) {}

  private setCookie(name: string, value: string, days?: number) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
  }

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  private eraseCookie(name: string) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
  }

  private checkLoginStatus(): boolean {
    if (typeof window !== 'undefined') {
      return !!this.getCookie('rk_logged_in_user');
    }
    return false;
  }

  isLoggedIn(): boolean {
    return this.checkLoginStatus();
  }

  getLoggedInUser(): any {
    if (typeof window !== 'undefined') {
      const user = this.getCookie('rk_logged_in_user');
      return user ? JSON.parse(decodeURIComponent(user)) : null;
    }
    return null;
  }

  login(credentials: { email: string; password?: string }): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/login`, credentials);
  }

  verifyLogin(email: string, otp: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/verify-login`, { email, otp }).pipe(
      tap(res => {
        if (typeof window !== 'undefined') {
          const user = res.user;
          if (!user.addresses) user.addresses = [];
          this.setCookie('rk_logged_in_user', encodeURIComponent(JSON.stringify(user)), 1);
          if (res.token) {
            this.setCookie('rk_auth_token', res.token, 1);
          }
          this.authStatusChanged.next(true);
        }
      })
    );
  }

  register(userPayload: any): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/register`, userPayload);
  }

  verifyRegister(token: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/verify-register`, { token });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/reset-password`, { token, newPassword });
  }

  logout() {
    if (typeof window !== 'undefined') {
      this.eraseCookie('rk_logged_in_user');
      this.eraseCookie('rk_auth_token');
      this.authStatusChanged.next(false);
      window.location.href = '/';
    }
  }

  triggerLoginModal(mode: 'login' | 'signup' = 'signup') {
    if (mode === 'signup') {
      this.router.navigate(['/register']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  checkAuthAndTriggerModal(actionName: string): boolean {
    if (this.isLoggedIn()) {
      return true;
    }
    
    this.snackBar.open(`⚠️ Guest Account: Please register/login to ${actionName}!`, 'Sign Up', {
      duration: 6000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });

    this.triggerLoginModal('signup');
    return false;
  }

  // Update profile details on PostgreSQL
  updateProfile(fields: { name: string; phone?: string; gender?: string; dob?: string }): Observable<any> {
    const currentUser = this.getLoggedInUser();
    if (!currentUser) throw new Error('Not logged in');

    const updatedUser = { ...currentUser, ...fields };

    return this.http.put(`${this.usersUrl}/${currentUser.id}`, updatedUser).pipe(
      tap((resUser: any) => {
        this.setCookie('rk_logged_in_user', encodeURIComponent(JSON.stringify(resUser)), 1);
        this.authStatusChanged.next(true);
      })
    );
  }

  // Change password on PostgreSQL
  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    const currentUser = this.getLoggedInUser();
    if (!currentUser) throw new Error('Not logged in');

    return this.http.post(`${this.usersUrl}/${currentUser.id}/change-password`, {
      oldPassword,
      newPassword
    });
  }

  // Address management on PostgreSQL
  saveAddress(address: UserAddress, editIndex: number = -1): Observable<any> {
    const currentUser = this.getLoggedInUser();
    if (!currentUser) throw new Error('Not logged in');

    if (!currentUser.addresses) {
      currentUser.addresses = [];
    }

    if (address.isDefault) {
      currentUser.addresses.forEach((addr: UserAddress) => addr.isDefault = false);
    }

    if (editIndex > -1 && editIndex < currentUser.addresses.length) {
      currentUser.addresses[editIndex] = address;
    } else {
      currentUser.addresses.push(address);
    }

    if (currentUser.addresses.length === 1) {
      currentUser.addresses[0].isDefault = true;
    }

    return this.http.put(`${this.usersUrl}/${currentUser.id}`, {
      addresses: currentUser.addresses
    }).pipe(
      tap((resUser: any) => {
        this.setCookie('rk_logged_in_user', encodeURIComponent(JSON.stringify(resUser)), 1);
        this.authStatusChanged.next(true);
      })
    );
  }

  deleteAddress(index: number): Observable<any> {
    const currentUser = this.getLoggedInUser();
    if (!currentUser || !currentUser.addresses) throw new Error('No addresses found');

    if (index > -1 && index < currentUser.addresses.length) {
      const wasDefault = currentUser.addresses[index].isDefault;
      currentUser.addresses.splice(index, 1);
      
      if (wasDefault && currentUser.addresses.length > 0) {
        currentUser.addresses[0].isDefault = true;
      }

      return this.http.put(`${this.usersUrl}/${currentUser.id}`, {
        addresses: currentUser.addresses
      }).pipe(
        tap((resUser: any) => {
          this.setCookie('rk_logged_in_user', encodeURIComponent(JSON.stringify(resUser)), 1);
          this.authStatusChanged.next(true);
        })
      );
    }
    throw new Error('Invalid index');
  }

  // Orders Management on PostgreSQL
  getUserOrders(): Observable<OrderDetail[]> {
    const currentUser = this.getLoggedInUser();
    if (!currentUser) throw new Error('Not logged in');

    return this.http.get<OrderDetail[]>(this.ordersUrl).pipe(
      map(orders => orders.filter((o: any) => o.userEmail.toLowerCase() === currentUser.email.toLowerCase()))
    );
  }

  // Place Order to PostgreSQL API
  addOrder(orderData: Omit<OrderDetail, 'orderId' | 'date' | 'status' | 'userEmail'>): Observable<any> {
    const currentUser = this.getLoggedInUser();
    if (!currentUser) throw new Error('Not logged in');

    const orderId = 'RK-' + Math.floor(100000 + Math.random() * 900000);
    const date = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newOrder = {
      ...orderData,
      orderId,
      date,
      status: 'Pending',
      userEmail: currentUser.email
    };

    return this.http.post(this.ordersUrl, newOrder);
  }
}
