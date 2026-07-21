import { Component, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';

declare var $: any;

@Component({
  selector: 'app-about',
  imports: [],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About implements AfterViewInit {
  @ViewChild('counterSection') counterSection!: ElementRef;

  customersCount = 0;
  categoriesCount = 0;
  statesCount = 0;
  deliveryRate = 0.0;

  private animationTriggered = false;

  constructor(
    private el: ElementRef,
    private cdr: ChangeDetectorRef
  ) { }

  ngAfterViewInit() {
    // jQuery set-bg setup
    if (typeof $ !== 'undefined') {
      $('.set-bg').each(function (this: any) {
        const bg = $(this).data('setbg');
        if (bg) {
          $(this).css('background-image', 'url(' + bg + ')');
        }
      });
    }

    // Scroll trigger for fade-in elements
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
      // Fallback
      const fadeElements = this.el.nativeElement.querySelectorAll('.fade-in-element, .fade-in-left, .fade-in-right');
      fadeElements.forEach((el: any) => el.classList.add('is-visible'));
    }

    // Scroll trigger intersection observer
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.animationTriggered) {
            this.animationTriggered = true;
            this.animateCounters();
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });

      if (this.counterSection) {
        observer.observe(this.counterSection.nativeElement);
      }
    } else {
      // Fallback
      this.customersCount = 15;
      this.categoriesCount = 8;
      this.statesCount = 28;
      this.deliveryRate = 99.8;
      this.cdr.detectChanges();
    }
  }

  animateCounters() {
    const duration = 2000; // Duration of animation in ms
    const frameRate = 1000 / 60; // 60 frames per second
    const totalFrames = Math.round(duration / frameRate);

    const targets = {
      customers: 15,
      categories: 8,
      states: 28,
      delivery: 99.8
    };

    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;

      // Easing: easeOutQuad
      const ease = progress * (2 - progress);

      this.customersCount = Math.round(targets.customers * ease);
      this.categoriesCount = Math.round(targets.categories * ease);
      this.statesCount = Math.round(targets.states * ease);

      const rawDelivery = targets.delivery * ease;
      this.deliveryRate = parseFloat(rawDelivery.toFixed(1));

      if (frame >= totalFrames) {
        clearInterval(timer);
        this.customersCount = targets.customers;
        this.categoriesCount = targets.categories;
        this.statesCount = targets.states;
        this.deliveryRate = targets.delivery;
      }
      this.cdr.detectChanges();
    }, frameRate);
  }
}

