import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReviewItem {
  id?: number;
  customer: string;
  email: string;
  productId: number;
  productName: string;
  rating: number;
  text: string;
  date: string;
  helpful: number;
  helpfulByUsers?: string[];
  photos?: string[];
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = 'http://localhost:3000/api/reviews';

  constructor(private http: HttpClient) {}

  getProductReviews(productId: number): Observable<ReviewItem[]> {
    return this.http.get<ReviewItem[]>(`${this.apiUrl}/product/${productId}`);
  }

  submitReview(review: Omit<ReviewItem, 'id' | 'helpful'>): Observable<ReviewItem> {
    return this.http.post<ReviewItem>(this.apiUrl, review);
  }

  markHelpful(id: number, email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/helpful`, { email });
  }

  uploadPhotos(formData: FormData): Observable<{ urls: string[] }> {
    return this.http.post<{ urls: string[] }>(`${this.apiUrl}/upload`, formData);
  }
}
