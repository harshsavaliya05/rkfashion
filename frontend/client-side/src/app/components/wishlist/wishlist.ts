import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WishlistService } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { ProductItem } from '../../services/product.service';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, MatSnackBarModule],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  constructor(
    private wishlistService: WishlistService,
    private cartService: CartService,
    private snackBar: MatSnackBar
  ) {}

  get wishlistItems(): ProductItem[] {
    return this.wishlistService.getWishlistItems();
  }

  removeItem(productId: number, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const item = this.wishlistItems.find(p => p.id === productId);
    if (item) {
      this.wishlistService.removeFromWishlist(productId);
      this.snackBar.open(`${item.name} removed from Wishlist.`, 'OK', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom'
      });
    }
  }

  moveToCart(product: ProductItem, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    
    const defaultSize = product.sizes[0] || 'M';
    const defaultColor = product.colors[0] || { name: 'Default', class: 'default', hex: '#ccc', image: product.image };
    
    this.cartService.addToCart(
      product,
      1,
      defaultSize,
      defaultColor.class,
      defaultColor.name,
      product.image
    );
    
    this.wishlistService.removeFromWishlist(product.id);
    
    this.snackBar.open(`${product.name} moved to shopping cart!`, 'View Cart', {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
  }
}
