import { Component, AfterViewInit, OnInit, OnDestroy, ElementRef, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { ProductService, ProductItem } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { BlogService, BlogItem } from '../../services/blog.service';
import { RecentlyViewedService } from '../../services/recently-viewed.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

declare var $: any;

import { BannerService, Banner } from '../../services/banner.service';
import { CategoryService, Category } from '../../services/category.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule, MatSnackBarModule, MatCardModule, MatRippleModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, AfterViewInit, OnDestroy {
  newInProducts: ProductItem[] = [];
  trendingNowProducts: ProductItem[] = [];
  recommendedProducts: ProductItem[] = [];
  banners: Banner[] = [];
  latestBlogs: BlogItem[] = [];
  hasRecentlyViewed: boolean = false;
  categories: Category[] = [];

  // Smart slider state
  private slideTimer: any = null;
  private currentSlideIndex = 0;
  private isVideoSlide = false;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private wishlistService: WishlistService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private el: ElementRef,
    private bannerService: BannerService,
    private blogService: BlogService,
    private categoryService: CategoryService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private recentlyViewedService: RecentlyViewedService
  ) {}

  getSafeVideoUrl(url: string | undefined): SafeResourceUrl | string {
    if (!url) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  stars(r: number) {
    return Array.from({ length: 5 }, (_, i) => i < r);
  }

  isInWishlist(productId: number): boolean {
    return this.wishlistService.isInWishlist(productId);
  }

  toggleWishlist(product: ProductItem, event: Event) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.authService.checkAuthAndTriggerModal('add items to wishlist')) {
      return;
    }

    this.wishlistService.toggleWishlist(product);
    const action = this.isInWishlist(product.id) ? 'added to' : 'removed from';
    this.snackBar.open(`${product.name} ${action} Wishlist!`, 'OK', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  getProductBrand(product: ProductItem): string {
    const brands = ['POLO RALPH LAUREN', 'HACKETT LONDON', 'FRED PERRY', 'TED BAKER', 'HUGO BOSS', 'ARMANI EXCHANGE'];
    return brands[product.id % brands.length];
  }

  ngOnInit() {
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load categories on homepage:', err);
      }
    });

    this.productService.getProducts().subscribe((allProducts: any) => {
      // New In: sort by id desc, top 8
      this.newInProducts = [...allProducts].sort((a, b) => b.id - a.id).slice(0, 8);
      // Trending Now: sort by rating desc, top 8
      this.trendingNowProducts = [...allProducts].sort((a, b) => b.rating - a.rating).slice(0, 8);

      const recentlyViewedIds = this.recentlyViewedService.getRecentlyViewedProductIds();
      if (recentlyViewedIds && recentlyViewedIds.length > 0) {
        this.hasRecentlyViewed = true;
        this.recommendedProducts = recentlyViewedIds
          .map(id => allProducts.find((p: any) => p.id === id))
          .filter(p => p !== undefined) as ProductItem[];
      } else {
        this.hasRecentlyViewed = false;
        this.recommendedProducts = [...allProducts]
          .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0))
          .slice(0, 8);
      }

      this.cdr.detectChanges();
    });

    this.blogService.getBlogs().subscribe((blogs: BlogItem[]) => {
      this.latestBlogs = [...blogs].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 3);
      this.cdr.detectChanges();
    });

    this.loadBanners();
  }

  loadBanners() {
    this.bannerService.getBanners().subscribe(banners => {
      this.banners = banners.filter(b => b.active);
      this.cdr.detectChanges();

      if (typeof $ !== 'undefined' && this.banners.length > 0) {
        setTimeout(() => {
          // Set background images
          $('.set-bg').each(function (this: any) {
            const bg = $(this).data('setbg');
            if (bg) $(this).css('background-image', 'url(' + bg + ')');
          });

          // Init Owl Carousel — autoplay OFF, we control timing manually
          const $slider = $('.hero__slider');
          if ($slider.hasClass('owl-loaded')) {
            $slider.trigger('destroy.owl.carousel');
            // Hard clean JQuery wrappers to force clean Angular template redraws
            $slider.removeClass('owl-loaded owl-drag');
            $slider.find('.owl-stage-outer').children().unwrap();
            $slider.find('.owl-stage').children().unwrap();
            $slider.find('.owl-nav, .owl-dots').remove();
          }
          $slider.owlCarousel({
            loop: true,
            margin: 0,
            items: 1,
            dots: false,
            nav: true,
            navText: ["<span class='arrow_left'><span/>", "<span class='arrow_right'><span/>"],
            smartSpeed: 1200,
            autoHeight: false,
            autoplay: false  // Managed manually
          });

          this.setupSmartSlider();

        }, 100);
      }
    });
  }

  // ─── Smart Slider Logic ────────────────────────────────────────────────────

  // Called from template when video finishes playing
  onVideoEnded() {
    if (this.isVideoSlide) {
      this.goToNextSlide();
    }
  }

  // Listen to Owl slide-change, then set timer or wait for video
  private setupSmartSlider() {
    const $slider = $('.hero__slider');
    if (!$slider.length) return;

    $slider.on('changed.owl.carousel', (event: any) => {
      this.clearSlideTimer();

      // Owl uses cloned slides for looping — use modulo to get real index
      const index = event.item.index % this.banners.length;
      this.currentSlideIndex = index;
      const currentBanner = this.banners[index];

      if (currentBanner && currentBanner.videoUrl) {
        // VIDEO SLIDE: wait for video to end naturally
        this.isVideoSlide = true;
        // Reset & replay the video from beginning
        setTimeout(() => {
          const videoEl = document.getElementById('hero-video-' + currentBanner.id) as HTMLVideoElement;
          if (videoEl) {
            videoEl.currentTime = 0;
            videoEl.play().catch(() => {});
          }
        }, 100);
      } else {
        // PHOTO SLIDE: auto-advance after 3 seconds
        this.isVideoSlide = false;
        this.slideTimer = setTimeout(() => {
          this.goToNextSlide();
        }, 3000);
      }
    });

    // Bootstrap first slide timing manually (changed event doesn't fire on init)
    const firstBanner = this.banners[0];
    if (firstBanner && firstBanner.videoUrl) {
      this.isVideoSlide = true;
      // Video has autoplay attr — onVideoEnded() will fire when done
    } else {
      this.isVideoSlide = false;
      this.slideTimer = setTimeout(() => {
        this.goToNextSlide();
      }, 3000);
    }
  }

  private goToNextSlide() {
    const $slider = $('.hero__slider');
    if ($slider.length) {
      $slider.trigger('next.owl.carousel');
    }
  }

  private clearSlideTimer() {
    if (this.slideTimer) {
      clearTimeout(this.slideTimer);
      this.slideTimer = null;
    }
    this.isVideoSlide = false;
  }

  // ─── Cart ──────────────────────────────────────────────────────────────────

  addToCart(product: ProductItem, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const defaultSize = product.sizes[0] || 'M';
    const defaultColor = product.colors[0] || { name: 'Standard', class: 'black', hex: '#111111', image: product.image };

    this.cartService.addToCart(
      product,
      1,
      defaultSize,
      defaultColor.class,
      defaultColor.name,
      product.image
    );

    this.snackBar.open(`🛒 Added "${product.name}" to Cart!`, 'Dismiss', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  ngAfterViewInit() {
    if (typeof $ !== 'undefined') {
      $('.set-bg').each(function (this: any) {
        const bg = $(this).data('setbg');
        if (bg) $(this).css('background-image', 'url(' + bg + ')');
      });
    }

    // Fade-in scroll animations
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            fadeObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      const fadeElements = this.el.nativeElement.querySelectorAll('.fade-in-element, .fade-in-left, .fade-in-right');
      fadeElements.forEach((el: any) => fadeObserver.observe(el));
    } else {
      const fadeElements = this.el.nativeElement.querySelectorAll('.fade-in-element, .fade-in-left, .fade-in-right');
      fadeElements.forEach((el: any) => el.classList.add('is-visible'));
    }
  }

  ngOnDestroy() {
    this.clearSlideTimer();
    if (typeof $ !== 'undefined') {
      const $slider = $('.hero__slider');
      if ($slider.hasClass('owl-loaded')) {
        $slider.off('changed.owl.carousel');
        $slider.trigger('destroy.owl.carousel');
      }
    }
  }
}
