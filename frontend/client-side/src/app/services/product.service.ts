import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ProductColor {
  name: string;
  class: string;
  hex: string;
  image: string;
  images?: string[];
  sizes?: string[];
}

export interface ProductItem {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  offers?: string[];
  image: string;
  images: string[];
  label?: string;
  rating: number;
  description: string;
  sizes: string[];
  colors: ProductColor[];
  category: string;
  sku: string;
  variants?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:3000/api/products';

  constructor(private http: HttpClient) {}

  getProducts(): Observable<ProductItem[]> {
    return this.http.get<ProductItem[]>(this.apiUrl).pipe(
      map(products => products.filter((p: any) => p.status === 'published'))
    );
  }

  getProductById(id: number): Observable<ProductItem> {
    return this.http.get<ProductItem>(`${this.apiUrl}/${id}`);
  }
}
