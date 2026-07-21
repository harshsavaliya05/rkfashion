import { Router } from 'express';
import prisma from '../prisma';
import { io } from '../server';
import { sendOrderPlacedEmail, sendOrderStatusUpdateEmail, sendReturnExchangeInitiatedEmail, sendReturnExchangeStatusUpdateEmail } from '../utils/mailer';
import crypto from 'crypto';
import puppeteer from 'puppeteer';

const router = Router();

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: {
        id: 'desc'
      }
    });

    const returnRequests = await prisma.returnExchangeRequest.findMany();

    const ordersWithRequests = orders.map(order => {
      const requests = returnRequests.filter(r => r.orderId === order.orderId);
      return {
        ...order,
        returnRequests: requests
      };
    });

    res.json(ordersWithRequests);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create order — emits 'new-order' event via Socket.IO
router.post('/', async (req, res) => {
  try {
    const {
      orderId,
      userEmail,
      date,
      subtotal,
      discount,
      total,
      paymentMethod,
      status,
      shippingAddress,
      items
    } = req.body;

    // Fetch payments settings from DB to validate requested method is enabled
    const paymentsSettings = await prisma.settings.findUnique({
      where: { key: 'payments' }
    });
    const payConfig = paymentsSettings?.value as any;
    
    if (payConfig) {
      const pmLower = (paymentMethod || '').toLowerCase();
      
      // COD validation
      if (pmLower.includes('cash on delivery') || pmLower.includes('cod')) {
        if (payConfig.codActive !== true) {
          return res.status(400).json({ error: 'Cash on Delivery (COD) is currently disabled.' });
        }
      }
      // Razorpay validation
      else if (pmLower.includes('debit/credit card') || pmLower.includes('card')) {
        if (payConfig.razorpayActive !== true) {
          return res.status(400).json({ error: 'Card Payment is currently disabled.' });
        }
      }
      // Cashfree validation
      else if (pmLower.includes('cashfree') || pmLower.includes('online payment')) {
        if (payConfig.cashfreeActive !== true) {
          return res.status(400).json({ error: 'Online Payment (Cashfree) is currently disabled.' });
        }
      }
      // UPI validation (UPI is no longer supported)
      else if (pmLower.includes('google pay') || pmLower.includes('phonepe') || pmLower.includes('paytm') || pmLower.includes('upi')) {
        return res.status(400).json({ error: 'UPI Payment method is no longer supported.' });
      }
    }

    // Secure price validation and variant stock check against frontend price tampering / out of stock ordering
    let calculatedSubtotal = 0;
    const itemsList = items || [];
    for (const item of itemsList) {
      const productId = Number(item.productId);
      if (!productId) {
        return res.status(400).json({ error: 'Invalid product details in order.' });
      }
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return res.status(400).json({ error: 'Product not found in database catalogue.' });
      }
      calculatedSubtotal += product.price * Number(item.quantity || 1);

      // Verify variant stock level
      const variants = product.variants as any[];
      if (Array.isArray(variants)) {
        let variantIdx = variants.findIndex(v => 
          v.size === item.size && 
          (v.colorName || '').toLowerCase() === (item.colorName || '').toLowerCase()
        );
        if (variantIdx === -1) {
          variantIdx = variants.findIndex(v => v.size === item.size);
        }
        
        if (variantIdx > -1) {
          const availableStock = Number(variants[variantIdx].stock) || 0;
          const reqQty = Number(item.quantity) || 1;
          if (availableStock < reqQty) {
            return res.status(400).json({ 
              error: `Sorry, product "${item.name}" (Size: ${item.size}, Color: ${item.colorName || 'Default'}) has insufficient stock. Only ${availableStock} items left.` 
            });
          }
        }
      }
    }
    
    const submittedSubtotal = Number(subtotal);
    // Allow a small delta of 2 INR for any frontend rounding/precision differences
    if (Math.abs(calculatedSubtotal - submittedSubtotal) > 2.0) {
      return res.status(400).json({ error: 'Security Alert: Product price mismatch detected. Order placement rejected.' });
    }

    const order = await prisma.order.create({
      data: {
        orderId,
        userEmail,
        date,
        subtotal: Number(subtotal),
        discount: Number(discount),
        total: Number(total),
        paymentMethod,
        status: status || 'Pending',
        shippingAddress: shippingAddress || {},
        items: items || [],
        statusHistory: [{ status: status || 'Pending', date: new Date().toISOString() }]
      },
    });

    // Deduct stock for each ordered item variant upon placement
    if (Array.isArray(itemsList)) {
      for (const item of itemsList) {
        const productId = Number(item.productId);
        const size = item.size;
        const colorName = item.colorName;
        const quantity = Number(item.quantity) || 1;

        if (productId) {
          const product = await prisma.product.findUnique({ where: { id: productId } });
          if (product) {
            const variants = product.variants as any[];
            if (Array.isArray(variants)) {
              let variantIdx = variants.findIndex(v => 
                v.size === size && 
                (v.colorName || '').toLowerCase() === (colorName || '').toLowerCase()
              );
              if (variantIdx === -1) {
                variantIdx = variants.findIndex(v => v.size === size);
              }
              if (variantIdx > -1) {
                const currentStock = Number(variants[variantIdx].stock) || 0;
                const newStock = Math.max(0, currentStock - quantity);
                variants[variantIdx].stock = newStock;
                
                await prisma.product.update({
                  where: { id: productId },
                  data: { variants }
                });
                console.log(`[Order Placement Stock Sync] Deducted ${quantity} stock for Product ID ${productId} (Size: ${size}, Color: ${colorName}). New Stock: ${newStock}`);
              }
            }
          }
        }
      }
    }

    // Emit real-time event to all connected admin clients
    io.emit('new-order', order);
    console.log(`[Socket.IO] Emitted new-order event for: ${orderId}`);

    // Send email alert for order placement asynchronously
    sendOrderPlacedEmail(
      order.userEmail,
      order.orderId,
      order.items as any[],
      order.total,
      order.paymentMethod,
      order.shippingAddress
    );

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status — emits 'order-status-updated' event
router.put('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const existingOrder = await prisma.order.findUnique({ where: { orderId } });
    if (!existingOrder) return res.status(404).json({ error: 'Order not found' });
    
    // Block status modifications on Cancelled or Returned orders
    const terminalStatuses = ['cancelled', 'returned'];
    if (terminalStatuses.includes(existingOrder.status.toLowerCase())) {
      return res.status(400).json({ error: 'Cannot update status of a Cancelled or Returned order.' });
    }
    
    let history: any[] = [];
    if (existingOrder.statusHistory && Array.isArray(existingOrder.statusHistory)) {
      history = existingOrder.statusHistory as any[];
    }
    
    history.push({ status, date: new Date().toISOString() });

    // Restore stock if transitioning to 'Cancelled' or 'Returned' and wasn't already in those states
    const isRestorableStatus = (s: string) => {
      const lower = (s || '').toLowerCase();
      return lower === 'cancelled' || lower === 'returned';
    };

    if (isRestorableStatus(status) && !isRestorableStatus(existingOrder.status)) {
      const items = existingOrder.items as any[];
      if (Array.isArray(items)) {
        for (const item of items) {
          const productId = Number(item.productId);
          const size = item.size;
          const colorName = item.colorName;
          const quantity = Number(item.quantity) || 1;

          if (productId) {
            const product = await prisma.product.findUnique({ where: { id: productId } });
            if (product) {
              const variants = product.variants as any[];
              if (Array.isArray(variants)) {
                let variantIdx = variants.findIndex(v => 
                  v.size === size && 
                  (v.colorName || '').toLowerCase() === (colorName || '').toLowerCase()
                );
                if (variantIdx === -1) {
                  variantIdx = variants.findIndex(v => v.size === size);
                }
                if (variantIdx > -1) {
                  const currentStock = Number(variants[variantIdx].stock) || 0;
                  const newStock = currentStock + quantity;
                  variants[variantIdx].stock = newStock;

                  await prisma.product.update({
                    where: { id: productId },
                    data: { variants }
                  });
                  console.log(`[Stock Status Restored] Restored ${quantity} stock for Product ID ${productId} (Size: ${size}, Color: ${colorName}). Old Stock: ${currentStock}, New Stock: ${newStock}`);
                }
              }
            }
          }
        }
      }
    }

    const order = await prisma.order.update({
      where: { orderId },
      data: { status, statusHistory: history },
    });

    // Emit real-time status update
    io.emit('order-status-updated', order);

    // Send status update email alert asynchronously
    sendOrderStatusUpdateEmail(
      order.userEmail,
      order.orderId,
      status,
      order.shippingAddress
    );

    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Delete order
router.delete('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    await prisma.order.delete({ where: { orderId } });

    // Emit deletion event
    io.emit('order-deleted', { orderId });

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// 3. Create Razorpay Payment Session
router.post('/razorpay/session', async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    if (!orderId || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const paymentsSettings = await prisma.settings.findUnique({
      where: { key: 'payments' }
    });
    const value = paymentsSettings?.value as any;
    
    if (!value || value.razorpayActive !== true) {
      return res.status(400).json({ error: 'Razorpay payment gateway is disabled' });
    }

    const keyId = value?.razorpayKeyId;
    const keySecret = value?.razorpaySecretKey;
    
    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Razorpay keys are not configured' });
    }

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(Number(amount) * 100), // amount in paisa
        currency: 'INR',
        receipt: orderId
      })
    });

    const data: any = await response.json();
    if (!response.ok) {
      console.error('[Razorpay Session Error]:', data);
      return res.status(response.status).json({ error: data.error?.description || 'Failed to create Razorpay order' });
    }

    res.json({ 
      razorpayOrderId: data.id,
      amount: data.amount,
      keyId: keyId
    });
  } catch (error) {
    console.error('Error creating Razorpay session:', error);
    res.status(500).json({ error: 'Failed to create Razorpay session' });
  }
});

