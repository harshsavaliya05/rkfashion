import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass || user.includes('your-email') || pass.includes('your-gmail')) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });
}

function getMailSenderDetails() {
  const user = process.env.SMTP_USER || '';
  const fromName = process.env.SMTP_FROM_NAME || 'RK Fashion';
  const fromEmail = process.env.SMTP_FROM || user;
  return `"${fromName}" <${fromEmail}>`;
}

// 1. Complaint / Contact Confirmation Email
export async function sendConfirmationEmail(toEmail: string, name: string, tokenId: string) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`[Mailer Warning]: SMTP not configured. Skipping confirmation email to ${toEmail}.`);
    console.log(`[Email Mock Details - Complaint]: To: ${toEmail}, Ticket ID: ${tokenId}`);
    return;
  }

  const mailOptions = {
    from: getMailSenderDetails(),
    to: toEmail,
    subject: `Complaint Registered - Ticket ID: ${tokenId}`,
    text: `Hi ${name},\n\nThank you for contacting RK Fashion. Your query/complaint has been successfully registered.\n\nYour Complaint Ticket ID is: ${tokenId}\n\nOur team is looking into this and will reply to you as soon as possible.\n\nBest Regards,\nRK Fashion Support Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Thank You for Reaching Out!</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thank you for contacting RK Fashion. Your complaint/query has been successfully registered.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; border-radius: 4px;">
          <strong>Your Complaint Ticket ID:</strong> <span style="font-family: monospace; font-size: 16px; color: #d9534f; font-weight: bold;">${tokenId}</span>
        </div>
        <p>Our support team is reviewing your query and we will get back to you as soon as possible.</p>
        <p>Please keep this Ticket ID for any future reference. You can also reply directly to this email if you have any additional details to add.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">This is an automated email confirmation from RK Fashion Support.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer Success]: Email successfully sent to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Mailer Error]: Failed to send email to ${toEmail}:`, error);
    throw error;
  }
}

// 2. User Registration Verification Link
export async function sendRegisterVerificationLink(toEmail: string, name: string, verificationLink: string) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`[Mailer Warning]: SMTP not configured. Skipping register verification email to ${toEmail}.`);
    console.log(`[Email Mock Details - Register Link]: To: ${toEmail}, Name: ${name}, Link: ${verificationLink}`);
    return;
  }

  const mailOptions = {
    from: getMailSenderDetails(),
    to: toEmail,
    subject: `Verify Your Account - RK Fashion`,
    text: `Hi ${name},\n\nThank you for choosing RK Fashion. Please verify your email by clicking the link below:\n${verificationLink}\n\nThis link is valid for 10 minutes. If you did not request this, you can ignore this email.\n\nBest Regards,\nRK Fashion Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Verify Your Email Address</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thank you for choosing RK Fashion. To complete your registration, please verify your email using the link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #28a745; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email</a>
        </div>
        <p>Or you can copy and paste the link below into your browser:</p>
        <p style="word-break: break-all; font-size: 13px; color: #007bff;"><a href="${verificationLink}">${verificationLink}</a></p>
        <p>This verification link is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">This is an automated security verification email from RK Fashion.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer Success]: Registration verification link sent to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Mailer Error]: Failed to send Registration verification email to ${toEmail}:`, error);
    throw error;
  }
}

