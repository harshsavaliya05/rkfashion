import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { CartService, CartItem } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { CommonModule } from '@angular/common';
import { AuthService, UserAddress } from '../../services/auth.service';
import { CouponService } from '../../services/coupon.service';
import { SettingsService } from '../../services/settings.service';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, RouterLink, MatSnackBarModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  
  // Billing Form Fields
  firstName = '';
  lastName = '';
  country = 'India';
  flatNo = '';
  areaName = '';
  landmark = '';
  city = '';
  state = '';
  postcode = '';
  phone = '';
  email = '';
  orderNotes = '';
  addressType = 'home'; // 'home' or 'office'

  isBuyNowMode = false;
  isCodEnabled = true;
  isCardEnabled = true;
  isCashfreeEnabled = false;
  paymentsConfig: any = null;

  // Saved Addresses State
  savedAddresses: UserAddress[] = [];
  selectedSavedAddressIndex = -1;
  couponsList: any[] = [];

  // Coupon Section State
  showCouponInput = false;
  couponCode = '';
  appliedCoupon = '';
  discountAmount = 0;

  // Payment Method Selection State
  selectedPaymentMethod = ''; // dynamically assigned
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';

  // Edit variant modal state
  showEditModal = false;
  editingItem: CartItem | null = null;
  editingProduct: any = undefined;

  tempSelectedSize = '';
  tempSelectedColorClass = '';
  tempSelectedColorName = '';
  tempSelectedColorImage = '';

  private cartSub!: Subscription;

  constructor(
    private cartService: CartService,
    private productService: ProductService,
    private snackBar: MatSnackBar,
    private router: Router,
    private authService: AuthService,
    private couponService: CouponService,
    private settingsService: SettingsService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.couponService.getCoupons().subscribe(coupons => {
      this.couponsList = coupons;
      this.loadCheckoutItems();
      this.cdr.detectChanges();
    });
    this.settingsService.getSettings('payments').subscribe(payments => {
      if (payments) {
        this.paymentsConfig = payments;
        this.isCodEnabled = payments.codActive === true;
        this.isCardEnabled = payments.razorpayActive === true;
        this.isCashfreeEnabled = payments.cashfreeActive === true;
        
        // Dynamically select the first available method
        if (this.isCashfreeEnabled) {
          this.selectedPaymentMethod = 'cashfree';
        } else if (this.isCardEnabled) {
          this.selectedPaymentMethod = 'card';
        } else if (this.isCodEnabled) {
          this.selectedPaymentMethod = 'cod';
        }

        this.cdr.detectChanges();
      }
    });
    this.loadUserInfo();

    this.cartSub = this.cartService.cartUpdated$.subscribe(() => {
      this.loadCheckoutItems();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.cartSub) {
      this.cartSub.unsubscribe();
    }
  }

  loadUserInfo() {
    const user = this.authService.getLoggedInUser();
    if (user) {
      this.email = user.email || '';
      if (user.name) {
        const parts = user.name.split(' ');
        this.firstName = parts[0] || '';
        this.lastName = parts.slice(1).join(' ') || '';
      }

      this.savedAddresses = user.addresses || [];
      if (this.savedAddresses.length > 0) {
        // Auto-select default address or first address
        const defaultIdx = this.savedAddresses.findIndex(addr => addr.isDefault);
        const idx = defaultIdx > -1 ? defaultIdx : 0;
        this.selectSavedAddress(idx);
      }
    }
  }

  selectSavedAddress(idx: number) {
    this.selectedSavedAddressIndex = idx;
    if (idx > -1 && idx < this.savedAddresses.length) {
      const addr = this.savedAddresses[idx];
      this.firstName = addr.firstName;
      this.lastName = addr.lastName;
      this.flatNo = addr.flatNo;
      this.areaName = addr.areaName;
      this.landmark = addr.landmark || '';
      this.city = addr.city;
      this.state = addr.state;
      this.postcode = addr.postcode;
      this.phone = addr.phone;
      this.addressType = addr.addressType;
    } else {
      // Use new address: clear fields (keep email though)
      this.firstName = '';
      this.lastName = '';
      this.flatNo = '';
      this.areaName = '';
      this.landmark = '';
      this.city = '';
      this.state = '';
      this.postcode = '';
      this.phone = '';
      this.addressType = 'home';
    }
  }

  loadCheckoutItems() {
    const buyNowItem = this.cartService.getBuyNowItem();
    if (buyNowItem) {
      this.isBuyNowMode = true;
      this.cartItems = [{ ...buyNowItem }];
      this.couponCode = '';
      this.appliedCoupon = '';
      this.discountAmount = 0;
      this.showCouponInput = false;
    } else {
      this.isBuyNowMode = false;
      this.cartItems = this.cartService.getCartItems().map(item => ({ ...item }));
      
      // Auto-fill and apply coupon if set from Cart page
      const savedCouponCode = this.cartService.getAppliedCoupon();
      if (savedCouponCode) {
        const matched = this.couponsList.find(c => c.code.toUpperCase() === savedCouponCode.toUpperCase());
        if (matched) {
          let expired = false;
          if (matched.createdAt && matched.expiryDays !== null && matched.expiryDays !== undefined) {
            const createdTime = new Date(matched.createdAt).getTime();
            const diffDays = (new Date().getTime() - createdTime) / (1000 * 60 * 60 * 24);
            const limitDays = matched.expiryDays;
            if (diffDays > limitDays) {
              expired = true;
            }
          }
          if (expired) {
            this.cartService.setAppliedCoupon(null);
            this.snackBar.open('The pre-applied coupon has expired.', 'Dismiss', { duration: 3000 });
          } else if (matched.code.toUpperCase() === 'FIRSTBUY') {
            this.authService.getUserOrders().subscribe({
              next: (orders) => {
                if (orders && orders.length > 0) {
                  this.cartService.setAppliedCoupon(null);
                  this.snackBar.open('FIRSTBUY coupon is only valid for your first order.', 'Dismiss', {
                    duration: 3000,
                    panelClass: ['error-snackbar']
                  });
                } else if (this.subtotal >= matched.minCartValue) {
                  this.discountAmount = this.calculateDiscount(matched);
                  this.appliedCoupon = `${matched.code} (${matched.discountType === 'flat' ? 'Flat ₹' : ''}${matched.discountValue}${matched.discountType === 'percentage' ? '% OFF' : ' OFF'})`;
                  this.showCouponInput = true;
                  this.couponCode = '';
                }
              }
            });
          } else if (this.subtotal >= matched.minCartValue) {
            this.discountAmount = this.calculateDiscount(matched);
            this.appliedCoupon = `${matched.code} (${matched.discountType === 'flat' ? 'Flat ₹' : ''}${matched.discountValue}${matched.discountType === 'percentage' ? '% OFF' : ' OFF'})`;
            this.showCouponInput = true;
            this.couponCode = '';
          }
        }
      }
    }

    // If both are empty, redirect to shop
    if (this.cartItems.length === 0) {
      this.snackBar.open('Your checkout is empty! Redirecting to shop.', 'Dismiss', {
        duration: 3000
      });
      this.router.navigate(['/shop']);
    }
  }

  calculateDiscount(coupon: any): number {
    let discountVal = 0;
    if (coupon.discountType === 'flat') {
      discountVal = coupon.discountValue;
    } else if (coupon.discountType === 'percentage') {
      discountVal = (this.subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discountVal = Math.min(discountVal, coupon.maxDiscount);
      }
    }
    return Math.min(discountVal, this.subtotal);
  }

  get subtotal(): number {
    return this.cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }

  get total(): number {
    return Math.max(0, this.subtotal - this.discountAmount);
  }

  toggleCouponInput() {
    this.showCouponInput = !this.showCouponInput;
  }

  applyCoupon() {
    const code = (this.couponCode || '').trim().toUpperCase();
    if (!code) {
      this.snackBar.open('Please enter a coupon code.', 'Dismiss', { duration: 2000 });
      return;
    }

    if (this.appliedCoupon) {
      this.snackBar.open('A coupon is already applied. Remove it first.', 'Dismiss', { duration: 2000 });
      return;
    }

    const matched = this.couponsList.find(c => c.code.toUpperCase() === code);

    if (matched) {
      // FIRSTBUY coupon validation: must be logged in & first order
      if (matched.code.toUpperCase() === 'FIRSTBUY') {
        const currentUser = this.authService.getLoggedInUser();
        if (!currentUser) {
          this.snackBar.open('Please sign in to use the FIRSTBUY coupon.', 'Dismiss', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.couponCode = '';
          return;
        }

        this.authService.getUserOrders().subscribe({
          next: (orders) => {
            if (orders && orders.length > 0) {
              this.snackBar.open('FIRSTBUY coupon is only valid for your first order.', 'Dismiss', {
                duration: 3000,
                panelClass: ['error-snackbar']
              });
              this.couponCode = '';
            } else {
              this.proceedApplyCoupon(matched);
            }
          },
          error: () => {
            this.proceedApplyCoupon(matched);
          }
        });
      } else {
        this.proceedApplyCoupon(matched);
      }
    } else {
      this.snackBar.open('Invalid coupon code.', 'Dismiss', { 
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      this.couponCode = '';
    }
  }

  private proceedApplyCoupon(matched: any) {
    // Expiration check
    if (matched.createdAt && matched.expiryDays !== null && matched.expiryDays !== undefined) {
      const createdTime = new Date(matched.createdAt).getTime();
      const diffMs = new Date().getTime() - createdTime;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const limitDays = matched.expiryDays;
      if (diffDays > limitDays) {
        this.snackBar.open('This coupon code has expired.', 'Dismiss', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.couponCode = '';
        return;
      }
    }

    if (this.subtotal < matched.minCartValue) {
      this.snackBar.open(`Min purchase required for this coupon is ₹${matched.minCartValue}.`, 'Dismiss', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    } else {
      this.discountAmount = this.calculateDiscount(matched);
      this.appliedCoupon = `${matched.code} (${matched.discountType === 'flat' ? 'Flat ₹' : ''}${matched.discountValue}${matched.discountType === 'percentage' ? '% OFF' : ' OFF'})`;
      this.cartService.setAppliedCoupon(matched.code);
      this.snackBar.open(`Coupon "${matched.code}" applied! Discount added.`, 'Dismiss', { duration: 3000 });
    }
    this.couponCode = '';
  }

  removeCoupon() {
    this.appliedCoupon = '';
    this.discountAmount = 0;
    this.cartService.setAppliedCoupon(null);
    this.snackBar.open('Coupon removed.', 'Dismiss', { duration: 2000 });
  }
  incrementQty(item: CartItem) {
    if (this.isBuyNowMode) {
      item.quantity += 1;
      this.cartService.setBuyNowItem(item);
      this.loadCheckoutItems();
    } else {
      this.cartService.incrementQuantity(item.key);
      this.loadCheckoutItems();
    }
  }

  decrementQty(item: CartItem) {
    if (this.isBuyNowMode) {
      if (item.quantity > 1) {
        item.quantity -= 1;
        this.cartService.setBuyNowItem(item);
        this.loadCheckoutItems();
      } else {
        this.removeItem(item);
      }
    } else {
      if (item.quantity > 1) {
        this.cartService.decrementQuantity(item.key);
        this.loadCheckoutItems();
      } else {
        this.removeItem(item);
      }
    }
  }

  removeItem(item: CartItem) {
    if (this.isBuyNowMode) {
      this.cartService.setBuyNowItem(null);
      this.loadCheckoutItems();
    } else {
      this.cartService.removeItem(item.key);
      this.loadCheckoutItems();
    }
    this.snackBar.open('Item removed from checkout.', 'Dismiss', { duration: 2000 });
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

    let finalPrice = this.editingItem.price;
    if (this.editingProduct) {
      finalPrice = this.editingProduct.price;
      if (this.editingProduct.variants && this.editingProduct.variants.length > 0) {
        const variant = this.editingProduct.variants.find((v: any) => v.size === this.tempSelectedSize);
        if (variant) {
          const base = variant.basePrice;
          const disc = variant.discountPercent || 0;
          finalPrice = base * (1 - disc / 100);
        }
      }
    }

    if (this.isBuyNowMode) {
      this.editingItem.size = this.tempSelectedSize;
      this.editingItem.colorClass = this.tempSelectedColorClass;
      this.editingItem.colorName = this.tempSelectedColorName;
      this.editingItem.image = this.tempSelectedColorImage || this.editingItem.image;
      this.editingItem.key = `${this.editingItem.productId}-${this.tempSelectedSize}-${this.editingItem.colorClass}`;
      this.editingItem.price = finalPrice;
      
      this.cartService.setBuyNowItem(this.editingItem);
      this.loadCheckoutItems();
      this.closeEditModal();
      this.snackBar.open('Checkout item updated!', 'Dismiss', { duration: 3000 });
    } else {
      this.cartService.editCartItem(
        this.editingItem.key,
        this.tempSelectedSize,
        this.tempSelectedColorClass,
        this.tempSelectedColorName,
        this.tempSelectedColorImage
      );
      this.closeEditModal();
      this.snackBar.open('Checkout item updated!', 'Dismiss', { duration: 3000 });
    }
  }
  selectPaymentMethod(method: string) {
    this.selectedPaymentMethod = method;
    this.cdr.detectChanges();
  }


  validateCardNumber(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 16) {
      value = value.substring(0, 16);
    }
    const matches = value.match(/\d{1,4}/g);
    const formatted = matches ? matches.join(' ') : '';
    this.cardNumber = formatted;
    input.value = formatted;
  }

  validateExpiry(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 4) {
      value = value.substring(0, 4);
    }
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    this.cardExpiry = value;
    input.value = value;
  }

  validateCvv(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 3) {
      value = value.substring(0, 3);
    }
    this.cardCvv = value;
    input.value = value;
  }

  validatePhone(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
    this.phone = value;
    input.value = value;
  }

  validatePostcode(event: Event) {
    const input = event.target as HTMLInputElement;
    // Replace non-numeric values
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 6) {
      value = value.substring(0, 6);
    }
    this.postcode = value;
    input.value = value;

    // Auto-detect location if 6 digits are complete
    if (value.length === 6) {
      this.autoFillLocation(value);
    }
  }

  autoFillLocation(pin: string) {
    const database: { [key: string]: { city: string, state: string } } = {
      '395007': { city: 'Surat', state: 'Gujarat' },
      '395003': { city: 'Surat', state: 'Gujarat' },
      '395001': { city: 'Surat', state: 'Gujarat' },
      '395009': { city: 'Surat', state: 'Gujarat' },
      '400001': { city: 'Mumbai', state: 'Maharashtra' },
      '400011': { city: 'Mumbai', state: 'Maharashtra' },
      '110001': { city: 'New Delhi', state: 'Delhi' },
      '560001': { city: 'Bengaluru', state: 'Karnataka' },
      '600001': { city: 'Chennai', state: 'Tamil Nadu' },
      '700001': { city: 'Kolkata', state: 'West Bengal' },
    };

    const match = database[pin];
    if (match) {
      this.city = match.city;
      this.state = match.state;
      this.snackBar.open(`Location auto-detected: ${match.city}, ${match.state}`, 'Dismiss', {
        duration: 2000
      });
    }
  }

  setAddressType(type: string) {
    this.addressType = type;
  }

  placeOrder() {
    // Trim values
    this.firstName = (this.firstName || '').trim();
    this.lastName = (this.lastName || '').trim();
    this.country = (this.country || '').trim();
    this.flatNo = (this.flatNo || '').trim();
    this.areaName = (this.areaName || '').trim();
    this.landmark = (this.landmark || '').trim();
    this.city = (this.city || '').trim();
    this.state = (this.state || '').trim();
    this.postcode = (this.postcode || '').trim();
    this.phone = (this.phone || '').trim();
    this.email = (this.email || '').trim();

    // Check empty fields (all except orderNotes)
    if (!this.firstName || !this.lastName || !this.flatNo || !this.areaName || !this.landmark || !this.city || !this.state || !this.postcode || !this.phone || !this.email) {
      this.snackBar.open('Please fill in all required billing details (*).', 'Dismiss', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Postcode validation: exactly 6 digits
    const postcodeRegex = /^[0-9]{6}$/;
    if (!postcodeRegex.test(this.postcode)) {
      this.snackBar.open('Please enter a valid 6-digit Indian PIN code.', 'Dismiss', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Phone validation: exactly 10 digits
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(this.phone)) {
      this.snackBar.open('Please enter a valid 10-digit mobile number.', 'Dismiss', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.email)) {
      this.snackBar.open('Please enter a valid email address.', 'Dismiss', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Payment Specific Validations
    let paymentMethodLabel = '';

    if (this.selectedPaymentMethod === 'card') {
      paymentMethodLabel = 'Online Payment (Razorpay)';
    } 
    else if (this.selectedPaymentMethod === 'cashfree') {
      paymentMethodLabel = 'Online Payment (Cashfree)';
    }
    else {
      paymentMethodLabel = 'Cash on Delivery (COD)';
    }

    // Place order to backend database
    const shippingAddress = {
      firstName: this.firstName,
      lastName: this.lastName,
      flatNo: this.flatNo,
      areaName: this.areaName,
      landmark: this.landmark,
      city: this.city,
      state: this.state,
      postcode: this.postcode,
      phone: this.phone,
      addressType: this.addressType as 'home' | 'office'
    };

    const orderPayload = {
      items: this.cartItems,
      subtotal: this.subtotal,
      discount: this.discountAmount,
      total: this.total,
      paymentMethod: paymentMethodLabel,
      shippingAddress: shippingAddress
    };

    if (this.selectedPaymentMethod === 'cashfree') {
      // Create Pending order in DB first
      this.authService.addOrder(orderPayload).subscribe({
        next: (createdOrder: any) => {
          // Call backend to create Cashfree order session
          const sessionPayload = {
            orderId: createdOrder.orderId,
            amount: createdOrder.total,
            customerName: `${this.firstName} ${this.lastName}`,
            customerEmail: this.email,
            customerPhone: this.phone
          };

          this.http.post('http://localhost:3000/api/orders/cashfree/session', sessionPayload).subscribe({
            next: (sessionRes: any) => {
              const sessionId = sessionRes.paymentSessionId;
              const mode = this.paymentsConfig?.cashfreeMode === 'live' ? 'production' : 'sandbox';
              
              if (this.isBuyNowMode) {
                this.cartService.setBuyNowItem(null);
              } else {
                this.cartService.clearCart();
              }

              // Trigger Cashfree SDK Overlay
              try {
                const cashfree = (window as any).Cashfree({ mode });
                cashfree.checkout({
                  paymentSessionId: sessionId,
                  redirectTarget: "_self"
                });
              } catch (err) {
                console.error('Failed to trigger Cashfree SDK:', err);
                this.snackBar.open('Payment Gateway SDK failed to load. Please try again.', 'Dismiss', { duration: 4000 });
              }
            },
            error: (err: any) => {
              console.error('Failed to create Cashfree session:', err);
              const errMsg = err.error?.error || 'Failed to initialize payment gateway.';
              this.snackBar.open(errMsg, 'Dismiss', { duration: 4000 });
            }
          });
        },
        error: (err) => {
          console.error('Failed to save order:', err);
          this.snackBar.open('Failed to register order. Please try again.', 'Dismiss', { duration: 4000 });
        }
      });
    } else if (this.selectedPaymentMethod === 'card') {
      // Create Pending order in DB first
      this.authService.addOrder(orderPayload).subscribe({
        next: (createdOrder: any) => {
          const sessionPayload = {
            orderId: createdOrder.orderId,
            amount: createdOrder.total
          };

          this.http.post('http://localhost:3000/api/orders/razorpay/session', sessionPayload).subscribe({
            next: (sessionRes: any) => {
              if (this.isBuyNowMode) {
                this.cartService.setBuyNowItem(null);
              } else {
                this.cartService.clearCart();
              }

              // Trigger Razorpay SDK Popup
              try {
                const options = {
                  key: sessionRes.keyId,
                  amount: sessionRes.amount,
                  currency: 'INR',
                  name: 'RK Fashion',
                  description: `Order #${createdOrder.orderId}`,
                  order_id: sessionRes.razorpayOrderId,
                  handler: (response: any) => {
                    this.http.post('http://localhost:3000/api/orders/razorpay/verify', {
                      orderId: createdOrder.orderId,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpayOrderId: response.razorpay_order_id,
                      razorpaySignature: response.razorpay_signature
                    }).subscribe({
                      next: () => {
                        this.router.navigate(['/order-success'], { queryParams: { id: createdOrder.orderId, payment: 'razorpay' } });
                      },
                      error: (verifyErr: any) => {
                        console.error('Failed to verify Razorpay signature:', verifyErr);
                        this.snackBar.open('❌ Payment verification failed.', 'Dismiss', { duration: 4000 });
                      }
                    });
                  },
                  prefill: {
                    name: `${this.firstName} ${this.lastName}`,
                    email: this.email,
                    contact: this.phone
                  },
                  theme: {
                    color: '#111111'
                  },
                  modal: {
                    ondismiss: () => {
                      this.snackBar.open('⚠️ Payment cancelled by user.', 'Dismiss', { duration: 4000 });
                    }
                  }
                };
                const rzp = new (window as any).Razorpay(options);
                rzp.open();
              } catch (err) {
                console.error('Failed to trigger Razorpay SDK:', err);
                this.snackBar.open('Razorpay SDK failed to load. Please try again.', 'Dismiss', { duration: 4000 });
              }
            },
            error: (err: any) => {
              console.error('Failed to create Razorpay session:', err);
              const errMsg = err.error?.error || 'Failed to initialize Razorpay payment.';
              this.snackBar.open(errMsg, 'Dismiss', { duration: 4000 });
            }
          });
        },
        error: (err) => {
          console.error('Failed to save order:', err);
          this.snackBar.open('Failed to register order. Please try again.', 'Dismiss', { duration: 4000 });
        }
      });
    } else {
      // Standard COD/Simulated Flow
      this.authService.addOrder(orderPayload).subscribe((createdOrder: any) => {
        this.snackBar.open(`🎉 Order placed successfully using ${paymentMethodLabel}!`, 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });

        if (this.isBuyNowMode) {
          this.cartService.setBuyNowItem(null); // Clear buy now state
        } else {
          this.cartService.clearCart(); // Clear only persistent cart
        }
        
        const realOrderId = createdOrder.orderId || ('RK-' + Math.floor(100000 + Math.random() * 900000));
        this.router.navigate(['/order-success'], { queryParams: { id: realOrderId } });
      });
    }
  }
}
