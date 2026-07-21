import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Coupon {
  id?: number;
  code: string;
  discountType: 'flat' | 'percentage';
  discountValue: number;
  minCartValue: number;
  maxDiscount?: number | null;
  description: string;
  createdAt?: string;
  expiryDays?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  private apiUrl = 'http://localhost:3000/api/coupons';

  constructor(private http: HttpClient) {}

  getCoupons(): Observable<Coupon[]> {
    return this.http.get<Coupon[]>(this.apiUrl);
  }

  saveCoupon(coupon: any): Observable<Coupon> {
    if (coupon.id) {
      return this.http.put<Coupon>(`${this.apiUrl}/${coupon.id}`, coupon);
    }
    return this.http.post<Coupon>(this.apiUrl, coupon);
  }

  deleteCoupon(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
