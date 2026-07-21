import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RecentlyViewedService {
  private readonly STORAGE_KEY = 'recently_viewed_products';
  private readonly MAX_ITEMS = 8;

  constructor() {}

  addProduct(productId: number): void {
    if (!productId) return;

    let items = this.getRecentlyViewedProductIds();
    
    // Remove if already exists so we can move it to the front
    items = items.filter(id => id !== productId);
    
    // Add to the front of the list
    items.unshift(productId);
    
    // Limit to max items
    if (items.length > this.MAX_ITEMS) {
      items = items.slice(0, this.MAX_ITEMS);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
  }

  getRecentlyViewedProductIds(): number[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading recently viewed products from localStorage', e);
      return [];
    }
  }

  clearRecentlyViewed(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
