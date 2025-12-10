# Sistema Integrado de Gestão de Restaurante (QR Menu)

**Comprehensive restaurant management system with QR code ordering, payment integrations, subscription billing, and multi-platform support.**

## 🌟 Features

### For Customers
- 📱 **QR Code Access** - Scan table QR codes to access digital menu
- 🍕 **Interactive Menu** - Browse menu with photos, categories, descriptions
- ✏️ **Order Customization** - Personalize dishes with customization options
- 💳 **Multiple Payment Methods** - Mpesa, eMola, BIM, BCI, Cash
- 🎁 **Coupons & Discounts** - Apply promotional codes
- 😊 **5-Emotion Feedback** - Quick feedback with emotion selection
- 🚚 **Delivery & Takeaway** - Choose dine-in, delivery, or takeaway
- 📍 **Real-time Tracking** - Track order status in real-time

### For Restaurant Owners
- 🖥️ **Web Admin Dashboard** - Comprehensive management interface
- 📊 **Analytics & Reports** - View sales trends, popular items, consumption patterns
- 🧑‍🍳 **Menu Management** - CRUD operations for menu items with images
- 🪑 **Table Management** - Generate QR codes for tables
- 💰 **Payment Tracking** - Monitor all transactions
- 📢 **Notifications** - Firebase push notifications to staff
- 💬 **Customer Feedback Reports** - View and analyze customer feedback
- 📅 **Subscription Management** - Track subscription status and payments

### For Kitchen Staff
- 📋 **Order Queue** - Real-time order notifications
- ⏱️ **Preparation Tracking** - Update order status
- 🔔 **Notifications** - Alerts for new orders

### For Delivery Personnel
- 📱 **Delivery App** - Dedicated mobile app
- 🗺️ **Navigation** - Integrated maps for delivery
- ✅ **Status Updates** - Update delivery progress
- 💵 **Earnings Tracking** - View completed deliveries

## 💳 Subscription Model

- **First Month Free** - 30-day trial period
- **Monthly Fee**: 10,000 MT
- **Auto-Billing** - Automatic monthly billing
- **Grace Period**: 3 days after due date
- **Auto-Suspension** - System suspended on non-payment
- **Email Reminders** - 7, 3, and 1 day before due date

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.IO
- **Notifications**: Firebase Admin SDK
- **Email**: Nodemailer
- **Scheduling**: node-cron
- **File Upload**: Multer

### Frontend (To be implemented)
- **Mobile Apps**: React Native (Expo)
- **Web Admin**: React.js (Vite)

## 📁 Project Structure

```
qr-menu/
├── api/                          # Backend API
│   ├── src/
│   │   ├── models/              # Mongoose models
│   │   │   ├── Coupon.js
│   │   │   ├── Delivery.js
│   │   │   ├── Feedback.js
│   │   │   ├── MenuItem.js
│   │   │   ├── Message.js
│   │   │   ├── Order.js
│   │   │   ├── Payment.js
│   │   │   ├── Restaurant.js
│   │   │   ├── Subscription.js
│   │   │   ├── Table.js
│   │   │   └── User.js
│   │   ├── routes/              # API routes
│   │   │   ├── authRoutes.js
│   │   │   ├── couponRoutes.js
│   │   │   ├── deliveryRoutes.js
│   │   │   ├── feedbackRoutes.js
│   │   │   ├── paymentRoutes.js
│   │   │   ├── subscriptionRoutes.js
│   │   │   └── index.js
│   │   ├── services/            # Business logic
│   │   │   ├── emailService.js
│   │   │   ├── firebaseService.js
│   │   │   ├── paymentService.js
│   │   │   └── scheduledJobs.js
│   │   └── middleware/          # Authentication middleware
│   │       └── auth.js
│   ├── uploads/                 # File uploads directory
│   ├── .env.example            # Environment variables template
│   ├── firebase-config.json.example  # Firebase config template
│   ├── index.js                # Server entry point
│   └── package.json
├── app/                         # Mobile app (customer)
└── admin-dashboard/            # Web admin (to be created)
```

## 🚀 Getting Started

### Prerequisites
- Node.js v18 or higher
- MongoDB v7 or higher
- Firebase project (for push notifications)

### Backend Setup

1. **Clone and navigate to the API directory:**
   ```bash
   cd d:\Projectos\restaurante\qr-menu\api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and update:
   - `MONGO_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Strong secret key for JWT
   - `EMAIL_USER` and `EMAIL_PASSWORD` - Email credentials
   - Payment API credentials (when available)

4. **Configure Firebase (for push notifications):**
   - Download Firebase service account JSON from Firebase Console
   - Rename it to `firebase-config.json` and place in the `api` directory
   - Or use the provided `firebase-config.json.example` as a template

5. **Start the server:**
   ```bash
   npm run dev
   ```

   The API will be running on `http://localhost:4000`

### Docker Setup (Alternative)

```bash
cd d:\Projectos\restaurante\qr-menu
docker-compose up
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new restaurant
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/fcm-token` - Update FCM token
- `GET /api/auth/me` - Get current user

### Restaurants
- `GET /api/restaurants/:id` - Get restaurant details
- `PATCH /api/restaurants/:id` - Update restaurant

