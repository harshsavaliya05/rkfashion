import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CouponService, Coupon } from '../../services/coupon.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './coupons.html',
  styleUrl: './coupons.scss'
})
export class CouponsComponent implements OnInit {
  coupons: Coupon[] = [];
  
  // Drawer & Form State
  isDrawerOpen = false;
  editingCouponCode: string | null = null;
  showDeleteConfirmCode: string | null = null;
  
  // Form Bindings
  code = '';
  discountType: 'flat' | 'percentage' = 'flat';
  discountValue = 0;
  minCartValue = 0;
  maxDiscount: number | null = null;
  description = '';
  expiryDays = 7;
  isUnlimited = true;

  defaultCoupons = [
    {
      code: 'FIRSTBUY',
      discountType: 'flat' as const,
      discountValue: 100,
      minCartValue: 0,
      description: 'Flat ₹100 OFF on your first purchase'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private couponService: CouponService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadCoupons();
    
    // Check query params to open drawer automatically if action=add
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'add') {
        this.openCreateDrawer();
      }
    });
  }

  loadCoupons() {
    this.couponService.getCoupons().subscribe(coupons => {
      if (coupons.length === 0) {
        // Seed default coupon
        this.couponService.saveCoupon(this.defaultCoupons[0]).subscribe(() => {
          this.loadCoupons();
        });
      } else {
        this.coupons = coupons;
        this.cdr.detectChanges();
      }
    });
  }

  openCreateDrawer() {
    this.resetForm();
    this.isDrawerOpen = true;
    this.editingCouponCode = null;
    this.cdr.detectChanges();
  }

  openEditDrawer(coupon: Coupon) {
    this.code = coupon.code;
    this.discountType = coupon.discountType;
    this.discountValue = coupon.discountValue;
    this.minCartValue = coupon.minCartValue;
    this.maxDiscount = coupon.maxDiscount || null;
    this.description = coupon.description;
    
    if (coupon.expiryDays === null || coupon.expiryDays === undefined) {
      this.isUnlimited = true;
      this.expiryDays = 7;
    } else {
      this.isUnlimited = false;
      this.expiryDays = coupon.expiryDays;
    }
    
    this.editingCouponCode = coupon.code;
    this.isDrawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer() {
    this.isDrawerOpen = false;
    this.resetForm();
    this.cdr.detectChanges();
  }

  resetForm() {
    this.code = '';
    this.discountType = 'flat';
    this.discountValue = 0;
    this.minCartValue = 0;
    this.maxDiscount = null;
    this.description = '';
    this.expiryDays = 7;
    this.isUnlimited = true;
  }

  saveCoupon() {
    const formattedCode = this.code.trim().toUpperCase();
    if (!formattedCode) return;

    const payload: any = {
      code: formattedCode,
      discountType: this.discountType,
      discountValue: Number(this.discountValue),
      minCartValue: Number(this.minCartValue),
      description: this.description.trim() || `${this.discountType === 'flat' ? '₹' : ''}${this.discountValue}${this.discountType === 'percentage' ? '% OFF' : ' OFF'} on orders above ₹${this.minCartValue}`,
      expiryDays: this.isUnlimited ? null : Number(this.expiryDays)
    };

    if (this.discountType === 'percentage' && this.maxDiscount) {
      payload.maxDiscount = Number(this.maxDiscount);
    } else {
      payload.maxDiscount = null;
    }

    if (this.editingCouponCode) {
      const match = this.coupons.find(c => c.code === this.editingCouponCode);
      if (match) {
        payload.id = match.id;
      }
    } else {
      // Check duplicate
      if (this.coupons.some(c => c.code === formattedCode)) {
        this.snackBar.open('⚠️ Coupon with this code already exists!', 'Dismiss', { duration: 4000 });
        return;
      }
    }

    this.couponService.saveCoupon(payload).subscribe({
      next: () => {
        this.closeDrawer();
        this.loadCoupons();
      },
      error: (err) => {
        console.error('Error saving coupon:', err);
        this.snackBar.open('❌ Error saving coupon: ' + (err.error?.error || err.message || 'Server error'), 'Dismiss', { duration: 5000 });
      }
    });
  }

  deleteCoupon(code: string) {
    this.showDeleteConfirmCode = code;
    this.cdr.detectChanges();
  }

  cancelDelete() {
    this.showDeleteConfirmCode = null;
    this.cdr.detectChanges();
  }

  confirmDelete() {
    if (this.showDeleteConfirmCode !== null) {
      const match = this.coupons.find(c => c.code === this.showDeleteConfirmCode);
      if (match && match.id) {
        this.couponService.deleteCoupon(match.id).subscribe(() => {
          this.showDeleteConfirmCode = null;
          this.loadCoupons();
        });
      }
    }
  }

  getCouponValidity(coupon: Coupon): { text: string, expired: boolean } {
    if (!coupon.createdAt || coupon.expiryDays === null || coupon.expiryDays === undefined) {
      return { text: 'Unlimited', expired: false };
    }
    const createdTime = new Date(coupon.createdAt).getTime();
    const limitDays = coupon.expiryDays;
    const expiryTime = createdTime + (limitDays * 24 * 60 * 60 * 1000);
    const now = new Date().getTime();
    const diffMs = expiryTime - now;
    if (diffMs <= 0) {
      return { text: 'Expired', expired: true };
    }
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return { text: `${diffDays} days left`, expired: false };
  }
}
