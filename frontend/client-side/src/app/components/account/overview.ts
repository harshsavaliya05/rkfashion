import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { WishlistService } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-account-overview',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './overview.html',
  styleUrl: './overview.scss'
})
export class AccountOverview implements OnInit {
  user: any = null;
  ordersCount = 0;
  wishlistCount = 0;
  cartCount = 0;

  constructor(
    private authService: AuthService,
    private wishlistService: WishlistService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.user = this.authService.getLoggedInUser();
    this.authService.getUserOrders().subscribe(orders => {
      this.ordersCount = orders.length;
      this.cdr.detectChanges();
    });
    this.wishlistCount = this.wishlistService.getWishlistCount();
    this.cartCount = this.cartService.getCartCount();
  }

  getGenderLabel(gender: string): string {
    if (!gender) return 'Not Specified';
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  }

  getFormattedDob(dob: string): string {
    if (!dob) return 'Not Specified';
    try {
      const d = new Date(dob);
      return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dob;
    }
  }

  get defaultAddress(): any {
    if (this.user?.addresses && this.user.addresses.length > 0) {
      return this.user.addresses.find((addr: any) => addr.isDefault) || this.user.addresses[0];
    }
    return null;
  }
}