// 3. User Login MFA OTP
export async function sendLoginOtp(toEmail: string, name: string, otp: string) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`[Mailer Warning]: SMTP not configured. Skipping login OTP email to ${toEmail}.`);
    console.log(`[Email Mock Details - Login OTP]: To: ${toEmail}, Name: ${name}, OTP: ${otp}`);
    return;
  }

  const mailOptions = {
    from: getMailSenderDetails(),
    to: toEmail,
    subject: `Login Verification Code - RK Fashion`,
    text: `Hi ${name},\n\nA login request was made for your account at RK Fashion.\n\nYour login verification code (OTP) is: ${otp}\n\nThis code is valid for 5 minutes. Please do not share this code with anyone.\n\nBest Regards,\nRK Fashion Security Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Login Verification Code</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>A login request was made for your account at RK Fashion. Please enter the verification code below to complete your login:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #fd7e14; margin: 20px 0; border-radius: 4px; text-align: center;">
          <span style="font-family: monospace; font-size: 24px; color: #fd7e14; font-weight: bold; letter-spacing: 5px;">${otp}</span>
        </div>
        <p>This code is valid for 5 minutes. If you did not attempt to log in, please secure your account immediately.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">This is an automated security verification email from RK Fashion.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer Success]: Login OTP sent to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Mailer Error]: Failed to send Login OTP to ${toEmail}:`, error);
    throw error;
  }
}

// 4. Password Reset Link Email
export async function sendPasswordResetLink(toEmail: string, name: string, resetLink: string) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`[Mailer Warning]: SMTP not configured. Skipping password reset email to ${toEmail}.`);
    console.log(`[Email Mock Details - Password Reset]: To: ${toEmail}, Name: ${name}, Link: ${resetLink}`);
    return;
  }

  const mailOptions = {
    from: getMailSenderDetails(),
    to: toEmail,
    subject: `Reset Your Password - RK Fashion`,
    text: `Hi ${name},\n\nYou requested a password reset for your account at RK Fashion.\n\nPlease reset your password using the link below:\n${resetLink}\n\nThis link is valid for 15 minutes. If you did not request this, you can ignore this email.\n\nBest Regards,\nRK Fashion Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;">Reset Your Password</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>We received a request to reset the password for your account at RK Fashion. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #111111; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>Or you can copy and paste the link below into your browser:</p>
        <p style="word-break: break-all; font-size: 13px; color: #007bff;"><a href="${resetLink}">${resetLink}</a></p>
        <p>This link is valid for 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">This is an automated email from RK Fashion.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer Success]: Password reset link sent to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Mailer Error]: Failed to send Password Reset email to ${toEmail}:`, error);
    throw error;
  }
}

