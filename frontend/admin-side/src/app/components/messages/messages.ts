import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ContactMessage } from '../../services/message.service';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.html',
  styleUrl: './messages.scss'
})
export class MessagesComponent implements OnInit, OnDestroy {
  searchTerm = '';
  filterStatus = '';
  
  selectedMsg: ContactMessage | null = null;
  showDeleteConfirmId: number | null = null;
  showDeleteConfirmName = '';

  allMessages: ContactMessage[] = [];
  filteredMessages: ContactMessage[] = [];

  defaultMessages = [
    {
      name: 'Amit Kumar',
      email: 'amit.kumar@gmail.com',
      phone: '9876543210',
      subject: 'Inquiry regarding bulk corporate order',
      message: 'Hello, we are planning to order 120 shirts with custom brand embroidery for our company event. Can you share prices and discount timelines? Thanks.',
      date: '06 Jul 2026, 04:30 PM',
      status: 'unread' as const
    },
    {
      name: 'Priya Verma',
      email: 'priya.verma@yahoo.com',
      phone: '8888877777',
      subject: 'Replacement query for order RK-592813',
      message: 'I received the Premium Cotton Solid Shirt yesterday. Sizing M is slightly tight for me. I want to replace it with L size. Please initiate exchange.',
      date: '05 Jul 2026, 11:15 AM',
      status: 'unread' as const
    },
    {
      name: 'Vikram Singh',
      email: 'vikram.singh@outlook.com',
      phone: '7777766666',
      subject: 'Delivery delay issue',
      message: 'My order has been showing Shipped status for the last 5 days but no delivery attempt has been made. Please check with logistics.',
      date: '03 Jul 2026, 02:40 PM',
      status: 'read' as const
    }
  ];

  constructor(
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private socketService: SocketService
  ) {}

  private socketSub?: Subscription;

  ngOnInit() {
    this.loadMessages();
    // Listen for new contact messages via WebSocket
    this.socketSub = this.socketService.newMessage$.subscribe(msg => {
      this.allMessages.unshift(msg);
      this.applyFilters();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.socketSub?.unsubscribe();
  }

  loadMessages() {
    this.messageService.getMessages().subscribe(messages => {
      if (messages.length === 0) {
        // Seed default messages
        let count = 0;
        this.defaultMessages.forEach(m => {
          this.messageService.saveMessage(m).subscribe(() => {
            count++;
            if (count === this.defaultMessages.length) {
              this.loadMessages();
            }
          });
        });
      } else {
        this.allMessages = messages;
        this.applyFilters();
      }
    });
  }

  applyFilters() {
    this.filteredMessages = this.allMessages.filter(m => {
      const matchSearch = !this.searchTerm.trim() || 
        m.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.subject.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchStatus = !this.filterStatus || m.status === this.filterStatus;
      
      return matchSearch && matchStatus;
    });
    this.cdr.detectChanges();
  }

  openMessage(msg: ContactMessage) {
    this.selectedMsg = msg;
    if (msg.status === 'unread' && msg.id) {
      msg.status = 'read';
      this.messageService.updateMessageStatus(msg.id, 'read').subscribe(() => {
        this.applyFilters();
      });
    }
  }

  closeMessage() {
    this.selectedMsg = null;
  }

  deleteMsg(msg: ContactMessage, event: Event) {
    event.stopPropagation();
    this.showDeleteConfirmId = msg.id || null;
    this.showDeleteConfirmName = msg.name;
  }

  cancelDelete() {
    this.showDeleteConfirmId = null;
    this.showDeleteConfirmName = '';
    this.cdr.detectChanges();
  }

  confirmDelete() {
    if (this.showDeleteConfirmId !== null) {
      this.messageService.deleteMessage(this.showDeleteConfirmId).subscribe(() => {
        this.allMessages = this.allMessages.filter(m => m.id !== this.showDeleteConfirmId);
        if (this.selectedMsg?.id === this.showDeleteConfirmId) {
          this.selectedMsg = null;
        }
        this.cancelDelete();
        this.applyFilters();
      });
    }
  }
}
