import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { ProductService, ProductItem } from './product.service';
import { AuthService } from './auth.service';

export interface CartItem {
  key: string; // productID-size-colorClass
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size: string;
  colorName: string;
  colorClass: string;
  sku?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];
  private buyNowItem: CartItem | null = null;
  private appliedCouponCode: string | null = null;

  cartUpdated$ = new BehaviorSubject<CartItem[]>([]);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private productService: ProductService
  ) {
    // Automatically load cart when auth state changes (login, logout, refresh)
    this.authService.authStatusChanged$.subscribe(() => {
      this.loadCart();
    });
  }

  private loadCart() {
    const user = this.authService.getLoggedInUser();
    if (user && user.id) {
      this.http.get<CartItem[]>(`http://localhost:3000/api/users/${user.id}/cart`).subscribe({
        next: (items) => {
          this.cartItems = items || [];
          this.cartUpdated$.next(this.cartItems);
        },
        error: (err) => {
          console.error('Error loading cart from Postgres:', err);
          this.cartItems = [];
          this.cartUpdated$.next([]);
        }
      });
    } else {
      this.cartItems = [];
      this.cartUpdated$.next([]);
    }
  }

  private saveCart() {
    const user = this.authService.getLoggedInUser();
    if (user && user.id) {
      this.http.put<CartItem[]>(`http://localhost:3000/api/users/${user.id}/cart`, {
        cart: this.cartItems
      }).subscribe({
        next: (items) => {
          this.cartItems = items || [];
          this.cartUpdated$.next(this.cartItems);
        },
        error: (err) => {
          console.error('Error saving cart to Postgres:', err);
        }
      });
    }
  }

  getCartItems(): CartItem[] {
    return this.cartItems;
  }

  getCartCount(): number {
    return this.cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }

  getCartTotal(): number {
    return this.cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }

  addToCart(product: ProductItem, quantity: number, size: string, colorClass: string, colorName: string, activeImage: string) {
    const key = `${product.id}-${size}-${colorClass}`;
    const existingIndex = this.cartItems.findIndex(item => item.key === key);

    let finalPrice = product.price;
    if (product.variants && product.variants.length > 0) {
      const variant = product.variants.find((v: any) => v.size === size);
      if (variant) {
        const base = variant.basePrice;
        const disc = variant.discountPercent || 0;
        finalPrice = base * (1 - disc / 100);
      }
    }

    if (existingIndex > -1) {
      this.cartItems[existingIndex].quantity += quantity;
      this.cartItems[existingIndex].price = finalPrice;
    } else {
      this.cartItems.push({
        key,
        productId: product.id,
        name: product.name,
        price: finalPrice,
        quantity,
        image: activeImage || product.image,
        size,
        colorName,
        colorClass,
        sku: product.sku
      });
    }
    this.saveCart();
  }

  updateQuantity(key: string, quantity: number) {
    const item = this.cartItems.find(i => i.key === key);
    if (item) {
      item.quantity = quantity;
      if (item.quantity <= 0) {
        this.removeItem(key);
      } else {
        this.saveCart();
      }
    }
  }

  incrementQuantity(key: string) {
    const item = this.cartItems.find(i => i.key === key);
    if (item) {
      item.quantity++;
      this.saveCart();
    }
  }

  decrementQuantity(key: string) {
    const item = this.cartItems.find(i => i.key === key);
    if (item && item.quantity > 1) {
      item.quantity--;
      this.saveCart();
    }
  }

  removeItem(key: string) {
    this.cartItems = this.cartItems.filter(item => item.key !== key);
    this.saveCart();
  }

  editCartItem(oldKey: string, newSize: string, newColorClass: string, newColorName: string, newImage: string) {
    console.log('CartService.editCartItem oldKey:', oldKey, 'newImage:', newImage);
    const itemIndex = this.cartItems.findIndex(item => item.key === oldKey);
    if (itemIndex === -1) {
      console.warn('CartService.editCartItem: item not found for oldKey:', oldKey);
      return;
    }

    const item = this.cartItems[itemIndex];

    this.productService.getProductById(item.productId).subscribe({
      next: (product) => {
        let finalPrice = product.price;
        if (product.variants && product.variants.length > 0) {
          const variant = product.variants.find((v: any) => v.size === newSize);
          if (variant) {
            const base = variant.basePrice;
            const disc = variant.discountPercent || 0;
            finalPrice = base * (1 - disc / 100);
          }
        }

        item.price = finalPrice;

        const newKey = `${item.productId}-${newSize}-${newColorClass}`;
        if (newKey !== oldKey) {
          const existingIndex = this.cartItems.findIndex(i => i.key === newKey);
          if (existingIndex > -1) {
            this.cartItems[existingIndex].quantity += item.quantity;
            this.cartItems[existingIndex].image = newImage || this.cartItems[existingIndex].image;
            this.cartItems[existingIndex].colorName = newColorName;
            this.cartItems[existingIndex].price = finalPrice;
            this.cartItems.splice(itemIndex, 1);
          } else {
            item.key = newKey;
            item.size = newSize;
            item.colorClass = newColorClass;
            item.colorName = newColorName;
            item.image = newImage || item.image;
          }
        } else {
          item.image = newImage || item.image;
        }

        console.log('CartService.editCartItem completed. Current items:', JSON.stringify(this.cartItems));
        this.saveCart();
      },
      error: (err) => {
        console.error('Error fetching product details during cart item edit:', err);
      }
    });
  }

  clearCart() {
    this.cartItems = [];
    this.saveCart();
  }

  setBuyNowItem(item: CartItem | null) {
    this.buyNowItem = item;
  }

  getBuyNowItem(): CartItem | null {
    return this.buyNowItem;
  }

  setAppliedCoupon(code: string | null) {
    this.appliedCouponCode = code;
  }

  getAppliedCoupon(): string | null {
    return this.appliedCouponCode;
  }
}
