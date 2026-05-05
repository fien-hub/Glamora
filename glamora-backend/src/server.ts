import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import rate limiters
import {
  generalLimiter,
  authLimiter,
  bookingLimiter,
} from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import serviceRoutes from './routes/services';
import providerRoutes from './routes/providers';
import bookingRoutes from './routes/bookings';
import paymentRoutes from './routes/payments';
import paymentMethodRoutes from './routes/paymentMethods';
import reviewRoutes from './routes/reviews';
import verificationRoutes from './routes/verification';
import pricingRoutes from './routes/pricing';
import adminRoutes from './routes/admin';

const app: Application = express();
const PORT = process.env.PORT || 3000;
const LEGAL_LAST_UPDATED = 'April 30, 2026';

const renderLegalPage = (title: string, content: string) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Glamora</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fff7fb;
      color: #222;
      line-height: 1.6;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px 60px;
      background: #ffffff;
      min-height: 100vh;
      box-sizing: border-box;
    }
    h1, h2 { color: #1f1720; }
    h1 { margin-bottom: 8px; }
    h2 { margin-top: 30px; }
    p, li { color: #2d2d2d; }
    .meta { color: #6b6b6b; font-size: 14px; margin-bottom: 24px; }
    a { color: #c0267f; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <main class="container">
    ${content}
  </main>
</body>
</html>`;

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(morgan('dev')); // Logging

// CORS configuration
const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) ||
  ['http://localhost:8081'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parsing
// Stripe webhook needs raw body for signature verification — mount BEFORE json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiting for all API routes
app.use('/api/', generalLimiter);

// Health check (no rate limiting)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/privacy-policy', (_req: Request, res: Response) => {
  const html = renderLegalPage(
    'Privacy Policy',
    `
      <h1>Glamora Privacy Policy</h1>
      <p class="meta">Last updated: ${LEGAL_LAST_UPDATED}</p>
      <p>Glamora ("we", "our", "us") provides a mobile platform for connecting customers with beauty and wellness professionals. This Privacy Policy explains what personal data we collect, how we use it, and your choices.</p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li>Account information (name, email, phone, role)</li>
        <li>Profile and booking information (service preferences, addresses, notes)</li>
        <li>Payment and transaction metadata (payment status and references; full card details are handled by payment processors)</li>
        <li>Device and usage data (app events, device model, app version, crash logs)</li>
        <li>Location data when you grant permission</li>
      </ul>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>Provide booking, messaging, account, and support functionality</li>
        <li>Process and verify payments</li>
        <li>Send transactional notifications and reminders</li>
        <li>Detect fraud, secure accounts, and enforce platform rules</li>
        <li>Analyze app performance and improve user experience</li>
        <li>Measure advertising performance and attribution (including Meta app events where enabled)</li>
      </ul>

      <h2>3. Legal Bases (Where Applicable)</h2>
      <p>Depending on your location, we process data based on contract necessity, legitimate interests, legal obligations, and consent.</p>

      <h2>4. Sharing of Information</h2>
      <ul>
        <li>Service providers (hosting, analytics, communications, payment processors)</li>
        <li>Beauty providers and customers as needed to fulfill bookings</li>
        <li>Regulators or law enforcement where legally required</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>5. Data Retention</h2>
      <p>We retain personal data only as long as necessary for business, legal, accounting, and safety purposes.</p>

      <h2>6. Security</h2>
      <p>We use reasonable technical and organizational safeguards. No system is 100% secure, and you should use strong passwords and protect your account access.</p>

      <h2>7. Your Rights</h2>
      <p>Depending on your location, you may have rights to access, correct, delete, or restrict processing of your personal data, and to request data portability.</p>

      <h2>8. Children</h2>
      <p>Glamora is not intended for children under 13 (or higher age where required by local law).</p>

      <h2>9. International Transfers</h2>
      <p>Your information may be processed in countries other than where you live, subject to appropriate safeguards where required.</p>

      <h2>10. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will post the updated version with a new "Last updated" date.</p>

      <h2>11. Contact Us</h2>
      <p>For privacy questions or requests, email <a href="mailto:mukompatience@gmail.com">mukompatience@gmail.com</a>.</p>
    `
  );

  res.status(200).type('html').send(html);
});

app.get('/terms-of-service', (_req: Request, res: Response) => {
  const html = renderLegalPage(
    'Terms of Service',
    `
      <h1>Glamora Terms of Service</h1>
      <p class="meta">Last updated: ${LEGAL_LAST_UPDATED}</p>
      <p>These Terms of Service ("Terms") govern your use of the Glamora app and services. By using Glamora, you agree to these Terms.</p>

      <h2>1. Eligibility and Accounts</h2>
      <p>You must provide accurate information and keep your account credentials secure. You are responsible for activity under your account.</p>

      <h2>2. Platform Role</h2>
      <p>Glamora is a marketplace platform connecting customers and independent providers. Providers are responsible for their services and compliance with applicable law.</p>

      <h2>3. Bookings and Payments</h2>
      <ul>
        <li>Bookings are subject to provider availability and acceptance.</li>
        <li>Payments are processed through integrated third-party payment providers.</li>
        <li>Fees, pricing, and refund handling may vary by service and applicable policies.</li>
      </ul>

      <h2>4. Cancellations and Refunds</h2>
      <p>Cancellation and refund outcomes depend on booking status, provider terms, and applicable consumer law. We may assist with disputes at our discretion.</p>

      <h2>5. Prohibited Conduct</h2>
      <ul>
        <li>Fraudulent activity, impersonation, harassment, or abuse</li>
        <li>Attempting to bypass platform safety, payment, or verification controls</li>
        <li>Uploading illegal, infringing, or harmful content</li>
      </ul>

      <h2>6. Suspension and Termination</h2>
      <p>We may suspend or terminate access for violations of these Terms, safety concerns, fraud risk, or legal requirements.</p>

      <h2>7. Intellectual Property</h2>
      <p>Glamora and its content are protected by intellectual property laws. You may not copy or exploit platform materials except as permitted by law or written permission.</p>

      <h2>8. Disclaimers</h2>
      <p>Services are provided "as is" and "as available". We do not guarantee uninterrupted availability or outcomes of third-party services.</p>

      <h2>9. Limitation of Liability</h2>
      <p>To the fullest extent permitted by law, Glamora is not liable for indirect, incidental, special, or consequential damages.</p>

      <h2>10. Changes to Terms</h2>
      <p>We may update these Terms. Continued use after updates means acceptance of revised Terms.</p>

      <h2>11. Contact</h2>
      <p>Questions about these Terms: <a href="mailto:mukompatience@gmail.com">mukompatience@gmail.com</a>.</p>
    `
  );

  res.status(200).type('html').send(html);
});

app.get('/data-deletion', (_req: Request, res: Response) => {
  const html = renderLegalPage(
    'Data Deletion Instructions',
    `
      <h1>Glamora Data Deletion Instructions</h1>
      <p class="meta">Last updated: ${LEGAL_LAST_UPDATED}</p>
      <p>You may request deletion of your Glamora account and personal data using the steps below.</p>

      <h2>1. In-App Request (Preferred)</h2>
      <ol>
        <li>Open Glamora</li>
        <li>Go to Account Settings</li>
        <li>Select Delete Account</li>
        <li>Confirm the deletion request</li>
      </ol>

      <h2>2. Email Request</h2>
      <p>If you cannot access the app, email <a href="mailto:mukompatience@gmail.com">mukompatience@gmail.com</a> with subject: <strong>Data Deletion Request</strong>.</p>
      <p>Include the email/phone associated with your account so we can verify ownership.</p>

      <h2>3. What We Delete</h2>
      <ul>
        <li>Profile details and account identifiers tied to your user account</li>
        <li>Personal booking and messaging content, subject to legal and safety retention obligations</li>
      </ul>

      <h2>4. What May Be Retained</h2>
      <p>We may retain limited records where required by law, fraud prevention, tax/accounting obligations, dispute handling, or platform safety enforcement.</p>

      <h2>5. Processing Timeline</h2>
      <p>Most verified requests are processed within 30 days, unless a longer period is required by law or operational necessity.</p>

      <h2>6. Confirmation</h2>
      <p>We will confirm deletion status by email once the request is completed or if additional verification is required.</p>
    `
  );

  res.status(200).type('html').send(html);
});

app.get('/privacy', (_req: Request, res: Response) => {
  res.redirect(301, '/privacy-policy');
});

app.get('/terms', (_req: Request, res: Response) => {
  res.redirect(301, '/terms-of-service');
});

app.get('/delete-account', (_req: Request, res: Response) => {
  res.redirect(301, '/data-deletion');
});

// API Routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/bookings', bookingLimiter, bookingRoutes);
app.use('/api/payments', paymentRoutes); // Rate limiters applied at route level
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/admin', adminRoutes);

// Debug: Log all registered routes
console.log('📋 Registered routes:');
app._router.stack.forEach((middleware: any) => {
  if (middleware.route) {
    console.log(`  ${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach((handler: any) => {
      if (handler.route) {
        const path = middleware.regexp.source.replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/');
        console.log(`  ${Object.keys(handler.route.methods)} ${path}${handler.route.path}`);
      }
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Glamora Backend Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;

