import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from '../../services/message.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-contact',
  imports: [MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact implements OnInit {
  contactDescription = "At RK Fashion, customer satisfaction comes first. From premium men's wear to exceptional customer support, we're committed to making every shopping experience smooth, reliable, and enjoyable. Get in touch with us—we'd love to hear from you.";
  contactForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private snackBar: MatSnackBar
  ) {
    this.contactForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      subject: ['', [Validators.required]],
      message: ['', [Validators.required]]
    });
  }

  onInputUppercase(controlName: string) {
    const control = this.contactForm.get(controlName);
    if (control && control.value) {
      control.setValue(control.value.toUpperCase(), { emitEvent: false });
    }
  }

  onPhoneInput(event: any) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
    this.contactForm.get('phone')?.setValue(value, { emitEvent: false });
  }

  sendToWhatsApp() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const { fullName, email, phone, subject, message } = this.contactForm.value;
    
    // Save to PostgreSQL database
    const newMsg = {
      name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      subject: subject.trim(),
      message: message.trim(),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    this.messageService.saveMessage(newMsg).subscribe({
      next: () => {
        const whatsappNumber = '919824429153';
        
        // Format message beautifully with emojis and line breaks
        const text = `*New Inquiry Details*
----------------------------------
*Name:* ${fullName.trim()}
*Email:* ${email.trim()}
*Phone:* ${phone.trim()}
*Subject:* ${subject.trim()}
*Message:* ${message.trim()}`;

        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      },
      error: (err) => {
        console.error('Error saving message to database:', err);
        this.snackBar.open('❌ Failed to submit message to database. Please try again.', 'Dismiss', { duration: 4000 });
      }
    });
  }

  ngOnInit() {
    this.route.fragment.subscribe(frag => {
      if (frag === 'store-map') {
        this.scrollToMap();
      } else if (frag === 'working-hours') {
        this.scrollToWorkingHours();
      }
    });
  }

  private scrollToMap() {
    setTimeout(() => {
      const mapElement = document.getElementById('store-map');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  }

  private scrollToWorkingHours() {
    setTimeout(() => {
      const element = document.getElementById('working-hours-info');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }
}