// 5. Promotional Campaign Email Blast
export async function sendCampaignEmail(toEmail: string, name: string, subject: string, htmlContent: string, attachments?: any[]) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`[Mailer Warning]: SMTP not configured. Skipping campaign email to ${toEmail}.`);
    console.log(`[Email Mock Details - Campaign]: To: ${toEmail}, Subject: ${subject}`);
    return;
  }

  const mailOptions: any = {
    from: getMailSenderDetails(),
    to: toEmail,
    subject: subject,
    html: htmlContent
  };

  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer Success]: Campaign email sent to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Mailer Error]: Failed to send campaign email to ${toEmail}:`, error);
    throw error;
  }
}

// 6. Order Placement Confirmation Email
export async function sendOrderPlacedEmail(
  toEmail: string, 
  orderId: string, 
  items: any[], 
  total: number, 
  paymentMethod: string, 
  shippingAddress: any
) {
  const transporter = getTransporter();
  const customerName = shippingAddress ? `${shippingAddress.firstName} ${shippingAddress.lastName}` : 'Customer';

  let itemsHtml = '';
  if (Array.isArray(items)) {
    itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name} (${item.size} / ${item.colorName || 'Default'})</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price * item.quantity}</td>
      </tr>
    `).join('');
  }

  if (!transporter) {
    console.warn(`[Mailer Warning]: SMTP not configured. Skipping order confirmation email to ${toEmail}.`);
    console.log(`[Email Mock Details - Order Placed]: To: ${toEmail}, Order ID: ${orderId}, Total: ₹${total}, Items Count: ${items?.length}`);
    return;
  }

  const mailOptions = {
    from: getMailSenderDetails(),
    to: toEmail,
    subject: `Order Placed Successfully! - Order #${orderId}`,
    text: `Hi ${customerName},\n\nThank you for shopping at RK Fashion! Your order #${orderId} has been successfully placed.\n\nTotal Amount: ₹${total}\nPayment Method: ${paymentMethod}\n\nWe will notify you once your order is packed and shipped.\n\nBest Regards,\nRK Fashion Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #3d4f35; margin: 0;">Order Confirmed! 🛒</h2>
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 5px;">Thank you for shopping at RK Fashion</p>
        </div>
        <p>Hi <strong>${customerName}</strong>,</p>
        <p>Your order has been received and is currently being processed. Here are your order details:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
          <table style="width: 100%; font-size: 13.5px; line-height: 1.6;">
            <tr>
              <td><strong>Order ID:</strong></td>
              <td style="text-align: right; font-family: monospace; font-weight: bold; color: #3d4f35;">#${orderId}</td>
            </tr>
            <tr>
              <td><strong>Date:</strong></td>
              <td style="text-align: right;">${new Date().toLocaleDateString()}</td>
            </tr>
            <tr>
              <td><strong>Payment Method:</strong></td>
              <td style="text-align: right; text-transform: uppercase;">${paymentMethod}</td>
            </tr>
          </table>
        </div>

        <h3 style="color: #3d4f35; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 25px;">Items Ordered</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8f9fa; text-align: left;">
              <th style="padding: 10px; border-bottom: 1px solid #ddd;">Product</th>
              <th style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">Qty</th>
              <th style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr style="font-weight: bold; font-size: 14px;">
              <td colspan="2" style="padding: 10px; text-align: right; border-top: 2px solid #ddd;">Total Paid:</td>
              <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd; color: #3d4f35;">₹${total}</td>
            </tr>
          </tbody>
        </table>

        <p style="margin-top: 25px;">We will email you update notifications as your order moves to <strong>Packed</strong>, <strong>Shipped</strong>, and <strong>Delivered</strong>.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">Need help? Reply to this email or contact support.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer Success]: Order placed confirmation sent to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Mailer Error]: Failed to send order confirmation email to ${toEmail}:`, error);
  }
}

