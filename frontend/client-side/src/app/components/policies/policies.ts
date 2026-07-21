import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './policies.html',
  styleUrl: './policies.scss'
})
export class Policies implements OnInit {
  activeTab = 'privacy'; // default

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab && ['privacy', 'terms', 'shipping', 'returns'].includes(tab)) {
        this.activeTab = tab;
      }
    });

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  setTab(tab: string) {
    this.activeTab = tab;
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
