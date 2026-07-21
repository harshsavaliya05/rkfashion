import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Category {
  id: number;
  name: string;
  cursive?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = 'http://localhost:3000/api/categories';

  constructor(private http: HttpClient) {}

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }

  saveCategory(category: any): Observable<Category> {
    if (category.id) {
      return this.http.put<Category>(`${this.apiUrl}/${category.id}`, category);
    }
    return this.http.post<Category>(this.apiUrl, category);
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  uploadMedia(file: File): Observable<{ imageUrl?: string; videoUrl?: string }> {
    const formData = new FormData();
    formData.append('media', file);
    return this.http.post<{ imageUrl?: string; videoUrl?: string }>(`${this.apiUrl}/upload`, formData);
  }
}