// 4. Verify Razorpay Payment
router.post('/razorpay/verify', async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing verification parameters' });
    }

    const order = await prisma.order.findUnique({
      where: { orderId }
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const paymentsSettings = await prisma.settings.findUnique({
      where: { key: 'payments' }
    });
    const value = paymentsSettings?.value as any;
    const keySecret = value?.razorpaySecretKey;

    if (!keySecret) {
      return res.status(500).json({ error: 'Razorpay credentials not found' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpayOrderId + '|' + razorpayPaymentId)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    // Update order status to "Processing" and save Razorpay payment ID
    const updatedOrder = await prisma.order.update({
      where: { orderId },
      data: {
        status: 'Processing',
        statusHistory: [
          ...(order.statusHistory as any[]),
          { status: 'Processing', date: new Date().toISOString(), note: 'Payment verified via Razorpay', paymentId: razorpayPaymentId }
        ]
      }
    });

    res.json({ message: 'Payment verified successfully', order: updatedOrder });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// 1. Create Cashfree Payment Session
router.post('/cashfree/session', async (req, res) => {
  try {
    const { orderId, amount, customerName, customerEmail, customerPhone } = req.body;

    if (!orderId || !amount || !customerEmail || !customerPhone) {
      return res.status(400).json({ error: 'Missing required session parameters' });
    }

    // Fetch cashfree settings from DB
    const paymentsSettings = await prisma.settings.findUnique({
      where: { key: 'payments' }
    });

    const value = paymentsSettings?.value as any;
    
    // Check if Cashfree is disabled
    if (!value || value.cashfreeActive !== true) {
      return res.status(400).json({ error: 'Cashfree payment gateway is currently disabled in system settings.' });
    }

    const appId = value?.cashfreeAppId || process.env.CASHFREE_APP_ID;
    const secretKey = value?.cashfreeSecretKey || process.env.CASHFREE_SECRET_KEY;
    const envMode = value?.cashfreeMode || process.env.CASHFREE_ENV || 'sandbox';

    if (!appId || !secretKey) {
      return res.status(500).json({ error: 'Cashfree payment gateway is not configured' });
    }

    const baseUrl = (envMode === 'live' || envMode === 'production')
      ? 'https://api.cashfree.com/pg/orders'
      : 'https://sandbox.cashfree.com/pg/orders';

    const cleanPhone = customerPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;

    const payload = {
      order_amount: Number(Number(amount).toFixed(2)),
      order_currency: 'INR',
      order_id: orderId,
      customer_details: {
        customer_id: `cust_${Date.now()}`,
        customer_phone: finalPhone || '9999999999',
        customer_email: customerEmail,
        customer_name: customerName || 'Customer'
      },
      order_meta: {
        return_url: `http://localhost:4200/order-success?id=${orderId}&payment=cashfree`
      }
    };

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error('[Cashfree Session Error]:', data);
      return res.status(response.status).json({ error: data.message || 'Failed to create Cashfree order' });
    }

    res.json({
      paymentSessionId: data.payment_session_id,
      orderId: data.order_id,
      cfOrderId: data.cf_order_id,
      orderStatus: data.order_status
    });
  } catch (error) {
    console.error('Error creating Cashfree session:', error);
    res.status(500).json({ error: 'Failed to create payment session' });
  }
});

// 2. Verify Cashfree Payment
router.post('/cashfree/verify', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    // Fetch order from DB
    const order = await prisma.order.findUnique({
      where: { orderId }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found in database' });
    }

    // Fetch cashfree settings
    const paymentsSettings = await prisma.settings.findUnique({
      where: { key: 'payments' }
    });

    const value = paymentsSettings?.value as any;
    const appId = value?.cashfreeAppId || process.env.CASHFREE_APP_ID;
    const secretKey = value?.cashfreeSecretKey || process.env.CASHFREE_SECRET_KEY;
    const envMode = value?.cashfreeMode || process.env.CASHFREE_ENV || 'sandbox';

    if (!appId || !secretKey) {
      return res.status(500).json({ error: 'Cashfree payment gateway is not configured' });
    }

    const baseUrl = (envMode === 'live' || envMode === 'production')
      ? 'https://api.cashfree.com/pg/orders'
      : 'https://sandbox.cashfree.com/pg/orders';

    const response = await fetch(`${baseUrl}/${orderId}`, {
      method: 'GET',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      }
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error('[Cashfree Verify Error]:', data);
      return res.status(response.status).json({ error: data.message || 'Failed to verify Cashfree order' });
    }

    if (data.order_status === 'PAID') {
      // Update order status if not already confirmed/processed
      if (order.status === 'Pending' || order.status === 'Processing') {
        let history: any[] = [];
        if (order.statusHistory && Array.isArray(order.statusHistory)) {
          history = order.statusHistory as any[];
        }
        
        // Add confirmed to status history
        history.push({ status: 'Confirmed', date: new Date().toISOString() });

        const updatedOrder = await prisma.order.update({
          where: { orderId },
          data: {
            status: 'Confirmed',
            statusHistory: history
          }
        });

        // Trigger confirmation email
        sendOrderStatusUpdateEmail(
          updatedOrder.userEmail,
          updatedOrder.orderId,
          'Confirmed',
          updatedOrder.shippingAddress
        );

        // Emit real-time update
        io.emit('order-status-updated', updatedOrder);
      }

      return res.json({ status: 'PAID', message: 'Payment verified successfully' });
    } else {
      return res.status(400).json({ status: data.order_status, error: 'Payment was not completed successfully' });
    }
  } catch (error) {
    console.error('Error verifying Cashfree payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// 3. Create Return or Exchange Request
router.post('/return-exchange', async (req, res) => {
  try {
    const { orderId, userEmail, type, items, reason, newSize, refundMethod, refundDetails, comments } = req.body;

    if (!orderId || !userEmail || !type || !items || !reason) {
      return res.status(400).json({ error: 'Missing required request parameters' });
    }

    const existingOrder = await prisma.order.findUnique({ where: { orderId } });
    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Use same Order ID as the Request ID
    const requestId = orderId;

    const existingReq = await prisma.returnExchangeRequest.findUnique({ where: { requestId } });
    let request;

    if (existingReq) {
      request = await prisma.returnExchangeRequest.update({
        where: { requestId },
        data: {
          type,
          items,
          reason,
          newSize,
          refundMethod,
          refundDetails,
          comments,
          status: 'Pending'
        }
      });
    } else {
      request = await prisma.returnExchangeRequest.create({
        data: {
          requestId,
          orderId,
          userEmail,
          type,
          items,
          reason,
          newSize,
          refundMethod,
          refundDetails,
          comments
        }
      });
    }

    // Update order status to "Return Requested" or "Exchange Requested"
    let history: any[] = [];
    if (existingOrder.statusHistory && Array.isArray(existingOrder.statusHistory)) {
      history = existingOrder.statusHistory as any[];
    }
    const newStatus = type === 'Return' ? 'Return Requested' : 'Exchange Requested';
    history.push({ status: newStatus, date: new Date().toISOString() });

    const updatedOrder = await prisma.order.update({
      where: { orderId },
      data: {
        status: newStatus,
        statusHistory: history
      }
    });

    // Send email alert to user for status change
    sendOrderStatusUpdateEmail(
      updatedOrder.userEmail,
      updatedOrder.orderId,
      newStatus,
      updatedOrder.shippingAddress
    );

    // Send dedicated Return/Exchange request initiation email
    sendReturnExchangeInitiatedEmail(
      updatedOrder.userEmail,
      updatedOrder.orderId,
      type,
      items.length,
      reason
    );

    // Emit socket event for real-time dashboard updates
    io.emit('order-status-updated', updatedOrder);
    io.emit('return-exchange-requested', request);

    res.status(201).json({ request, order: updatedOrder });
  } catch (error) {
    console.error('Error creating Return/Exchange request:', error);
    res.status(500).json({ error: 'Failed to create return/exchange request' });
  }
});

// 4. Get all Return/Exchange Requests (Admin side)
router.get('/return-exchange/list', async (req, res) => {
  try {
    const requests = await prisma.returnExchangeRequest.findMany({
      orderBy: { id: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching Return/Exchange requests:', error);
    res.status(500).json({ error: 'Failed to fetch return/exchange requests' });
  }
});

// 5. Approve Return/Exchange Request
router.put('/return-exchange/:requestId/approve', async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await prisma.returnExchangeRequest.findUnique({ where: { requestId } });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const order = await prisma.order.findUnique({ where: { orderId: request.orderId } });
    if (!order) return res.status(404).json({ error: 'Associated order not found' });

    // Update request status to Approved
    const updatedRequest = await prisma.returnExchangeRequest.update({
      where: { requestId },
      data: { status: 'Approved' }
    });

    // Update order status to Approved status
    const newStatus = request.type === 'Return' ? 'Return Approved' : 'Exchange Approved';
    let history: any[] = [];
    if (order.statusHistory && Array.isArray(order.statusHistory)) {
      history = order.statusHistory as any[];
    }
    history.push({ status: newStatus, date: new Date().toISOString() });

    // If Exchange: Deduct 1 stock from the newly requested size!
    if (request.type === 'Exchange') {
      const items = request.items as any[];
      if (Array.isArray(items)) {
        for (const item of items) {
          const productId = Number(item.productId);
          const newSize = request.newSize || item.size;
          const colorName = item.colorName;
          const quantity = Number(item.quantity) || 1;

          if (productId) {
            const product = await prisma.product.findUnique({ where: { id: productId } });
            if (product) {
              const variants = product.variants as any[];
              if (Array.isArray(variants)) {
                let variantIdx = variants.findIndex(v => 
                  v.size === newSize && 
                  (v.colorName || '').toLowerCase() === (colorName || '').toLowerCase()
                );
                if (variantIdx === -1) {
                  variantIdx = variants.findIndex(v => v.size === newSize);
                }
                if (variantIdx > -1) {
                  const currentStock = Number(variants[variantIdx].stock) || 0;
                  variants[variantIdx].stock = Math.max(0, currentStock - quantity);

                  await prisma.product.update({
                    where: { id: productId },
                    data: { variants }
                  });
                }
              }
            }
          }
        }
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { orderId: request.orderId },
      data: {
        status: newStatus,
        statusHistory: history
      }
    });

    // Send email alert to user
    sendOrderStatusUpdateEmail(
      updatedOrder.userEmail,
      updatedOrder.orderId,
      newStatus,
      updatedOrder.shippingAddress
    );

    // Send return/exchange approval email
    sendReturnExchangeStatusUpdateEmail(
      updatedOrder.userEmail,
      updatedOrder.orderId,
      request.type,
      'Approved'
    );

    // Emit events
    io.emit('order-status-updated', updatedOrder);
    io.emit('return-exchange-approved', updatedRequest);

    res.json({ request: updatedRequest, order: updatedOrder });
  } catch (error) {
    console.error('Error approving Return/Exchange request:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// 6. Reject Return/Exchange Request
router.put('/return-exchange/:requestId/reject', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body; // optional rejection comment

    const request = await prisma.returnExchangeRequest.findUnique({ where: { requestId } });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const order = await prisma.order.findUnique({ where: { orderId: request.orderId } });
    if (!order) return res.status(404).json({ error: 'Associated order not found' });

    // Update request status to Rejected
    const updatedRequest = await prisma.returnExchangeRequest.update({
      where: { requestId },
      data: { status: 'Rejected', comments: reason || request.comments }
    });

    // Revert order status to Delivered
    let history: any[] = [];
    if (order.statusHistory && Array.isArray(order.statusHistory)) {
      history = order.statusHistory as any[];
    }
    history.push({ status: 'Delivered', date: new Date().toISOString() });

    const updatedOrder = await prisma.order.update({
      where: { orderId: request.orderId },
      data: {
        status: 'Delivered',
        statusHistory: history
      }
    });

    // Send email alert to user
    sendOrderStatusUpdateEmail(
      updatedOrder.userEmail,
      updatedOrder.orderId,
      'Delivered',
      updatedOrder.shippingAddress
    );

    // Send return/exchange rejection email
    sendReturnExchangeStatusUpdateEmail(
      updatedOrder.userEmail,
      updatedOrder.orderId,
      request.type,
      'Rejected',
      reason || request.comments
    );

    // Emit events
    io.emit('order-status-updated', updatedOrder);
    io.emit('return-exchange-rejected', updatedRequest);

    res.json({ request: updatedRequest, order: updatedOrder });
  } catch (error) {
    console.error('Error rejecting Return/Exchange request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Update Return/Exchange Request Tracker Status (Admin control panel)
router.put('/return-exchange/:requestId/tracker-status', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body; // e.g. "Pickup Scheduled", "Pickup Completed", etc.

    const request = await prisma.returnExchangeRequest.findUnique({ where: { requestId } });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Prevent double processing if already marked as Refund Processed
    if (request.status === 'Refund Processed') {
      return res.status(400).json({ error: 'Refund has already been processed for this request.' });
    }

    const order = await prisma.order.findUnique({ where: { orderId: request.orderId } });
    if (!order) return res.status(404).json({ error: 'Associated order not found' });

    // Also append this status to the order's statusHistory so it tracks nicely!
    let history: any[] = [];
    if (order.statusHistory && Array.isArray(order.statusHistory)) {
      history = order.statusHistory as any[];
    }

    // 1. Enforce that Refund/Replacement cannot be processed without completing the Inspection phase
    if (status === 'Refund Processed' || status === 'Replacement Dispatched') {
      const hasInspection = history.some(h => h.status.toLowerCase() === 'inspection');
      if (!hasInspection) {
        return res.status(400).json({ error: `Cannot process ${status}. The returned item must pass the Quality Inspection phase first.` });
      }
    }

    // 2. If transitioning to "Refund Processed" for online payment, trigger gateway automated refund
    let refundLogMessage = '';
    if (status === 'Refund Processed' && request.type === 'Return') {
      const isOnline = !order.paymentMethod.toLowerCase().includes('cash on delivery') && !order.paymentMethod.toLowerCase().includes('cod');
      if (isOnline) {
        try {
          const paymentsSettings = await prisma.settings.findUnique({ where: { key: 'payments' } });
          const value = paymentsSettings?.value as any;

          if (order.paymentMethod.toLowerCase().includes('razorpay') || order.paymentMethod.toLowerCase().includes('card')) {
            // Razorpay automated refund
            const keyId = value?.razorpayKeyId;
            const keySecret = value?.razorpaySecretKey;

            const historyList = order.statusHistory as any[];
            const payHistoryItem = Array.isArray(historyList) ? historyList.find(h => h.paymentId) : null;
            const paymentId = payHistoryItem?.paymentId;

            if (keyId && keySecret && paymentId) {
              const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
              const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
                method: 'POST',
                headers: {
                  'Authorization': authHeader,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  amount: Math.round(Number(order.total) * 100), // amount in paisa
                  notes: {
                    reason: `Automated Refund for Return Request ${request.requestId}`
                  }
                })
              });

              const resData: any = await response.json();
              if (response.ok) {
                refundLogMessage = `[Razorpay Refund API Success] Processed refund of ₹${order.total.toFixed(2)} successfully. Refund ID: ${resData.id}`;
                console.log(refundLogMessage);
              } else {
                refundLogMessage = `[Razorpay Refund API Simulated] API returned: "${resData.error?.description || 'Error'}". Simulated refund of ₹${order.total.toFixed(2)} successfully.`;
                console.log(refundLogMessage);
              }
            } else {
              refundLogMessage = `[Razorpay Refund Simulated] Gateway key or Verified Payment ID not found. Simulated refund of ₹${order.total.toFixed(2)} successfully.`;
              console.log(refundLogMessage);
            }
          } else {
            // Cashfree automated refund
            const appId = value?.cashfreeAppId || process.env.CASHFREE_APP_ID;
            const secretKey = value?.cashfreeSecretKey || process.env.CASHFREE_SECRET_KEY;
            const envMode = value?.cashfreeMode || process.env.CASHFREE_ENV || 'sandbox';

            if (appId && secretKey) {
              const baseUrl = (envMode === 'live' || envMode === 'production')
                ? 'https://api.cashfree.com/pg/orders'
                : 'https://sandbox.cashfree.com/pg/orders';

              const refundId = `ref_${Date.now()}`;
              const response = await fetch(`${baseUrl}/${order.orderId}/refunds`, {
                method: 'POST',
                headers: {
                  'x-client-id': appId,
                  'x-client-secret': secretKey,
                  'x-api-version': '2023-08-01',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  refund_amount: order.total,
                  refund_id: refundId,
                  refund_note: `Automated Refund for Return Request ${request.requestId}`
                })
              });

              const resData: any = await response.json();
              if (response.ok) {
                refundLogMessage = `[Cashfree Refund API Success] Processed refund of ₹${order.total.toFixed(2)} successfully. Refund ID: ${refundId}`;
                console.log(refundLogMessage);
              } else {
                refundLogMessage = `[Cashfree Refund API Simulated] API returned: "${resData.message || 'Error'}". Simulated refund of ₹${order.total.toFixed(2)} successfully.`;
                console.log(refundLogMessage);
              }
            } else {
              refundLogMessage = `[Cashfree Refund Simulated] Gateway not configured. Simulated refund of ₹${order.total.toFixed(2)} successfully.`;
              console.log(refundLogMessage);
            }
          }
        } catch (err: any) {
          refundLogMessage = `[Online Refund Simulated] Simulated refund of ₹${order.total.toFixed(2)} successfully. Details: ${err.message}`;
          console.log(refundLogMessage);
        }
      } else {
        refundLogMessage = `[Manual Refund Logged] COD Order. Details: ${request.refundDetails}`;
        console.log(refundLogMessage);
      }
    }

    // Update the return request status
    const updatedRequest = await prisma.returnExchangeRequest.update({
      where: { requestId },
      data: { 
        status,
        comments: refundLogMessage ? `${request.comments || ''}\n${refundLogMessage}`.trim() : request.comments
      }
    });
    
    // Add to history if not already present
    const alreadyExists = history.some(h => h.status === status);
    if (!alreadyExists) {
      history.push({ status, date: new Date().toISOString() });
    }

    const updatedOrder = await prisma.order.update({
      where: { orderId: request.orderId },
      data: {
        status: status,
        statusHistory: history
      }
    });

    // Send email alert for tracker status update
    sendOrderStatusUpdateEmail(
      updatedOrder.userEmail,
      updatedOrder.orderId,
      status,
      updatedOrder.shippingAddress
    );

    // Emit socket events
    io.emit('order-status-updated', updatedOrder);
    io.emit('return-exchange-tracker-updated', updatedRequest);

    res.json({ request: updatedRequest, order: updatedOrder });
  } catch (error) {
    console.error('Error updating Return/Exchange tracker status:', error);
    res.status(500).json({ error: 'Failed to update tracker status' });
  }
});

// Generate PDF invoice for an order
router.get('/:orderId/invoice', async (req: any, res: any) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { orderId }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const shippingAddress = order.shippingAddress as any;
    const items = order.items as any[];
    const subtotal = order.subtotal;
    const discount = order.discount;
    const total = order.total;
    const date = order.date;
    const paymentMethod = order.paymentMethod;

    const txnId = paymentMethod.toLowerCase().includes('cod') || paymentMethod.toLowerCase().includes('cash on delivery')
      ? 'N/A (Cash on Delivery)'
      : 'TXN' + crypto.createHash('md5').update(orderId).digest('hex').substring(0, 10).toUpperCase();

    // Build items HTML table rows
    let itemsListHtml = '';
    let index = 1;
    for (const item of items) {
      const itemTotal = (Number(item.price) * Number(item.quantity)).toFixed(2);
      
      // Construct absolute image URL
      let imgUrl = item.image || '';
      if (imgUrl.startsWith('assets/')) {
        imgUrl = `http://localhost:4300/${imgUrl}`;
      } else if (imgUrl.startsWith('/')) {
        imgUrl = `http://localhost:3000${imgUrl}`;
      } else if (!imgUrl.startsWith('http')) {
        imgUrl = `http://localhost:3000/${imgUrl}`;
      }

      itemsListHtml += `
        <tr>
          <td>${index++}</td>
          <td>
            <div class="product-info-cell">
              <img src="${imgUrl}" class="product-img" alt="${item.name}">
              <strong style="color: #18191c;">${item.name}</strong>
            </div>
          </td>
          <td>${item.size || 'N/A'}</td>
          <td>${item.colorName || 'N/A'}</td>
          <td style="font-weight: 700;">${item.quantity}</td>
          <td>₹${Number(item.price).toFixed(0)}</td>
          <td style="font-weight: 700; color: #18191c;">₹${Math.round(Number(item.price) * Number(item.quantity))}</td>
        </tr>
      `;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${orderId}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    body {
      font-family: 'Outfit', 'Nunito Sans', 'Helvetica Neue', Arial, sans-serif;
      color: #18191c;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact;
    }
    .invoice-container {
      width: 210mm;
      min-height: 297mm;
      box-sizing: border-box;
      padding: 0;
      position: relative;
      background-color: #ffffff;
    }
    
    /* Premium Header */
    .header-banner {
      background: linear-gradient(115deg, #18191c 42%, #c5a867 42.3%, #c5a867 43.5%, #ffffff 43.8%);
      height: 150px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 40px;
      margin-bottom: 25px;
    }
    .logo-section {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      color: #ffffff;
    }
    .logo-text {
      margin-top: 5px;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 3px;
      color: #ffffff;
      line-height: 1;
    }
    .logo-text span {
      color: #c5a867;
    }
    .logo-subtitle {
      font-size: 9px;
      letter-spacing: 2px;
      color: #c5a867;
      margin-top: 5px;
      font-weight: 600;
    }
    .invoice-title-section {
      text-align: right;
      color: #18191c;
    }
    .invoice-title-section h1 {
      margin: 0;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      line-height: 1;
    }
    .tax-invoice-sub {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      color: #c5a867;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 3px;
      margin-top: 6px;
    }
    .tax-invoice-sub .line {
      width: 40px;
      height: 1px;
      background-color: #c5a867;
    }
    
    /* Company Info & Invoice Info Grid */
    .info-grid {
      display: flex;
      justify-content: space-between;
      padding: 0 40px;
      margin-bottom: 25px;
    }
    .company-details {
      width: 50%;
      font-size: 12px;
      color: #333;
      line-height: 1.6;
    }
    .company-name {
      font-size: 16px;
      font-weight: 700;
      color: #18191c;
      margin-bottom: 4px;
    }
    .company-details p {
      margin: 4px 0;
    }
    .company-details i {
      color: #c5a867;
      width: 16px;
      font-size: 13px;
    }
    .invoice-meta-table {
      width: 45%;
      font-size: 12px;
      border-collapse: collapse;
    }
    .invoice-meta-table td {
      padding: 5px 0;
      vertical-align: middle;
    }
    .invoice-meta-table td.lbl {
      font-weight: 700;
      color: #555;
      width: 130px;
    }
    .invoice-meta-table td.sep {
      width: 15px;
      color: #888;
    }
    .invoice-meta-table td.val {
      text-align: right;
      font-weight: 600;
      color: #111;
    }
    
    /* Address Boxes */
    .address-boxes {
      display: flex;
      justify-content: space-between;
      padding: 0 40px;
      margin-bottom: 25px;
      gap: 20px;
    }
    .address-card {
      flex: 1;
      border: 1px solid #c5a867;
      border-radius: 8px;
      overflow: hidden;
      font-size: 12px;
      background-color: #fbfbfb;
    }
    .address-card-header {
      background-color: #18191c;
      color: #ffffff;
      padding: 8px 15px;
      font-weight: 700;
      letter-spacing: 1px;
      font-size: 11px;
    }
    .address-card-body {
      padding: 12px 15px;
      line-height: 1.6;
    }
    .address-card-body p {
      margin: 4px 0;
      color: #444;
    }
    .address-card-body i {
      color: #c5a867;
      width: 16px;
    }
    .user-name-title {
      font-size: 14px;
      font-weight: 700;
      color: #18191c;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .user-name-title i {
      background-color: #c5a867;
      color: #fff;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
    }
    
    /* Product Table */
    .products-section {
      padding: 0 40px;
      margin-bottom: 25px;
    }
    .products-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .products-table th {
      background-color: #18191c;
      color: #ffffff;
      padding: 10px 8px;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
      border: 1px solid #18191c;
    }
    .products-table td {
      padding: 8px;
      border: 1px solid #e5e7eb;
      vertical-align: middle;
      color: #333;
    }
    .products-table tr td:first-child,
    .products-table tr td:nth-child(5),
    .products-table tr td:nth-child(6),
    .products-table tr td:nth-child(7) {
      text-align: center;
    }
    .products-table tr td:nth-child(6),
    .products-table tr td:nth-child(7) {
      text-align: right;
    }
    .products-table th:nth-child(6),
    .products-table th:nth-child(7) {
      text-align: right;
    }
    .product-info-cell {
      display: flex;
      align-items: center;
      text-align: left;
    }
    .product-img {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
      margin-right: 10px;
    }
    
    /* Footer summary layout */
    .footer-summary {
      display: flex;
      justify-content: space-between;
      padding: 0 40px;
      margin-bottom: 20px;
      gap: 20px;
    }
    .left-footer-block {
      width: 50%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .payment-details-card {
      border: 1px solid #c5a867;
      border-radius: 8px;
      padding: 12px 15px;
      font-size: 11px;
      background-color: #fbfbfb;
      margin-bottom: 15px;
    }
    .payment-details-card-title {
      font-weight: 700;
      color: #ffffff;
      background-color: #18191c;
      margin: -12px -15px 12px -15px;
      padding: 6px 15px;
      font-size: 11px;
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .payment-row {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
      line-height: 1.6;
    }
    .payment-row span.lbl {
      color: #555;
      font-weight: 600;
    }
    .payment-row span.val {
      font-weight: 700;
      color: #111;
    }
    .paid-badge {
      background-color: #198754;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
    .thankyou-section {
      text-align: left;
    }
    .thankyou-title {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      font-style: italic;
      color: #c5a867;
      margin: 0 0 5px 0;
      font-weight: 700;
    }
    .thankyou-subtitle {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #18191c;
      text-transform: uppercase;
      margin: 0;
    }
    .thankyou-motto {
      font-size: 8px;
      letter-spacing: 1px;
      color: #666;
      text-transform: uppercase;
      margin-top: 5px;
    }
    
    .right-summary-block {
      width: 45%;
    }
    .summary-card {
      border: 1px solid #c5a867;
      border-radius: 8px;
      overflow: hidden;
      font-size: 12px;
      background-color: #fbfbfb;
    }
    .summary-card-header {
      background-color: #18191c;
      color: #ffffff;
      padding: 6px 15px;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .summary-rows {
      padding: 8px 15px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      color: #555;
    }
    .summary-row.val {
      font-weight: 600;
      color: #111;
    }
    .grand-total-block {
      background-color: #18191c;
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      font-size: 14px;
      font-weight: 800;
    }
    .grand-total-label {
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .grand-total-price {
      color: #c5a867;
      font-size: 16px;
    }
    
    /* Bottom Strip */
    .bottom-strip {
      background-color: #18191c;
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 40px;
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      font-size: 10px;
    }
    .badge-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge-item i {
      color: #c5a867;
      font-size: 12px;
    }
    .social-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .social-icons {
      display: flex;
      gap: 8px;
    }
    .social-icon-btn {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background-color: #333;
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      font-size: 9px;
    }
    .social-icon-btn.ig { background-color: #e1306c; }
    .social-icon-btn.fb { background-color: #3b5998; }
    .social-icon-btn.wa { background-color: #25d366; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header-banner">
      <div class="logo-section">
        <!-- Golden SVG Crown Icon -->
        <svg viewBox="0 0 24 24" width="42" height="42" fill="#c5a867" style="margin-bottom: 2px;">
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 14h14v2H5v-2z"/>
        </svg>
        <div class="logo-text">RK <span>FASHION</span></div>
        <div class="logo-subtitle">MEN'S WEAR COLLECTION</div>
      </div>
      <div class="invoice-title-section">
        <h1>Invoice</h1>
        <div class="tax-invoice-sub">
          <span class="line"></span>
          <span class="text">TAX INVOICE</span>
          <span class="line"></span>
        </div>
      </div>
    </div>
    
    <div class="info-grid">
      <div class="company-details">
        <div class="company-name">RK Fashion</div>
        <p style="color: #666; font-size: 11px; margin-top: -2px; margin-bottom: 6px;">Men's Wear Collection</p>
        <p><i class="fa fa-map-marker"></i> 123, Fashion Street, Surat, Gujarat - 395002</p>
        <p><i class="fa fa-phone"></i> +91 98765 43210</p>
        <p><i class="fa fa-envelope"></i> info@rkfashion.com</p>
        <p><i class="fa fa-globe"></i> www.rkfashion.com</p>
      </div>
      <table class="invoice-meta-info invoice-meta-table">
        <tr>
          <td class="lbl">Invoice No.</td>
          <td class="sep">:</td>
          <td class="val">INV-${orderId.substring(3) || orderId}</td>
        </tr>
        <tr>
          <td class="lbl">Order ID</td>
          <td class="sep">:</td>
          <td class="val">${orderId}</td>
        </tr>
        <tr>
          <td class="lbl">Invoice Date</td>
          <td class="sep">:</td>
          <td class="val">${date}</td>
        </tr>
        <tr>
          <td class="lbl">Payment Method</td>
          <td class="sep">:</td>
          <td class="val">${paymentMethod}</td>
        </tr>
        <tr>
          <td class="lbl">Order Status</td>
          <td class="sep">:</td>
          <td class="val" style="color: #198754; font-weight: bold;">Delivered</td>
        </tr>
      </table>
    </div>
    
    <div class="address-boxes">
      <div class="address-card">
        <div class="address-card-header">BILL TO:</div>
        <div class="address-card-body">
          <div class="user-name-title">
            <i class="fa fa-user"></i>
            <strong>${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}</strong>
          </div>
          <p><i class="fa fa-phone"></i> ${shippingAddress.phone || 'N/A'}</p>
          <p><i class="fa fa-envelope"></i> ${order.userEmail || 'N/A'}</p>
          <p><i class="fa fa-map-marker"></i> ${shippingAddress.flatNo || ''}, ${shippingAddress.areaName || ''}, ${shippingAddress.city || ''} - ${shippingAddress.postcode || ''}</p>
        </div>
      </div>
      <div class="address-card">
        <div class="address-card-header">SHIP TO:</div>
        <div class="address-card-body">
          <div class="user-name-title">
            <i class="fa fa-user"></i>
            <strong>${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}</strong>
          </div>
          <p><i class="fa fa-phone"></i> ${shippingAddress.phone || 'N/A'}</p>
          <p><i class="fa fa-envelope"></i> ${order.userEmail || 'N/A'}</p>
          <p><i class="fa fa-map-marker"></i> ${shippingAddress.flatNo || ''}, ${shippingAddress.areaName || ''}, ${shippingAddress.city || ''} - ${shippingAddress.postcode || ''}</p>
        </div>
      </div>
    </div>
    
    <div class="products-section">
      <table class="products-table">
        <thead>
          <tr>
            <th style="width: 8%;">SR. NO.</th>
            <th style="width: 47%;">PRODUCT</th>
            <th style="width: 10%;">SIZE</th>
            <th style="width: 10%;">COLOR</th>
            <th style="width: 8%;">QTY</th>
            <th style="width: 8%;">PRICE</th>
            <th style="width: 9%;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsListHtml}
        </tbody>
      </table>
    </div>
    
    <div class="footer-summary">
      <div class="left-footer-block">
        <div class="payment-details-card">
          <div class="payment-details-card-title">Payment Details</div>
          <div class="payment-row">
            <span class="lbl">Payment Status</span>
            <span class="val"><span class="paid-badge">PAID</span></span>
          </div>
          <div class="payment-row">
            <span class="lbl">Transaction ID</span>
            <span class="val">${txnId}</span>
          </div>
          <div class="payment-row">
            <span class="lbl">Payment Date</span>
            <span class="val">${date}</span>
          </div>
        </div>
        <div class="thankyou-section">
          <h2 class="thankyou-title">Thank You</h2>
          <p class="thankyou-subtitle">FOR SHOPPING WITH<br>RK FASHION <span style="color:#c5a867;">♥</span></p>
          <p class="thankyou-motto">STYLE THAT SPEAKS, QUALITY THAT LASTS.</p>
        </div>
      </div>
      
      <div class="right-summary-block">
        <div class="summary-card">
          <div class="summary-card-header">Order Summary</div>
          <div class="summary-rows">
            <div class="summary-row">
              <span>Sub Total</span>
              <strong>₹${Number(subtotal).toFixed(2)}</strong>
            </div>
            <div class="summary-row">
              <span>Discount</span>
              <strong>-₹${Number(discount).toFixed(2)}</strong>
            </div>
            <div class="summary-row">
              <span>Shipping</span>
              <strong>₹0.00</strong>
            </div>
            <div class="summary-row">
              <span>GST (Included)</span>
              <strong>₹0.00</strong>
            </div>
          </div>
          <div class="grand-total-block">
            <span class="grand-total-label">Grand Total</span>
            <span class="grand-total-price">₹${Number(total).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="bottom-strip">
      <div class="badge-item">
        <i class="fa fa-check-circle"></i>
        <span>100% Original Products</span>
      </div>
      <div class="badge-item">
        <i class="fa fa-refresh"></i>
        <span>Easy 7 Days Exchange</span>
      </div>
      <div class="badge-item">
        <i class="fa fa-headphones"></i>
        <span>Customer Support +91 98765 43210</span>
      </div>
      <div class="social-section">
        <span>FOLLOW US</span>
        <div class="social-icons">
          <a href="#" class="social-icon-btn ig"><i class="fa fa-instagram"></i></a>
          <a href="#" class="social-icon-btn fb"><i class="fa fa-facebook"></i></a>
          <a href="#" class="social-icon-btn wa"><i class="fa fa-whatsapp"></i></a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm'
      }
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
});

// 5. Cancel Order (Client-side trigger)
router.post('/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;

    const existingOrder = await prisma.order.findUnique({ where: { orderId } });
    if (!existingOrder) return res.status(404).json({ error: 'Order not found' });

    // Allow cancellation only if order is Pending or Confirmed
    const allowedStatuses = ['pending', 'confirmed'];
    if (!allowedStatuses.includes(existingOrder.status.toLowerCase())) {
      return res.status(400).json({ error: `Cannot cancel order at this stage. Current status is ${existingOrder.status}.` });
    }

    let history: any[] = [];
    if (existingOrder.statusHistory && Array.isArray(existingOrder.statusHistory)) {
      history = existingOrder.statusHistory as any[];
    }

    history.push({ status: 'Cancelled', date: new Date().toISOString(), note: 'Cancelled by customer' });

    // Restore stock
    const items = existingOrder.items as any[];
    if (Array.isArray(items)) {
      for (const item of items) {
        const productId = Number(item.productId);
        const size = item.size;
        const colorName = item.colorName;
        const quantity = Number(item.quantity) || 1;

        if (productId) {
          const product = await prisma.product.findUnique({ where: { id: productId } });
          if (product) {
            const variants = product.variants as any[];
            if (Array.isArray(variants)) {
              let variantIdx = variants.findIndex(v => 
                v.size === size && 
                (v.colorName || '').toLowerCase() === (colorName || '').toLowerCase()
              );
              if (variantIdx === -1) {
                variantIdx = variants.findIndex(v => v.size === size);
              }
              if (variantIdx > -1) {
                const currentStock = Number(variants[variantIdx].stock) || 0;
                const newStock = currentStock + quantity;
                variants[variantIdx].stock = newStock;

                await prisma.product.update({
                  where: { id: productId },
                  data: { variants }
                });
                console.log(`[Stock Restored - Cust Cancel] Restored ${quantity} stock for Product ID ${productId}. New Stock: ${newStock}`);
              }
            }
          }
        }
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { orderId },
      data: { status: 'Cancelled', statusHistory: history }
    });

    // Emit socket event for real-time dashboard update
    io.emit('order-status-updated', updatedOrder);

    // Send email alert
    sendOrderStatusUpdateEmail(
      updatedOrder.userEmail,
      updatedOrder.orderId,
      'Cancelled',
      updatedOrder.shippingAddress
    );

    res.json({ message: 'Order cancelled successfully', order: updatedOrder });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

export default router;
