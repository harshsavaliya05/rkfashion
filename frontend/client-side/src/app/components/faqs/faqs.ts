import { Component, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-faqs',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './faqs.html',
  styleUrl: './faqs.scss'
})
export class Faqs {
  activeFaq = '';

  faqsList = [
    { q: 'How do I avail the ₹100 discount?', a: 'Simply add items to your cart, go to checkout, and enter coupon code FIRST100 to get instant ₹100 discount on your first order.' },
    { q: 'Is there a minimum order value for free delivery?', a: 'Yes, free delivery is automatically applied to all orders above ₹999. For orders below ₹999, a standard delivery charge of ₹99 applies.' },
    { q: 'Do you offer Cash on Delivery (COD)?', a: 'Yes! Cash on Delivery is fully active and available. You can choose Cash on Delivery as your payment method during the checkout process.' },
    { q: 'What is your return & exchange policy?', a: 'We offer a hassle-free 7-day return and exchange policy. You can request a return or exchange for any order within 7 days of delivery directly from the My Orders section in your profile dashboard. Items must be unused and in original packaging with tags intact.' },
    { q: 'How can I track my shipment?', a: 'Once your order is shipped, we will send you a tracking link via email and SMS. You can use it to track your package in real-time.' }
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  toggleFaq(q: string) {
    this.activeFaq = this.activeFaq === q ? '' : q;
    this.cdr.detectChanges();
  }
}