### Tables
- `POST /api/tables` - Create table with QR code
- `GET /api/tables/restaurant/:restaurantId` - Get all tables
- `GET /api/tables/:id` - Get single table
- `DELETE /api/tables/:id` - Delete table

### Menu
- `GET /api/menu/:restaurantId` - Get menu items
- `GET /api/menu/:restaurantId/categories` - Get categories
- `POST /api/menu-items` - Create menu item
- `PATCH /api/menu-items/:id` - Update menu item
- `DELETE /api/menu-items/:id` - Delete menu item

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/restaurant/:restaurantId` - Get restaurant orders
- `GET /api/orders/:id` - Get single order
- `PATCH /api/orders/:id` - Update order status

### Payments
- `POST /api/payments/mpesa` - Initiate Mpesa payment
- `POST /api/payments/emola` - Initiate eMola payment
- `POST /api/payments/bank` - Upload bank receipt
- `POST /api/payments/cash` - Record cash payment
- `POST /api/payments/webhook` - Payment webhook
- `GET /api/payments/:reference` - Get payment status

### Subscriptions
- `GET /api/subscriptions/:restaurantId` - Get subscription status
- `GET /api/subscriptions/:restaurantId/history` - Payment history
- `POST /api/subscriptions/payment` - Record subscription payment

### Feedback
- `POST /api/feedback` - Submit customer feedback
- `GET /api/feedback/:restaurantId` - Get all feedback
- `GET /api/feedback/:restaurantId/stats` - Get feedback statistics

### Coupons
- `POST /api/coupons` - Create coupon
- `POST /api/coupons/validate` - Validate coupon code
- `GET /api/coupons/:restaurantId` - Get all coupons
- `PATCH /api/coupons/:id` - Update coupon
- `DELETE /api/coupons/:id` - Deactivate coupon

### Delivery
- `POST /api/delivery` - Create delivery order
- `GET /api/delivery/active` - Get active deliveries (for delivery person)
- `GET /api/delivery/restaurant/:restaurantId` - Get restaurant deliveries
- `PATCH /api/delivery/:id/assign` - Assign delivery to person
- `PATCH /api/delivery/:id/status` - Update delivery status
- `PATCH /api/delivery/location` - Update delivery person location

## 🔐 Authentication & Authorization

### Roles
- **owner** - Restaurant owner
- **admin** - System administrator
- **manager** - Restaurant manager
- **waiter** - Waiter/server
- **kitchen** - Kitchen staff
- **delivery** - Delivery personnel

### Protected Routes
Most management routes require authentication via JWT token:
```
Authorization: Bearer <token>
```

### Subscription Check
Routes that require active subscription will automatically check subscription status and return 403 if suspended.

## 📧 Email Notifications

Automated emails are sent for:
- **7 days before** subscription renewal
- **3 days before** subscription renewal  
- **1 day before** subscription renewal
- **Overdue payment** notice
- **Suspension** notice
- **Renewal confirmation**

## 🔔 Push Notifications

Firebase notifications are sent for:
- **New orders** → Kitchen staff
- **Order ready** → Waiters
- **Payment received** → Managers
- **Delivery assigned** → Delivery person
- **Order status updates** → Customers

## 💾 Database Models

### Core Models
- **Restaurant** - Restaurant information and settings
- **Table** - Tables with QR codes
- **MenuItem** - Menu items with customization options
- **Order** - Customer orders with items and payment details
- **User** - Staff members with roles and authentication

### Payment & Billing
- **Subscription** - Restaurant subscriptions with trial and billing
- **Payment** - All payment transactions
- **Coupon** - Promotional coupons

### Features
- **Feedback** - Customer feedback with 5-emotion system
- **Delivery** - Delivery order tracking
- **Message** - Internal chat messages
- **Audience** - Customer phone numbers for marketing

## 🔧 Configuration

### Environment Variables

```env
# Database
MONGO_URI=mongodb://localhost:27017/qr-menu-restaurant

# Server
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-key

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Payment APIs (when available)
MPESA_API_KEY=your-key
EMOLA_API_KEY=your-key

# Subscription
SUBSCRIPTION_AMOUNT=10000
SUBSCRIPTION_GRACE_DAYS=3
```

## 📈 Next Steps

1. **Complete Web Admin Dashboard** (React.js)
2. **Enhance Mobile App** with new features
3. **Create Delivery App** (React Native)
4. **Integrate Payment APIs** (Mpesa, eMola)
5. **Add Analytics Dashboard** with charts
6. **Implement Chat System** for internal communication
7. **Add Printer Integration** for kitchen orders
8. **SMS/WhatsApp Marketing** integration

## 🤝 Contributing

This is a proprietary restaurant management system. For development:

1. Create feature branches
2. Follow existing code structure
3. Test all endpoints before committing
4. Update documentation for new features

## 📝 License

Proprietary - All rights reserved

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error:**
```bash
# Make sure MongoDB is running
mongod
```

**Firebase Not Initialized:**
- Check that `firebase-config.json` exists in the api directory
- Verify Firebase credentials are valid

**Email Not Sending:**
- Check EMAIL_USER and EMAIL_PASSWORD in .env
- For Gmail, use an App Password, not your regular password

**Port Already in Use:**
```bash
# Change PORT in .env or kill the process using port 4000
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

## 📞 Support

For issues or questions about this system, contact the development team.

---

**Built with ❤️ for the restaurant industry in Mozambique** 🇲🇿
