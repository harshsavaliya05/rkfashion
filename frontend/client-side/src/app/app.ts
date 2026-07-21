import { Component, signal } from '@angular/core';
import { RouterOutlet, Router, Scroll } from '@angular/router';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { Chatbot } from './components/chatbot/chatbot';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, Chatbot],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('client-side');

  constructor(private router: Router) {
    if (typeof window !== 'undefined') {
      this.router.events.pipe(
        filter(event => event instanceof Scroll)
      ).subscribe((e: any) => {
        if (e.position) {
          // Backward/Forward navigation: restore previous scroll position
          setTimeout(() => {
            window.scrollTo({ top: e.position[1], left: e.position[0], behavior: 'instant' });
          }, 0);
        } else if (e.anchor) {
          // Anchor link navigation
          setTimeout(() => {
            const el = document.getElementById(e.anchor);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }, 0);
        } else {
          // Forward navigation: scroll to top instantly
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }, 0);
        }
      });
    }
  }
}

