import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BlogService, BlogItem, BlogComment } from '../../services/blog.service';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-blog-details',
  imports: [RouterLink, DatePipe, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './blog-details.html',
  styleUrl: './blog-details.scss',
})
export class BlogDetails implements OnInit {
  blog: BlogItem | undefined;
  comments: BlogComment[] = [];
  commentForm!: FormGroup;
  showCommentSuccess = false;
  commentsLimit = 3;

  constructor(
    private route: ActivatedRoute,
    private blogService: BlogService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.initForm();
  }

  initForm() {
    this.commentForm = this.fb.group({
      text: ['', Validators.required]
    });
  }

  get visibleComments(): BlogComment[] {
    return this.comments.slice(0, this.commentsLimit);
  }

  loadMoreComments() {
    this.commentsLimit += 5;
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      console.log('[BlogDetails] Route param idStr =', idStr);
      if (idStr) {
        const id = +idStr;
        console.log('[BlogDetails] Fetching blog with numeric ID =', id);
        this.blogService.getBlogById(id).subscribe({
          next: (blog) => {
            console.log('[BlogDetails] Successfully fetched blog:', blog);
            setTimeout(() => {
              this.blog = blog;
              this.cdr.detectChanges();
              if (this.blog) {
                // Fetch unique comments for this specific blog ID from PostgreSQL
                this.blogService.getCommentsByBlogId(id).subscribe({
                  next: (comments) => {
                    console.log('[BlogDetails] Successfully fetched comments:', comments);
                    this.comments = comments;
                    if (this.blog) {
                      this.blog.commentsCount = comments.length;
                    }
                    this.cdr.detectChanges();
                  },
                  error: (err) => {
                    console.error('[BlogDetails] Error fetching comments:', err);
                  }
                });
              }
            }, 0);
          },
          error: (err) => {
            console.error('[BlogDetails] Error fetching blog:', err);
            setTimeout(() => {
              this.blog = undefined;
              this.cdr.detectChanges();
            }, 0);
          }
        });
      }
    });
  }

  onPhoneInput(event: Event) {
    // Left empty as phone is no longer part of the form
  }

  shareBlog(platform: string) {
    if (!this.blog) return;
    const url = window.location.href;
    const text = `Check out this blog: ${this.blog.title}`;

    if (platform === 'instagram') {
      navigator.clipboard.writeText(url).then(() => {
        this.snackBar.open("🎉 Link copied! You can now paste it in your Instagram story or DM.", "Dismiss", { duration: 4000 });
      });
      return;
    }

    let shareLink = '';
    if (platform === 'facebook') {
      shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    } else if (platform === 'twitter') {
      shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    } else if (platform === 'whatsapp') {
      shareLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}%20${encodeURIComponent(url)}`;
    }

    if (shareLink) {
      window.open(shareLink, '_blank');
    }
  }

  addComment() {
    if (!this.authService.checkAuthAndTriggerModal('post a comment')) {
      return;
    }

    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }
    if (!this.blog) return;

    const currentUser = this.authService.getLoggedInUser();

    const commentData = {
      name: currentUser.name,
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      text: this.commentForm.value.text,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    };

    this.blogService.addComment(this.blog.id, commentData).subscribe(newComment => {
      this.comments.unshift(newComment);
      if (this.blog) {
        this.blog.commentsCount = this.comments.length;
      }
      this.commentForm.reset();
      this.showCommentSuccess = true;
      setTimeout(() => this.showCommentSuccess = false, 4000);
    });
  }
}
