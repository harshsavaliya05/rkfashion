import { Component, AfterViewInit, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlogService, BlogItem } from '../../services/blog.service';
import { CommonModule } from '@angular/common';

declare var $: any;

@Component({
  selector: 'app-blog',
  imports: [RouterLink, CommonModule],
  templateUrl: './blog.html',
  styleUrl: './blog.scss',
})
export class Blog implements OnInit, AfterViewInit {
  blogs: BlogItem[] = [];

  constructor(
    private blogService: BlogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('[BlogComponent] ngOnInit called');
    this.blogService.getBlogs().subscribe({
      next: (blogs) => {
        console.log('[BlogComponent] Successfully fetched blogs:', blogs);
        setTimeout(() => {
          this.blogs = blogs;
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('[BlogComponent] Error fetching blogs:', err);
      }
    });
  }

  ngAfterViewInit() {
    if (typeof $ !== 'undefined') {
      $('.set-bg').each(function (this: any) {
        const bg = $(this).data('setbg');
        if (bg) {
          $(this).css('background-image', 'url(' + bg + ')');
        }
      });
    }
  }
}
