# Synvoy - Technical Specifications
## Detailed Technical Implementation Guide

---

## Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### Trips Table
```sql
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    budget DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'planning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Destinations Table
```sql
CREATE TABLE destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    arrival_date DATE,
    departure_date DATE,
    priority INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Price Alerts Table
```sql
CREATE TABLE price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'flight', 'hotel', 'transport'
    origin VARCHAR(100),
    destination VARCHAR(100),
    max_price DECIMAL(10,2),
    min_price DECIMAL(10,2),
    preferred_dates JSONB, -- Array of date ranges
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Shopping Items Table
```sql
CREATE TABLE shopping_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    target_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    current_price DECIMAL(10,2),
    url VARCHAR(500),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### User Connections Table
```sql
CREATE TABLE user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    connected_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    connection_type VARCHAR(50) DEFAULT 'friend', -- 'friend', 'family', 'travel_buddy'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, connected_user_id)
);
```

#### Notifications Table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'price_alert', 'social', 'system'
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Price History Table
```sql
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID, -- References either price_alerts or shopping_items
    item_type VARCHAR(50), -- 'travel' or 'shopping'
    price DECIMAL(10,2) NOT NULL,
    source VARCHAR(100),
    url VARCHAR(500),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### POST /api/auth/login
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

#### POST /api/auth/refresh
```json
{
  "refreshToken": "refresh_token_here"
}
```

### User Management Endpoints

#### GET /api/users/profile
Returns current user profile

#### PUT /api/users/profile
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "preferences": {
    "notifications": {
      "email": true,
      "push": true,
      "sms": false
    },
    "currency": "USD",
    "language": "en"
  }
}
```

### Trip Management Endpoints

#### GET /api/trips
Returns user's trips with pagination

#### POST /api/trips
```json
{
  "title": "Europe Adventure",
  "description": "Backpacking through Europe",
  "budget": 5000.00,
  "startDate": "2024-06-01",
  "endDate": "2024-06-30",
  "destinations": [
    {
      "city": "Paris",
      "country": "France",
      "arrivalDate": "2024-06-01",
      "departureDate": "2024-06-05"
    },
    {
      "city": "Rome",
      "country": "Italy",
      "arrivalDate": "2024-06-05",
      "departureDate": "2024-06-10"
    }
  ]
}
```

#### GET /api/trips/:id
Returns specific trip details

#### PUT /api/trips/:id
Update trip information

#### DELETE /api/trips/:id
Delete trip

### Price Alert Endpoints

#### GET /api/alerts
Returns user's price alerts

#### POST /api/alerts
```json
{
  "tripId": "trip_uuid",
  "alertType": "flight",
  "origin": "New York",
  "destination": "Paris",
  "maxPrice": 800.00,
  "minPrice": 400.00,
  "preferredDates": [
    {
      "start": "2024-06-01",
      "end": "2024-06-05"
    }
  ]
}
```

#### PUT /api/alerts/:id
Update price alert

#### DELETE /api/alerts/:id
Delete price alert

### Shopping Endpoints

#### GET /api/shopping/items
Returns user's shopping items

#### POST /api/shopping/items
```json
{
  "name": "iPhone 15 Pro",
  "category": "electronics",
  "targetPrice": 999.00,
  "maxPrice": 1200.00,
  "url": "https://example.com/iphone"
}
```

#### PUT /api/shopping/items/:id
Update shopping item

#### DELETE /api/shopping/items/:id
Delete shopping item

### Social Connection Endpoints

#### GET /api/connections
Returns user's connections

#### POST /api/connections
```json
{
  "connectedUserId": "user_uuid",
  "connectionType": "friend"
}
```

#### PUT /api/connections/:id
Update connection status

#### DELETE /api/connections/:id
Remove connection

### Notification Endpoints

#### GET /api/notifications
Returns user's notifications

#### PUT /api/notifications/:id/read
Mark notification as read

#### DELETE /api/notifications/:id
Delete notification

### AI Assistant Endpoints

#### POST /api/ai/chat
```json
{
  "message": "I want to plan a trip to Europe with a budget of $5000",
  "context": {
    "currentTrip": "trip_uuid",
    "userPreferences": {}
  }
}
```

---

## Mobile App Structure

### Screen Hierarchy

```
App
├── Auth
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── ForgotPasswordScreen
├── Main (Tab Navigator)
│   ├── Home
│   │   ├── DashboardScreen
│   │   ├── QuickActionsScreen
│   │   └── RecentActivityScreen
│   ├── Trips
│   │   ├── TripsListScreen
│   │   ├── TripDetailScreen
│   │   ├── CreateTripScreen
│   │   └── EditTripScreen
│   ├── Shopping
│   │   ├── ShoppingListScreen
│   │   ├── AddItemScreen
│   │   └── ItemDetailScreen
│   ├── Social
│   │   ├── ConnectionsScreen
│   │   ├── FindFriendsScreen
│   │   └── GroupPlansScreen
│   └── Profile
│       ├── ProfileScreen
│       ├── SettingsScreen
│       └── NotificationsScreen
└── Modals
    ├── AIAssistantModal
    ├── PriceAlertModal
    └── ShareTripModal
```

### Key Components

#### Navigation
```typescript
// AppNavigator.tsx
const AppNavigator = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
```

