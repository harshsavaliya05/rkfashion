import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { map } from 'rxjs/operators';

export interface Review {
  id: number;
  customer: string;
  email: string;
  product: string;
  productId: number;
  rating: number;
  text: string;
  date: string;
  status: 'approved' | 'pending' | 'rejected';
  photos?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = 'http://localhost:3000/api/reviews';

  constructor(private http: HttpClient) {}

  getAllReviews(): Observable<Review[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(reviews => reviews.map(r => ({
        id: r.id,
        customer: r.customer,
        email: r.email,
        product: r.productName,
        productId: r.productId,
        rating: r.rating,
        text: r.text,
        date: r.date,
        status: r.status,
        photos: r.photos || []
      })))
    );
  }

  updateReviewStatus(id: number, status: 'approved' | 'pending' | 'rejected'): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, { status });
  }

  deleteReview(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
