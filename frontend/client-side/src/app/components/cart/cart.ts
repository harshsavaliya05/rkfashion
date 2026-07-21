import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CartService, CartItem } from '../../services/cart.service';
import { ProductService, ProductItem } from '../../services/product.service';
import { CouponService } from '../../services/coupon.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, MatSnackBarModule, MatIconModule, FormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];

  // Edit variant modal state
  showEditModal = false;
  editingItem: CartItem | null = null;
  editingProduct: ProductItem | undefined = undefined;

  tempSelectedSize = '';
  tempSelectedColorClass = '';
  tempSelectedColorName = '';
  tempSelectedColorImage = '';
  couponInput = '';
  couponsList: any[] = [];

  get appliedCoupon(): string | null {
    return this.cartService.getAppliedCoupon();
  }

  applyCartCoupon() {
    const code = (this.couponInput || '').trim().toUpperCase();
    if (!code) {
      this.snackBar.open('Please enter a coupon code.', 'Dismiss', { duration: 2000 });
      return;
    }

    const matchedCoupon = this.couponsList.find(c => c.code.toUpperCase() === code);

    if (matchedCoupon) {
      // FIRSTBUY coupon validation: must be logged in & first order
      if (matchedCoupon.code.toUpperCase() === 'FIRSTBUY') {
        const currentUser = this.authService.getLoggedInUser();
        if (!currentUser) {
          this.snackBar.open('Please sign in to use the FIRSTBUY coupon.', 'Dismiss', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.couponInput = '';
          return;
        }

        this.authService.getUserOrders().subscribe({
          next: (orders) => {
            if (orders && orders.length > 0) {
              this.cartService.setAppliedCoupon(null);
              this.snackBar.open('FIRSTBUY coupon is only valid for your first order.', 'Dismiss', {
                duration: 3000,
                panelClass: ['error-snackbar']
              });
              this.couponInput = '';
            } else {
              this.proceedApplyCartCoupon(matchedCoupon);
            }
          },
          error: () => {
            this.proceedApplyCartCoupon(matchedCoupon);
          }
        });
      } else {
        this.proceedApplyCartCoupon(matchedCoupon);
      }
    } else {
      this.cartService.setAppliedCoupon(null);
      this.snackBar.open('Invalid coupon code.', 'Dismiss', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      this.couponInput = '';
    }
  }

  private proceedApplyCartCoupon(matchedCoupon: any) {
    // Expiration check
    if (matchedCoupon.createdAt && matchedCoupon.expiryDays !== null && matchedCoupon.expiryDays !== undefined) {
      const createdTime = new Date(matchedCoupon.createdAt).getTime();
      const diffMs = new Date().getTime() - createdTime;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const limitDays = matchedCoupon.expiryDays;
      if (diffDays > limitDays) {
        this.cartService.setAppliedCoupon(null);
        this.snackBar.open('This coupon code has expired.', 'Dismiss', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.couponInput = '';
        return;
      }
    }

    if (this.subtotal < matchedCoupon.minCartValue) {
      this.cartService.setAppliedCoupon(null);
      this.snackBar.open(`Min purchase required for this coupon is ₹${matchedCoupon.minCartValue}.`, 'Dismiss', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    } else {
      this.cartService.setAppliedCoupon(matchedCoupon.code);
      this.snackBar.open(`Coupon "${matchedCoupon.code}" applied! This will be pre-filled at checkout.`, 'Dismiss', {
        duration: 4000
      });
    }
    this.couponInput = '';
  }

  removeCartCoupon() {
    this.cartService.setAppliedCoupon(null);
    this.snackBar.open('Coupon removed.', 'Dismiss', { duration: 2000 });
  }

  private cartSub!: Subscription;

  constructor(
    private cartService: CartService,
    private productService: ProductService,
    private snackBar: MatSnackBar,
    private couponService: CouponService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.cartService.setBuyNowItem(null);
    this.cartSub = this.cartService.cartUpdated$.subscribe(items => {
      this.cartItems = items.map(item => ({ ...item }));
      this.cdr.detectChanges();
    });
    this.couponService.getCoupons().subscribe(coupons => {
      this.couponsList = coupons;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.cartSub) {
      this.cartSub.unsubscribe();
    }
  }

  loadCart() {
    this.cartItems = this.cartService.getCartItems().map(item => ({ ...item }));
  }

  get subtotal(): number {
    return this.cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }

  get discount(): number {
    const code = this.appliedCoupon;
    if (!code) return 0;

    const matchedCoupon = this.couponsList.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (!matchedCoupon || this.subtotal < matchedCoupon.minCartValue) return 0;

    let discountVal = 0;
    if (matchedCoupon.discountType === 'flat') {
      discountVal = matchedCoupon.discountValue;
    } else if (matchedCoupon.discountType === 'percentage') {
      discountVal = (this.subtotal * matchedCoupon.discountValue) / 100;
      if (matchedCoupon.maxDiscount) {
        discountVal = Math.min(discountVal, matchedCoupon.maxDiscount);
      }
    }
    return Math.min(discountVal, this.subtotal);
  }

  get total(): number {
    return Math.max(0, this.subtotal - this.discount);
  }

  incrementQuantity(item: CartItem) {
    this.cartService.incrementQuantity(item.key);
  }

  decrementQuantity(item: CartItem) {
    this.cartService.decrementQuantity(item.key);
  }

  removeItem(item: CartItem) {
    this.cartService.removeItem(item.key);
  }

  openEditModal(item: CartItem) {
    this.editingItem = item;
    this.tempSelectedSize = item.size;
    this.tempSelectedColorClass = item.colorClass;
    this.tempSelectedColorName = item.colorName;
    this.tempSelectedColorImage = item.image;
    this.showEditModal = true;
    this.cdr.detectChanges();

    this.productService.getProductById(item.productId).subscribe(prod => {
      this.editingProduct = prod;
      this.cdr.detectChanges();
    });
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingItem = null;
    this.editingProduct = undefined;
  }

  get editingItemPrice(): number {
    if (!this.editingProduct) return 0;
    
    let price = this.editingProduct.price;

    if (this.tempSelectedSize && this.editingProduct.variants && this.editingProduct.variants.length > 0) {
      const variant = this.editingProduct.variants.find((v: any) => v.size === this.tempSelectedSize);
      if (variant) {
        const base = variant.basePrice;
        const disc = variant.discountPercent || 0;
        price = base * (1 - disc / 100);
      }
    }
    return price;
  }

  selectTempSize(size: string) {
    this.tempSelectedSize = size;
    this.cdr.detectChanges();
  }

  selectTempColor(color: any) {
    this.tempSelectedColorClass = color.class;
    this.tempSelectedColorName = color.name;
    this.tempSelectedColorImage = color.image;
    this.cdr.detectChanges();
  }

  saveItemChanges() {
    if (!this.editingItem) return;
    console.log('cart.ts saving changes for:', this.editingItem.key, 'to image:', this.tempSelectedColorImage);
    this.cartService.editCartItem(
      this.editingItem.key,
      this.tempSelectedSize,
      this.tempSelectedColorClass,
      this.tempSelectedColorName,
      this.tempSelectedColorImage
    );
    this.closeEditModal();
    this.snackBar.open('Item configuration updated successfully!', 'Dismiss', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}