#### State Management
```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tripsReducer from './slices/tripsSlice';
import alertsReducer from './slices/alertsSlice';
import shoppingReducer from './slices/shoppingSlice';
import socialReducer from './slices/socialSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    trips: tripsReducer,
    alerts: alertsReducer,
    shopping: shoppingReducer,
    social: socialReducer,
  },
});
```

#### API Service
```typescript
// services/api.ts
class ApiService {
  private baseURL = 'https://api.triplink.com';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Auth methods
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Trip methods
  async getTrips() {
    return this.request('/trips');
  }

  async createTrip(tripData: CreateTripData) {
    return this.request('/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    });
  }

  // Alert methods
  async getAlerts() {
    return this.request('/alerts');
  }

  async createAlert(alertData: CreateAlertData) {
    return this.request('/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  }
}

export const apiService = new ApiService();
```

---

## Backend Architecture

### Project Structure
```
backend/
├── src/
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── tripController.ts
│   │   ├── alertController.ts
│   │   ├── shoppingController.ts
│   │   ├── socialController.ts
│   │   └── notificationController.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── tripService.ts
│   │   ├── priceMonitorService.ts
│   │   ├── notificationService.ts
│   │   ├── aiService.ts
│   │   └── emailService.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Trip.ts
│   │   ├── Alert.ts
│   │   └── Notification.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   ├── rateLimit.ts
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── trips.ts
│   │   ├── alerts.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── database.ts
│   │   ├── logger.ts
│   │   ├── validation.ts
│   │   └── helpers.ts
│   └── config/
│       ├── database.ts
│       ├── redis.ts
│       └── environment.ts
├── prisma/
│   └── schema.prisma
├── tests/
├── package.json
└── tsconfig.json
```

### Core Services Implementation

#### Price Monitor Service
```typescript
// services/priceMonitorService.ts
export class PriceMonitorService {
  private readonly logger = new Logger('PriceMonitorService');

  async monitorPrices() {
    try {
      // Get all active alerts
      const alerts = await this.getActiveAlerts();
      
      for (const alert of alerts) {
        await this.checkPriceForAlert(alert);
      }
    } catch (error) {
      this.logger.error('Error monitoring prices:', error);
    }
  }

  private async checkPriceForAlert(alert: PriceAlert) {
    try {
      const currentPrice = await this.fetchCurrentPrice(alert);
      
      if (this.shouldNotifyUser(alert, currentPrice)) {
        await this.createNotification(alert, currentPrice);
      }
      
      // Store price history
      await this.storePriceHistory(alert, currentPrice);
    } catch (error) {
      this.logger.error(`Error checking price for alert ${alert.id}:`, error);
    }
  }

  private async fetchCurrentPrice(alert: PriceAlert): Promise<PriceData> {
    // Implementation depends on the source (flight APIs, web scraping, etc.)
    switch (alert.alertType) {
      case 'flight':
        return this.fetchFlightPrice(alert);
      case 'hotel':
        return this.fetchHotelPrice(alert);
      case 'shopping':
        return this.fetchShoppingPrice(alert);
      default:
        throw new Error(`Unsupported alert type: ${alert.alertType}`);
    }
  }

  private shouldNotifyUser(alert: PriceAlert, currentPrice: PriceData): boolean {
    return currentPrice.price <= alert.maxPrice && 
           currentPrice.price >= alert.minPrice;
  }
}
```

#### AI Service
```typescript
// services/aiService.ts
export class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateResponse(message: string, context: any): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: this.buildSystemPrompt(context)
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  private buildSystemPrompt(context: any): string {
    return `You are Synvoy, a helpful travel and shopping assistant. 
    You help users plan trips, find deals, and make smart purchasing decisions.
    
    User context: ${JSON.stringify(context)}
    
    Be helpful, friendly, and provide actionable advice.`;
  }
}
```

---

## Security Considerations

### Authentication & Authorization
- JWT tokens with refresh mechanism
- Password hashing with bcrypt
- Rate limiting on authentication endpoints
- Session management

### Data Protection
- Input validation and sanitization
- SQL injection prevention with Prisma ORM
- XSS protection
- CORS configuration

### API Security
- Rate limiting per user/IP
- Request size limits
- API key management for external services
- Error handling without sensitive data exposure

---

## Performance Optimization

### Database Optimization
- Proper indexing on frequently queried columns
- Query optimization
- Connection pooling
- Read replicas for scaling

### Caching Strategy
- Redis for session storage
- API response caching
- Price data caching
- CDN for static assets

### Mobile App Optimization
- Image optimization and lazy loading
- Offline data storage
- Background sync
- Push notification optimization

---

## Monitoring & Analytics

### Application Monitoring
- Error tracking with Sentry
- Performance monitoring with DataDog
- User analytics with Mixpanel
- Server health monitoring

### Business Metrics
- User acquisition and retention
- Feature usage analytics
- Revenue tracking
- Price alert effectiveness

---

## Deployment Strategy

### Development Environment
- Docker containers
- Local database setup
- Hot reloading
- Environment-specific configurations

### Production Deployment
- AWS ECS or Google Cloud Run
- Auto-scaling configuration
- Load balancer setup
- Database backups and recovery

### CI/CD Pipeline
- GitHub Actions for automated testing
- Staging environment for testing
- Automated deployment to production
- Rollback capabilities 