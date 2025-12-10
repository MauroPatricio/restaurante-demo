# QR Menu - Mobile App

Enhanced React Native customer app for restaurant ordering.

## Features

### ✅ Implemented
- **Enhanced Menu Display** - Grid layout with images, search, and category filtering
- **Shopping Cart** - Multi-item cart with quantity controls and coupon support
- **Order Customization** - Special instructions and item customizations
- **Order Types** - Dine-in, Takeaway, and Delivery options
- **Payment UI** - Cash, M-Pesa, and e-Mola payment methods
- **Real-time Tracking** - Live order status updates
- **Feedback System** - 5-emotion selector with star ratings
- **QR Code Scanner** - Scan table QR codes

### 🚧 Pending
- Delivery address form screen
- Order history screen
- Item detail modal with larger images
- Push notifications

## Tech Stack

- React Native 0.74
- Expo 51
- React Navigation 6
- AsyncStorage for cart persistence
- Axios for API calls
- Socket.IO for real-time updates

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure API URL**:
   Update `services/api.js` if your backend is not on localhost:4000

3. **Run the app**:
   ```bash
   # Android
   npm run android

   # iOS
   npm run ios
   
   # Web (for testing)
   npm run web
   ```

## Project Structure

```
app/
├── components/
│   └── MenuCard.js                # Menu item card component
├── contexts/
│   └── CartContext.js             # Global cart state management
├── screens/
│   ├── HomeScreen.js              # Menu browsing
│   ├── CartScreen.tsx             # Cart management
│   ├── CheckoutScreen.js          # Order type & payment selection
│   ├── OrderStatusScreen.tsx      # Real-time order tracking
│   └── FeedbackScreen.js          # Post-order feedback
├── services/
│   └── api.js                     # API client
└── App.tsx                        # Main app with navigation
```

## Key Features Explained

### Menu Display
- Grid layout with food images
- Search functionality
- Category filtering tabs
- Add to cart with single tap
- Tap item for details

### Shopping Cart
- Persistent cart (saved in AsyncStorage)
- Quantity controls (+/-)
- Remove items
- Apply coupon codes
- Price breakdown (subtotal, tax, service charge, delivery fee, discount)
- Empty cart state

### Checkout Flow
1. Select order type (dine-in/takeaway/delivery)
2. Add delivery address (if delivery)
3. Choose payment method
4. Review order summary
5. Place order

### Order Tracking
- Visual progress indicator
- Status updates: Pending → Confirmed → Preparing → Ready → Completed
- Estimated ready time
- Order details

### Feedback
- 5-emotion selector (Love, Happy, Neutral, Sad, Angry)
- Star rating (1-5 stars)
- Submit after order completion

## API Integration

The app connects to the backend API at `http://localhost:4000/api` by default.

### Endpoints Used
- `GET /api/menu/:restaurantId` - Fetch menu items
- `GET /api/menu/:restaurantId/categories` - Get categories
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order status
- `POST /api/feedback` - Submit feedback
- `POST /api/coupons/validate` - Validate coupon

## Dependencies

```json
{
  "@react-native-async-storage/async-storage": "^1.21.0",
  "axios": "^1.6.7",
  "react-native-vector-icons": "^10.0.3",
  "@react-navigation/bottom-tabs": "^6.5.11",
  "react-native-modal": "^13.0.1",
  "react-native-ratings": "^8.1.0"
}
```

## Cart Context

The cart uses React Context for global state management:

```javascript
const {
  items,              // Array of cart items
  subtotal,           // Subtotal before fees
  tax,                // 16% tax
  serviceCharge,      // 5% service charge
  deliveryFee,        // 50 MT for delivery
  discount,           // Coupon discount
  total,              // Final total
  itemCount,          // Total number of items
  addItem,            // Add item to cart
  removeItem,         // Remove item from cart
  updateQuantity,     // Update item quantity
  clearCart,          // Empty the cart
  applyCoupon,        // Apply discount coupon
  removeCoupon,       // Remove coupon
} = useCart();
```

## Customization

### Colors
Update these in each screen's StyleSheet:
- Primary: `#2563eb`
- Background: `#f8fafc`
- Text: `#1e293b`

### Tax & Fees
Modify in `contexts/CartContext.js`:
- Tax rate: Line 108 (currently 16%)
- Service charge: Line 109 (currently 5%)
- Delivery fee: Line 110 (currently 50 MT)

## License

Proprietary - All rights reserved
