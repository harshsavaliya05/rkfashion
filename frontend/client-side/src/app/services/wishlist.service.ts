import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { ProductItem } from './product.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private wishlistItems: ProductItem[] = [];
  wishlistUpdated$ = new BehaviorSubject<ProductItem[]>([]);

  constructor(private http: HttpClient, private authService: AuthService) {
    // Automatically load wishlist when auth state changes (login, logout, refresh)
    this.authService.authStatusChanged$.subscribe(() => {
      this.loadWishlist();
    });
  }

  private loadWishlist() {
    const user = this.authService.getLoggedInUser();
    if (user && user.id) {
      this.http.get<ProductItem[]>(`http://localhost:3000/api/users/${user.id}/wishlist`).subscribe({
        next: (items) => {
          this.wishlistItems = items || [];
          this.wishlistUpdated$.next(this.wishlistItems);
        },
        error: (err) => {
          console.error('Error loading wishlist from Postgres:', err);
          this.wishlistItems = [];
          this.wishlistUpdated$.next([]);
        }
      });
    } else {
      this.wishlistItems = [];
      this.wishlistUpdated$.next([]);
    }
  }

  private saveWishlist() {
    const user = this.authService.getLoggedInUser();
    if (user && user.id) {
      this.http.put<ProductItem[]>(`http://localhost:3000/api/users/${user.id}/wishlist`, {
        wishlist: this.wishlistItems
      }).subscribe({
        next: (items) => {
          this.wishlistItems = items || [];
          this.wishlistUpdated$.next(this.wishlistItems);
        },
        error: (err) => {
          console.error('Error saving wishlist to Postgres:', err);
        }
      });
    }
  }

  getWishlistItems(): ProductItem[] {
    return this.wishlistItems;
  }

  getWishlistCount(): number {
    return this.wishlistItems.length;
  }

  isInWishlist(productId: number): boolean {
    return this.wishlistItems.some(item => item.id === productId);
  }

  addToWishlist(product: ProductItem) {
    if (!this.isInWishlist(product.id)) {
      this.wishlistItems.push(product);
      this.saveWishlist();
    }
  }

  removeFromWishlist(productId: number) {
    this.wishlistItems = this.wishlistItems.filter(item => item.id !== productId);
    this.saveWishlist();
  }

  toggleWishlist(product: ProductItem) {
    if (this.isInWishlist(product.id)) {
      this.removeFromWishlist(product.id);
    } else {
      this.addToWishlist(product);
    }
  }
}
