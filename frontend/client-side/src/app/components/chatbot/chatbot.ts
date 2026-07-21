import { Component, signal, ViewChild, ElementRef, AfterViewChecked, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { finalize, filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  orders?: { orderId: string, status: string, date: string, total: number }[];
  links?: { label: string, url: string }[];
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [MatIconModule, DatePipe, CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.scss',
})
export class Chatbot implements AfterViewChecked, AfterViewInit, OnDestroy {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  isOpen = signal(false);
  isTyping = signal(false);
  inputMessage = '';

  messages = signal<Message[]>([
    {
      text: "Hello! Welcome to RK Fashion. I am your AI assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private zone: NgZone
  ) { }

  nearFooter = signal(false);
  private _routerSub: any = null;
  private _intervalId: any = null;
  private _mutationObserver: MutationObserver | null = null;

  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      const checkOverlap = () => {
        this.zone.run(() => {
          const footer = document.querySelector('.footer-v2');
          if (!footer) return;
          const footerTop = footer.getBoundingClientRect().top;
          const viewportHeight = window.innerHeight;
          const isMobile = window.innerWidth <= 767;
          const triggerBottomLimit = isMobile ? (viewportHeight - 75) : (viewportHeight - 30);
          
          // If the top of the footer is above the bottom position of the chatbot button
          this.nearFooter.set(footerTop < triggerBottomLimit);
        });
      };

      // Initial check on load
      setTimeout(checkOverlap, 50);
      setTimeout(checkOverlap, 300);
      setTimeout(checkOverlap, 1000);

      // Listen on scroll and resize
      window.addEventListener('scroll', checkOverlap, { passive: true });
      window.addEventListener('resize', checkOverlap, { passive: true });

      // Save scroll handler for cleanup
      (this as any)._scrollHandler = checkOverlap;

      // Listen to navigation events to recalculate on page transitions
      this._routerSub = this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        setTimeout(checkOverlap, 50);
        setTimeout(checkOverlap, 400);
      });

      // Listen to DOM mutations (like loading states hiding and content expansion) for instant updates
      if (typeof MutationObserver !== 'undefined') {
        this._mutationObserver = new MutationObserver(() => {
          checkOverlap();
        });
        this._mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true
        });
      }

      // Background fallback check
      this._intervalId = setInterval(checkOverlap, 1000);
    }
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined' && (this as any)._scrollHandler) {
      window.removeEventListener('scroll', (this as any)._scrollHandler);
      window.removeEventListener('resize', (this as any)._scrollHandler);
    }
    if (this._routerSub) {
      this._routerSub.unsubscribe();
    }
    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
    }
    if (this._intervalId) {
      clearInterval(this._intervalId);
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen.update(val => !val);
    if (this.isOpen()) {
      this.scrollToBottom();
    }
  }

  scrollToBottom(): void {
    try {
      if (this.myScrollContainer) {
        this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) { }
  }

  faqs = signal([
    { question: 'What products do you sell?', answer: 'We sell men\'s wear including shirts, pants, jeans, hoodies, t-shirts, and cargos.' },
    { question: 'Do you offer Cash on Delivery?', answer: 'Yes! We support Cash on Delivery (COD) as a payment method for all orders.' },
    { question: 'Where is my order?', answer: 'You can track your order live here by choosing your order below.' },
    { question: 'What is your return policy?', answer: 'We offer a hassle-free 7-day return and exchange policy. You can request a return or exchange for any product within 7 days of delivery directly from the My Orders section in your profile.' },
    { question: 'How can I contact you?', answer: 'You can contact us via WhatsApp or Instagram.' },
  ]);

  onSelectFaq(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      this.sendMessage(select.value);
      select.value = ''; // Reset select to placeholder
    }
  }

  sendMessage(userText?: string) {
    if (!userText && (!this.inputMessage.trim() || this.isTyping())) return;
    const textToSend = userText || this.inputMessage.trim();
    if (!textToSend) return;

    this.inputMessage = '';

    // Add User Message
    this.messages.update(msgs => [
      ...msgs,
      { text: textToSend, sender: 'user', timestamp: new Date() }
    ]);

    this.isTyping.set(true);
    setTimeout(() => this.scrollToBottom(), 50);

    // Local instant intercept for specific queries
    const query = textToSend.trim().toLowerCase().replace(/[?.]/g, '');
    const isProductQuery = [
      'what products do you sell', 'what product', 'which product', 'kya bechte', 'kya sell', 'your products', 'what do you sell', 'types of clothes'
    ].some(keyword => query.includes(keyword));

    if (isProductQuery && !query.includes('order')) {
      setTimeout(() => {
        this.messages.update(msgs => [
          ...msgs,
          { text: "We sell men's wear clothing items like shirts, pants, jeans, hoodies, t-shirts, and cargos.", sender: 'bot', timestamp: new Date() }
        ]);
        this.isTyping.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
      }, 200); // 200ms delay for human feel
      return;
    }

    const isFirstBuyQuery = [
      'firstbuy', 'fstbuy', 'first buy', 'first order'
    ].some(keyword => query.includes(keyword));

    const isGeneralCouponQuery = [
      'coupon', 'discount', 'promocode', 'promo code', 'offer'
    ].some(keyword => query.includes(keyword));

    if (isFirstBuyQuery) {
      setTimeout(() => {
        this.messages.update(msgs => [
          ...msgs,
          { text: "First order par ₹100 instant off hai! Ise apply karne ke liye, Cart ya Buy page par 'Coupon Code' ka option hoga. Wahan pe 'FIRSTBUY' code daal kar apply karenge to turant discount mil jayega.", sender: 'bot', timestamp: new Date() }
        ]);
        this.isTyping.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
      }, 200);
      return;
    } else if (isGeneralCouponQuery) {
      setTimeout(() => {
        this.messages.update(msgs => [
          ...msgs,
          { text: "First order ke liye aap 'FIRSTBUY' code use kar sakte hain. Aur koi dusre coupons ke liye, hamari website me sign in kar lijiye agar nahi kiya ho to. Hum har mahine naye coupon codes dete hain jisse aapko fayda ho sake, aur jab bhi launch karenge to aapke registered email pe send kar dete hain.", sender: 'bot', timestamp: new Date() }
        ]);
        this.isTyping.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
      }, 200);
      return;
    }

    const isCodQuery = [
      'cash on delivery', 'cod', 'c o d', 'c.o.d', 'cash on deli', 'pay on delivery', 'cash',
      'delevry', 'delivry', 'delvery', 'delivery', 'pay on delevry', 'pay on delivry', 'cash delivery'
    ].some(keyword => query.includes(keyword) || query.split(' ').includes('cod') || query.includes('c.o.d'));

    if (isCodQuery) {
      setTimeout(() => {
        this.messages.update(msgs => [
          ...msgs,
          { text: "Yes! Cash on Delivery (COD) is fully available on RK Fashion. You can select it as your payment option at the checkout page.", sender: 'bot', timestamp: new Date() }
        ]);
        this.isTyping.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
      }, 200); // 200ms delay for human feel
      return;
    }

    const isReturnQuery = [
      'what is your return policy', 'return policy', 'return', 'riturn', 'refund', 'policy'
    ].some(keyword => query.includes(keyword));

    if (isReturnQuery && !query.includes('exchange')) {
      setTimeout(() => {
        this.messages.update(msgs => [
          ...msgs,
          { text: "Redirecting you to our FAQs & Policies page...", sender: 'bot', timestamp: new Date() }
        ]);
        this.isTyping.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
        this.router.navigate(['/faqs']);
      }, 300);
      return;
    }

    // Intercept location/address queries to redirect to Contact Us page
    const hasLocationKeyword = [
      'location', 'locatin', 'locaton', 'locason', 'locashon', 'lokason', 'lokation', 'lokesan', 'lokeshon', 'locasion',
      'address', 'adres', 'addres', 'adderss', 'adrs', 'addras',
      'map', 'mep', 'maap',
      'kaha pe', 'kaha hai', 'kaha he', 'kahan hai', 'kahan he', 'kahaa', 'kahah', 'khaa', 'khana pe',
      'located', 'locatd', 'where is the shop', 'where is your shop', 'where is rk fashion', 'shop kaha', 'shop kahan'
    ].some(keyword => query.includes(keyword));

    if (hasLocationKeyword && !query.includes('order')) {
      setTimeout(() => {
        this.messages.update(msgs => [
          ...msgs,
          { text: "Redirecting you to our Contact Us page where you can find our shop location map...", sender: 'bot', timestamp: new Date() }
        ]);
        this.isTyping.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
        this.router.navigate(['/contact']);
      }, 300);
      return;
    }

    // Intercept shop timing/opening queries to redirect to Contact Us page
    const hasTimingKeyword = [
      'timing', 'timig', 'timeing', 'timng', 'time',
      'opening hour', 'working hour', 'working hours', 'open hours',
      'khulne ka time', 'open hone ka time', 'shop time', 'shop timing',
      'opening time', 'closing time', 'shop open', 'shop close',
      'kab khulta', 'kab khulega', 'kab chalu', 'kab band', 'kab bandh'
    ].some(keyword => query.includes(keyword));

    if (hasTimingKeyword && !query.includes('order')) {
      setTimeout(() => {
        this.messages.update(msgs => [
          ...msgs,
          { text: "Redirecting you to our Contact Us page where you can find our shop timings and working hours...", sender: 'bot', timestamp: new Date() }
        ]);
        this.isTyping.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
        this.router.navigate(['/contact'], { fragment: 'working-hours' });
      }, 300);
      return;
    }

    const hasShirt = [
      'shirt', 'shrt', 'shat', 'sirt', 'shert', 'clothes', 'kapde', 'kapda', 'jeans', 'pant', 'hoodie', 'tshirt', 't-shirt'
    ].some(keyword => query.includes(keyword));
    const isQualityOrShow = [
      'quality', 'qualty', 'kwality', 'material', 'dikhao', 'dikha', 'show', 'view', 'kapda', 'fabric', 'kaisa', 'kaisa hai', 'acha', 'kaisi'
    ].some(keyword => query.includes(keyword));

    if (hasShirt && isQualityOrShow) {
      setTimeout(() => {
        this.messages.update(msgs => [
          ...msgs,
          { text: "At RK Fashion, we offer only premium quality shirts. You can explore our collection in the Shop section.", sender: 'bot', timestamp: new Date() }
        ]);
        this.isTyping.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
      }, 200);
      return;
    }

    // Intercept exchange queries to provide correct policy details
    const isExchangeQuery = [
      'exchange', 'exchnge', 'exchage', 'excange', 'exchang', 'ixchange',
      'replace', 'reples', 'riples', 'size change', 'size issue',
      'badalna', 'badal', 'change'
    ].some(keyword => query.includes(keyword));
    if (isExchangeQuery) {
      setTimeout(() => {
        this.messages.update(msgs => [
          ...msgs,
          {
            text: "We offer a 7-day return and exchange policy! You can easily raise a return or exchange request directly from the 'My Orders' section of your profile dashboard. If you need any assistance, feel free to contact us:",
            sender: 'bot',
            timestamp: new Date(),
            links: [
              { label: 'WhatsApp Chat', url: 'https://wa.me/919824429153' },
              { label: 'Instagram Profile', url: 'https://www.instagram.com/rk_fashion.surat?igsh=MW1oOWtkdzFqeXFyMA==' }
            ]
          }
        ]);
        this.isTyping.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
      }, 200);
      return;
    }

    const isContactOrSupportQuery = [
      'how can i contact you', 'contact', 'contct', 'sampark', 'owner', 'malik', 'manager',
      'customer care', 'customer support', 'support', 'help', 'agent', 'human',
      'talk to', 'baat kar', 'bat kar', 'call us', 'phone', 'number', 'mobile'
    ].some(keyword => query.includes(keyword));

    if (isContactOrSupportQuery && !query.includes('order')) {
      setTimeout(() => {
        this.messages.update(msgs => [
          ...msgs,
          {
            text: "You can reach out to our shop owner or customer support team directly via WhatsApp or Instagram:",
            sender: 'bot',
            timestamp: new Date(),
            links: [
              { label: 'WhatsApp Chat', url: 'https://wa.me/919824429153' },
              { label: 'Instagram Profile', url: 'https://www.instagram.com/rk_fashion.surat?igsh=MW1oOWtkdzFqeXFyMA==' }
            ]
          }
        ]);
        this.isTyping.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
      }, 200);
      return;
    }

    const isOrderTrackQuery = [
      'where is my order', 'track my order', 'track order', 'order status', 'mera order', 'order kaha', 'order kahan'
    ].some(keyword => query.includes(keyword));

    if (isOrderTrackQuery) {
      const user = this.authService.getLoggedInUser();
      if (!user) {
        setTimeout(() => {
          this.messages.update(msgs => [
            ...msgs,
            { text: "Please log in first to track your orders.", sender: 'bot', timestamp: new Date() }
          ]);
          this.isTyping.set(false);
          setTimeout(() => this.scrollToBottom(), 50);
        }, 200);
        return;
      }

      this.authService.getUserOrders().subscribe({
        next: (orders) => {
          this.isTyping.set(false);
          if (!orders || orders.length === 0) {
            this.messages.update(msgs => [
              ...msgs,
              { text: "You haven't placed any orders with us yet.", sender: 'bot', timestamp: new Date() }
            ]);
          } else {
            this.messages.update(msgs => [
              ...msgs,
              {
                text: "Which order are you talking about? Click on it below to check its status:",
                sender: 'bot',
                timestamp: new Date(),
                orders: orders.map(o => ({ orderId: o.orderId, status: o.status, date: o.date, total: o.total }))
              }
            ]);
          }
          setTimeout(() => this.scrollToBottom(), 50);
        },
        error: (err) => {
          this.isTyping.set(false);
          this.messages.update(msgs => [
            ...msgs,
            { text: "Sorry, I had trouble fetching your orders right now.", sender: 'bot', timestamp: new Date() }
          ]);
          setTimeout(() => this.scrollToBottom(), 50);
        }
      });
      return;
    }

    // Call backend API for Gemini AI response
    this.http.post<{ text: string }>('http://localhost:3000/api/chat', {
      message: textToSend,
      history: this.messages()
    }).pipe(
      finalize(() => this.isTyping.set(false))
    ).subscribe({
      next: (res) => {
        this.messages.update(msgs => [
          ...msgs,
          { text: res.text, sender: 'bot', timestamp: new Date() }
        ]);
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => {
        console.error('Chat API Error:', err);
        this.messages.update(msgs => [
          ...msgs,
          {
            text: "Please contact our support team directly via WhatsApp or Instagram:",
            sender: 'bot',
            timestamp: new Date(),
            links: [
              { label: 'WhatsApp Chat', url: 'https://wa.me/919824429153' },
              { label: 'Instagram Profile', url: 'https://www.instagram.com/rk_fashion.surat?igsh=MW1oOWtkdzFqeXFyMA==' }
            ]
          }
        ]);
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }

  showOrderStatus(orderId: string, status: string) {
    if (this.isTyping()) return;

    // Add user selection message
    this.messages.update(msgs => [
      ...msgs,
      { text: `Check status for Order #${orderId}`, sender: 'user', timestamp: new Date() }
    ]);

    this.isTyping.set(true);
    setTimeout(() => this.scrollToBottom(), 50);

    setTimeout(() => {
      this.isTyping.set(false);
      this.messages.update(msgs => [
        ...msgs,
        { text: `The status of your Order #${orderId} is currently "${status}".`, sender: 'bot', timestamp: new Date() }
      ]);
      setTimeout(() => this.scrollToBottom(), 50);
    }, 400); // 400ms delay for human conversation feel
  }

  handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.sendMessage();
    }
  }
}
