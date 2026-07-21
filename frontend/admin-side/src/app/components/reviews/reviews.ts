import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService, Review } from '../../services/review.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './reviews.html',
  styleUrl: './reviews.scss',
})
export class ReviewsComponent implements OnInit, OnDestroy {
  filterStar = '';

  allReviews: Review[] = [];
  filteredReviews: Review[] = [];

  constructor(
    private reviewService: ReviewService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  isVideo(url: string | undefined): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.ogg') || lower.includes('/video/') || lower.includes('video_');
  }

  getSafeVideoUrl(url: string | undefined): SafeResourceUrl | string {
    if (!url) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  apiError = '';

  ngOnInit() {
    this.loadReviews();
  }

  ngOnDestroy() {}

  loadReviews() {
    this.apiError = '';
    this.reviewService.getAllReviews().subscribe({
      next: reviews => {
        console.log('Admin Reviews Component: loaded all reviews from API:', reviews);
        this.allReviews = reviews || [];
        this.applyFilter();
      },
      error: err => {
        console.error('Failed to load reviews:', err);
        this.apiError = `API Connection Error: Failed to fetch reviews from server. Please make sure the backend server is running. (Error details: ${err.message || err.statusText || 'Unknown'})`;
      }
    });
  }

  applyFilter() {
    const star = (this.filterStar && this.filterStar.trim() !== '') ? Number(this.filterStar) : null;

    console.log('Admin Reviews Component applyFilter: star filter =', star);

    this.filteredReviews = this.allReviews.filter(r => {
      const rRating = r.rating ? Number(r.rating) : 0;
      const starMatch = star === null || isNaN(star) || rRating === star;
      return starMatch;
    });

    console.log('Admin Reviews Component applyFilter: filtered result count =', this.filteredReviews.length, 'data =', this.filteredReviews);
    this.cdr.detectChanges();
  }

  getStars(rating: number): number[] {
    const count = Math.max(0, Math.min(5, Math.floor(Number(rating) || 0)));
    return Array(count).fill(0);
  }

  getEmptyStars(rating: number): number[] {
    const count = Math.max(0, Math.min(5, Math.floor(Number(rating) || 0)));
    return Array(5 - count).fill(0);
  }
}