// 7. Order Status Change Notification Email
export async function sendOrderStatusUpdateEmail(
  toEmail: string, 
  orderId: string, 
  status: string, 
  shippingAddress: any
) {
  const transporter = getTransporter();
  const customerName = shippingAddress ? `${shippingAddress.firstName} ${shippingAddress.lastName}` : 'Customer';

  if (!transporter) {
    console.warn(`[Mailer Warning]: SMTP not configured. Skipping order status update email to ${toEmail}.`);
    console.log(`[Email Mock Details - Status Update]: To: ${toEmail}, Order ID: ${orderId}, New Status: ${status}`);
    return;
  }

  // Define descriptive status messaging
  let statusTitle = 'Order Status Updated';
  let statusMessage = `Your order status has been updated to ${status}.`;
  let statusColor = '#3498db'; // blue default

  if (status === 'Pending') {
    statusTitle = 'Order Pending Confirmation ⏳';
    statusMessage = 'Your order has been received and is currently pending confirmation. We are verifying stock and payment details and will update you shortly.';
    statusColor = '#f1c40f'; // yellow
  } else if (status === 'Confirmed') {
    statusTitle = 'Order Confirmed! ✅';
    statusMessage = 'Great news! Your order has been officially confirmed by our team. We are preparing to inspect and pack your items.';
    statusColor = '#1a365d'; // dark navy blue
  } else if (status === 'Packed') {
    statusTitle = 'Order Packed & Ready! 📦';
    statusMessage = 'Great news! Your order has been carefully inspected, packed, and is ready for courier hand-off. We will send you another update once it is shipped.';
    statusColor = '#27ae60'; // green
  } else if (status === 'Shipped') {
    statusTitle = 'Order Shipped! 🚚';
    statusMessage = 'Your package is on its way! It has been handed over to our courier partner and will reach your delivery address shortly.';
    statusColor = '#e67e22'; // orange
  } else if (status === 'Cancelled') {
    statusTitle = 'Order Cancelled ❌';
    statusMessage = 'Your order has been cancelled. If any online payment was processed, your refund will be credited to your account shortly.';
    statusColor = '#e74c3c'; // red
  } else if (status === 'Returned') {
    statusTitle = 'Order Return Received ↩️';
    statusMessage = 'We have successfully received the returned item(s) for your order. Our team is processing the refund or exchange request.';
    statusColor = '#9b59b6'; // purple
  } else if (status === 'Delivered') {
    statusTitle = 'Order Delivered! 🎉';
    statusMessage = 'Your order has been successfully delivered. Thank you for shopping with RK Fashion! We hope you love your new wardrobe items.';
    statusColor = '#2ecc71'; // light green
  }

  const mailOptions = {
    from: getMailSenderDetails(),
    to: toEmail,
    subject: `Order #${orderId} - Update: ${status}`,
    text: `Hi ${customerName},\n\nUpdate on Order #${orderId}: ${statusMessage}\n\nBest Regards,\nRK Fashion Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid ${statusColor}; padding-bottom: 15px;">
          <h2 style="color: ${statusColor}; margin: 0;">${statusTitle}</h2>
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 5px;">Order Updates - RK Fashion</p>
        </div>
        <p>Hi <strong>${customerName}</strong>,</p>
        <p>There is an update regarding your order with RK Fashion:</p>
        
        <div style="background-color: #fdfefe; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid ${statusColor};">
          <table style="width: 100%; font-size: 13.5px; margin-bottom: 12px;">
            <tr>
              <td><strong>Order ID:</strong></td>
              <td style="text-align: right; font-family: monospace; font-weight: bold;">#${orderId}</td>
            </tr>
            <tr>
              <td><strong>Current Status:</strong></td>
              <td style="text-align: right; color: ${statusColor}; font-weight: bold; text-transform: uppercase;">${status}</td>
            </tr>
          </table>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #2c3e50;">
            ${statusMessage}
          </p>
        </div>

        <p>You can track and manage your orders anytime by logging into your account on our website.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">This is an automated shipping status update from RK Fashion.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer Success]: Status update email sent to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Mailer Error]: Failed to send status update email to ${toEmail}:`, error);
  }
}

// 8. Return/Exchange Request Initiated Email
export async function sendReturnExchangeInitiatedEmail(
  toEmail: string, 
  orderId: string, 
  type: string, 
  itemsCount: number, 
  reason: string
) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`[Mailer Warning]: SMTP not configured. Skipping Return/Exchange initiated email to ${toEmail}.`);
    console.log(`[Email Mock - Initiated]: To: ${toEmail}, Order ID: ${orderId}, Type: ${type}, Items: ${itemsCount}`);
    return;
  }

  const mailOptions = {
    from: getMailSenderDetails(),
    to: toEmail,
    subject: `${type} Request Initiated - Order #${orderId}`,
    text: `Hi,\n\nWe have received your request to ${type.toLowerCase()} ${itemsCount} item(s) from Order #${orderId}.\n\nReason: ${reason}\n\nOur team is reviewing your request and will update you shortly.\n\nBest Regards,\nRK Fashion Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3498db; padding-bottom: 15px;">
          <h2 style="color: #3498db; margin: 0;">${type} Request Initiated ⏳</h2>
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 5px;">We are reviewing your request</p>
        </div>
        <p>Hi Customer,</p>
        <p>We have successfully received your request to <strong>${type.toLowerCase()}</strong> item(s) from your order:</p>
        
        <div style="background-color: #f8f9fa; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <table style="width: 100%; font-size: 13.5px; line-height: 1.6;">
            <tr>
              <td><strong>Order ID:</strong></td>
              <td style="text-align: right; font-family: monospace;">#${orderId}</td>
            </tr>
            <tr>
              <td><strong>Request Type:</strong></td>
              <td style="text-align: right; color: #3498db; font-weight: bold; text-transform: uppercase;">${type}</td>
            </tr>
            <tr>
              <td><strong>Items Quantity:</strong></td>
              <td style="text-align: right;">${itemsCount} item(s)</td>
            </tr>
            <tr>
              <td><strong>Reason:</strong></td>
              <td style="text-align: right;">${reason}</td>
            </tr>
          </table>
        </div>
        <p>Our quality check and inspection team is reviewing your return/exchange details. We will notify you via email as soon as your request is <strong>Approved</strong> or <strong>Rejected</strong>.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">This is an automated request notification from RK Fashion.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer Success]: Return/Exchange initiated email sent to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Mailer Error]: Failed to send Return/Exchange initiated email to ${toEmail}:`, error);
  }
}

