import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnDestroy {
  private socket: Socket;
  private readonly SERVER_URL = 'http://localhost:3000';

  // Subjects for each socket event
  private newOrderSubject = new Subject<any>();
  private orderStatusUpdatedSubject = new Subject<any>();
  private orderDeletedSubject = new Subject<any>();
  private newMessageSubject = new Subject<any>();

  constructor() {
    this.socket = io(this.SERVER_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('[Socket.IO] Connected to server:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected from server');
    });

    this.socket.on('new-order', (order: any) => {
      this.newOrderSubject.next(order);
    });

    this.socket.on('order-status-updated', (order: any) => {
      this.orderStatusUpdatedSubject.next(order);
    });

    this.socket.on('order-deleted', (data: any) => {
      this.orderDeletedSubject.next(data);
    });

    this.socket.on('new-message', (msg: any) => {
      this.newMessageSubject.next(msg);
    });
  }

  get newOrder$(): Observable<any> {
    return this.newOrderSubject.asObservable();
  }

  get orderStatusUpdated$(): Observable<any> {
    return this.orderStatusUpdatedSubject.asObservable();
  }

  get orderDeleted$(): Observable<any> {
    return this.orderDeletedSubject.asObservable();
  }

  get newMessage$(): Observable<any> {
    return this.newMessageSubject.asObservable();
  }

  ngOnDestroy() {
    this.socket.disconnect();
  }
}
