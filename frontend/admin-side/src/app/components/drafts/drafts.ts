import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService, ProductItem } from '../../services/product.service';

@Component({
  selector: 'app-drafts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './drafts.html',
  styleUrl: './drafts.scss',
})
export class DraftsComponent implements OnInit {
  drafts: ProductItem[] = [];

  constructor(
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadDrafts();
  }

  loadDrafts() {
    this.productService.getDraftProducts().subscribe(prods => {
      this.drafts = prods;
      this.cdr.detectChanges();
    });
  }

  publishDraft(id: number) {
    this.productService.publishProduct(id).subscribe(() => {
      this.loadDrafts(); // reload
    });
  }

  deleteDraft(id: number) {
    if (confirm('Are you sure you want to delete this draft?')) {
      this.productService.deleteProduct(id).subscribe(() => {
        this.loadDrafts(); // reload
      });
    }
  }
}