// 9. Return/Exchange Request Status Decision Email
export async function sendReturnExchangeStatusUpdateEmail(
  toEmail: string, 
  orderId: string, 
  type: string, 
  status: string, 
  comments?: string
) {
  const transporter = getTransporter();
  const isApproved = status.toLowerCase() === 'approved';
  const statusColor = isApproved ? '#27ae60' : '#e74c3c';
  const statusEmoji = isApproved ? '✅' : '❌';

  if (!transporter) {
    console.warn(`[Mailer Warning]: SMTP not configured. Skipping Return/Exchange status email to ${toEmail}.`);
    console.log(`[Email Mock - Decision]: To: ${toEmail}, Order: ${orderId}, Status: ${status}, Comments: ${comments}`);
    return;
  }

  const mailOptions = {
    from: getMailSenderDetails(),
    to: toEmail,
    subject: `${type} Request ${status}! - Order #${orderId}`,
    text: `Hi,\n\nYour ${type.toLowerCase()} request for Order #${orderId} has been ${status.toUpperCase()}.\n\n${comments ? `Comments: ${comments}` : ''}\n\nBest Regards,\nRK Fashion Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid ${statusColor}; padding-bottom: 15px;">
          <h2 style="color: ${statusColor}; margin: 0;">${type} Request ${status} ${statusEmoji}</h2>
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 5px;">Update on Request - RK Fashion</p>
        </div>
        <p>Hi Customer,</p>
        <p>We are writing to inform you that your request to <strong>${type.toLowerCase()}</strong> item(s) from Order #${orderId} has been reviewed and <strong>${status.toUpperCase()}</strong> by our inspection team.</p>
        
        <div style="background-color: #fdfefe; border: 1px solid #e2e8f0; border-left: 5px solid ${statusColor}; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <table style="width: 100%; font-size: 13.5px; line-height: 1.6; margin-bottom: 10px;">
            <tr>
              <td><strong>Order ID:</strong></td>
              <td style="text-align: right; font-family: monospace;">#${orderId}</td>
            </tr>
            <tr>
              <td><strong>Request Type:</strong></td>
              <td style="text-align: right; text-transform: uppercase;">${type}</td>
            </tr>
            <tr>
              <td><strong>Decision Status:</strong></td>
              <td style="text-align: right; color: ${statusColor}; font-weight: bold; text-transform: uppercase;">${status}</td>
            </tr>
          </table>
          
          ${comments ? `
            <div style="border-top: 1px dashed #ddd; padding-top: 10px; margin-top: 10px; font-size: 13px; color: #555;">
              <strong>Feedback / Reason:</strong> <span style="font-style: italic;">"${comments}"</span>
            </div>
          ` : ''}
        </div>

        ${isApproved ? `
          <p>Our logistics associate will coordinate the pick-up/dispatch actions shortly. Please keep the item(s) unused, untagged, and in original packaging.</p>
        ` : `
          <p>Unfortunately, your request could not be approved because it did not satisfy our returns and policy validation. If you have questions, please reply directly to this mail.</p>
        `}
        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">Need help? Reply to this email or contact support.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer Success]: Return/Exchange status email sent to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Mailer Error]: Failed to send Return/Exchange decision email to ${toEmail}:`, error);
  }
}
