# Features Overview - Directory Template

This document provides a comprehensive overview of all features in the Directory Template application, including implemented features and planned enhancements.

**Last Updated:** December 17, 2025

---

## Table of Contents

- [Implemented Features](#implemented-features)
- [Planned Features](#planned-features)
- [Implementation Status Summary](#implementation-status-summary)
- [Priority Roadmap](#priority-roadmap)

---

## ✅ Implemented Features

### 1. Authentication & Security

**Status:** 95% Complete

#### Core Authentication
- ✅ User registration with email/password
- ✅ User login with credential validation
- ✅ Session management using `nuxt-auth-utils`
- ✅ Secure HTTP-only cookies with SameSite=Strict

#### Password Reset Flow (OTP-based)
- ✅ OTP generation and email delivery
- ✅ 6-digit cryptographically secure codes
- ✅ Rate limiting (3 requests/hour per email)
- ✅ Maximum 5 verification attempts per OTP
- ✅ Short-lived tokens (10 minutes for OTP, 5 minutes for verification)
- ✅ Timing-safe OTP comparison
- ✅ Enumeration protection (generic success messages)
- ✅ Session invalidation on password reset
- ✅ Redis-based storage for OTPs and rate limits

#### API Endpoints
```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/verify-otp
POST /api/auth/reset-password
```

**Security Features:**
- CSRF protection via session tokens
- Password hashing with industry-standard algorithms
- Secure session storage
- Anti-enumeration measures

---

### 2. Venue Discovery & Search

**Status:** 70% Complete

#### Search Capabilities
- ✅ Location-based search (city/region)
- ✅ Activity/category search
- ✅ Combined search (location + activity)
- ✅ Discipline filtering
- ✅ Venue listing page with results
- ✅ Individual venue profile pages

#### Navigation & Display
- ✅ `/venues` - Main venue listing and search page
- ✅ `/venues/[slug]` - Dynamic venue profile pages
- ✅ Map integration for geographical visualization
- ✅ Responsive list and map views

#### API Endpoints
```
GET /api/venues?search=...&city=...&activity=...
GET /api/venues/:slug
GET /api/cities
GET /api/countries
GET /api/styles
```

**Missing:**
- ⏳ Advanced facility filtering
- ⏳ Radius/distance search
- ⏳ Real-time availability

---

### 3. Venue Profiles

**Status:** 60% Complete

#### Information Display
- ✅ Venue identity (name, logo, slug)
- ✅ Localized descriptions (EN/FR)
- ✅ Contact information (phone, website, social links)
- ✅ Full address with geocoding
- ✅ Interactive map pin
- ✅ List of disciplines/activities offered
- ✅ Schedule and planning (JSON format)
- ✅ Opening hours

#### Data Structure
```typescript
{
  name: string
  slug: string
  description: { en: string, fr: string }
  tel: string
  website: string
  address: Address
  activities: Activity[]
  openingHours: JSON
  planning: JSON
}
```

**Missing:**
- ⏳ User reviews and ratings
- ⏳ Photo galleries
- ⏳ Pricing/subscription plans display
- ⏳ Equipment/amenities list
- ⏳ Interactive class schedule calendar
- ⏳ Level indicators (beginner/advanced)
- ⏳ Trial offers section

---

### 4. Dashboard & Management

**Status:** 75% Complete

#### User Management
- ✅ Protected dashboard area (`/dashboard`)
- ✅ Authentication-required routes
- ✅ User profile page
- ✅ Personal information updates
- ✅ Account settings

#### Franchise Management
- ✅ Franchise entity support
- ✅ Brand identity management
- ✅ Franchise-venue relationship
- ✅ `/dashboard/franchise` page

#### Venue Management
- ✅ Venue listing in dashboard
- ✅ Venue CRUD operations support
- ✅ `/dashboard/venues/*` routes
- ✅ Link venues to franchises

#### Dashboard Structure
```
/dashboard
  ├── /               # Dashboard home
  ├── /profile        # User profile & settings
  ├── /franchise      # Franchise management
  └── /venues/         # Venue management
      ├── /           # Venue list
      ├── /create     # Create new venue
      └── /[id]/edit  # Edit existing venue
```

**Missing:**
- ⏳ Venue creation wizard
- ⏳ Media upload functionality
- ⏳ Interactive schedule builder
- ⏳ Formula/pricing management UI
- ⏳ Analytics dashboard (views, leads)
- ⏳ Bulk operations for franchises

---

### 5. Content & Internationalization

**Status:** 90% Complete

#### Multi-language Support
- ✅ English (EN) and French (FR) support
- ✅ `@nuxtjs/i18n` integration
- ✅ UI translation via JSON files (`i18n/locales/`)
- ✅ Automatic locale detection
- ✅ Language switcher in navigation

#### Content Management
- ✅ Blog system using `@nuxt/content`
- ✅ Markdown-based articles
- ✅ Localized blog posts (`/content/{locale}/blog/`)
- ✅ Frontmatter metadata (title, date, author, tags)
- ✅ Dynamic content rendering

#### Database Localization
- ✅ JSONB columns for multilingual content
- ✅ Schema pattern: `{ "en": "...", "fr": "..." }`
- ✅ Automatic locale-based field selection

#### Pages
```
/blog/                        # Blog listing
/blog/[slug]                  # Individual blog posts
/categories/[category]/guide  # Category guide silo (plus other spoke types)
```

**Missing:**
- ⏳ Additional language support (ES, DE, etc.)
- ⏳ User-contributed translations
- ⏳ Dynamic locale switching for database content

---

### 6. System Administration

**Status:** 80% Complete

#### Web Scraping
- ✅ Scraping utilities (`server/services/scraping/`)
- ✅ Browser automation support
- ✅ HTML parser for venue data extraction
- ✅ Background jobs (`server/jobs/scrape-venues.ts`)
- ✅ Retry logic for failed scrapes
- ✅ Data normalization and storage

#### SEO & Visibility
- ✅ Server-Side Rendering (SSR)
- ✅ Automatic sitemap generation (`/sitemap.xml`)
- ✅ Dynamic meta tags per page
- ✅ Open Graph tags for social sharing
- ✅ Twitter Card support
- ✅ Semantic HTML structure

#### Analytics
- ✅ `nuxt-umami` integration
- ✅ Privacy-focused analytics

**API Endpoints**
```
GET /api/__sitemap__/urls  # Sitemap generation
```

**Missing:**
- ⏳ Admin panel UI
- ⏳ Scraping scheduler/cron jobs
- ⏳ Data quality monitoring
- ⏳ Schema.org structured data

---

### 7. Location & Geography

**Status:** 85% Complete

#### Geographic Features
- ✅ Country browsing (`/country/*`)
- ✅ Country data endpoint (`/api/countries`)
- ✅ City data endpoint (`/api/cities`)
- ✅ Geographic hierarchy (Countries → Cities → Venues)
- ✅ Address management with coordinates
- ✅ Map integration support

**Missing:**
- ⏳ Region/state level
- ⏳ Geolocation auto-detect
- ⏳ "Near me" functionality

---

### 8. Communication

**Status:** 50% Complete

#### Contact
- ✅ Contact page (`/contact`)
- ✅ Static contact form layout

**Missing:**
- ⏳ Form submission handling
- ⏳ Email notification system
- ⏳ Lead generation for venues
- ⏳ Newsletter subscription

---

## 🔨 Planned Features

### 1. Venue Discovery Enhancements

#### Advanced Filtering
- ⏳ Facility-based filtering (showers, parking, locker rooms)
- ⏳ Equipment filtering (ring, tatami, heavy bags)
- ⏳ Distance/radius search around coordinates
- ⏳ Pricing range filters
- ⏳ Class level filters (beginner-friendly, advanced)
- ⏳ Schedule-based search (open now, classes at specific times)

#### Search Improvements
- ⏳ Autocomplete for locations
- ⏳ Recent searches history
- ⏳ Saved searches for registered users
- ⏳ Search suggestions based on popularity

#### Display Options
- ⏳ Grid/list/map view toggles
- ⏳ Sort options (distance, rating, popularity)
- ⏳ Clustering for map markers
- ⏳ Lazy loading for large result sets

---

### 2. Venue Profile Enhancements

#### Media & Visuals
- ⏳ Photo gallery with lightbox
- ⏳ Video embeds (YouTube/Vimeo)
- ⏳ Virtual tour support (360° photos)
- ⏳ Instagram feed integration

#### Social Proof
- ⏳ User reviews and ratings system
- ⏳ Star rating aggregation
- ⏳ Review moderation
- ⏳ Verified reviews (attendance-based)
- ⏳ Trainer/coach profiles

#### Detailed Information
- ⏳ Equipment/amenities checklist display
- ⏳ Pricing plans (formulas) with comparison
- ⏳ Trial offers and promotions
- ⏳ Interactive class schedule calendar
- ⏳ Level indicators per class
- ⏳ Instructor information

#### Engagement
- ⏳ Contact venue form
- ⏳ Book trial class
- ⏳ Share venue (social media integration)
- ⏳ Report incorrect information
- ⏳ Claim venue ownership

---

### 3. Dashboard & Management Enhancements

#### Venue Management
- ⏳ Step-by-step venue creation wizard
- ⏳ Photo/video upload with preview
- ⏳ Drag-and-drop media management
- ⏳ Interactive schedule builder (weekly calendar)
- ⏳ Formula/pricing plan manager
- ⏳ Trial offer configuration
- ⏳ Equipment checklist manager

#### Analytics & Insights
- ⏳ Profile view statistics
- ⏳ Search appearance metrics
- ⏳ Contact form submissions tracking
- ⏳ Geographic distribution of visitors
- ⏳ Referral source tracking
- ⏳ Export reports (PDF/CSV)

#### Franchise Features
- ⏳ Bulk venue updates across franchise
- ⏳ Centralized brand guidelines
- ⏳ Multi-venue calendar view
- ⏳ Franchise-level analytics
- ⏳ Staff/instructor management

#### User Experience
- ⏳ Dashboard onboarding tour
- ⏳ Progress indicators (profile completion %)
- ⏳ Quick actions menu
- ⏳ Notification center
- ⏳ Mobile-responsive dashboard

---

### 4. User Engagement Features

#### User Accounts
- ⏳ User profiles (for visitors/athletes)
- ⏳ Favorite/bookmark venues
- ⏳ Visited venues history
- ⏳ Training journal/log
- ⏳ Goal setting and tracking

#### Reviews & Ratings
- ⏳ Submit venue reviews
- ⏳ Rating categories (facilities, instructors, atmosphere)
- ⏳ Photo attachments to reviews
- ⏳ Review helpfulness voting
- ⏳ Owner responses to reviews

#### Interaction
- ⏳ Venue comparison tool (side-by-side)
- ⏳ Q&A section for venues
- ⏳ Community forums by discipline
- ⏳ Event calendar (competitions, seminars)

#### Social Features
- ⏳ Share venues on social media
- ⏳ Create and share lists (e.g., "Best Yoga Studios in Paris")
- ⏳ Follow venues for updates
- ⏳ Training buddy finder

---

### 5. Advanced Authentication & Security

#### Authentication Methods
- ⏳ OAuth providers (Google, Facebook, Apple)
- ⏳ Magic link login (passwordless)
- ⏳ Two-factor authentication (2FA)
- ⏳ Biometric authentication for mobile

#### Account Features
- ⏳ Email verification on signup
- ⏳ Phone number verification
- ⏳ Account deletion (GDPR compliance)
- ⏳ Data export functionality
- ⏳ Session management (view active sessions)

#### Security Enhancements
- ⏳ Login attempt monitoring
- ⏳ Suspicious activity alerts
- ⏳ IP-based access control
- ⏳ CAPTCHA for sensitive operations

---

### 6. Premium Features

#### For Venues
- ⏳ Verified badge (blue checkmark)
- ⏳ Featured listings in search results
- ⏳ Sponsored/promoted placement
- ⏳ Enhanced profile customization
- ⏳ Priority support
- ⏳ Advanced analytics

#### Subscription Tiers
- ⏳ Free tier (basic listing)
- ⏳ Standard tier (enhanced features)
- ⏳ Premium tier (all features + priority)
- ⏳ Franchise tier (multi-location management)

#### Monetization
- ⏳ Payment processing (Stripe integration)
- ⏳ Subscription management
- ⏳ Invoice generation
- ⏳ Affiliate program

---

### 7. Mobile & Progressive Web App

#### PWA Features
- ⏳ Offline functionality
- ⏳ Install prompt (Add to Home Screen)
- ⏳ Push notifications
- ⏳ App-like experience

#### Mobile Optimization
- ⏳ Touch-optimized interface
- ⏳ Swipe gestures
- ⏳ Bottom navigation for mobile
- ⏳ Geolocation auto-detect
- ⏳ "Near me" quick search
- ⏳ Call/directions quick actions

#### Native Apps
- ⏳ iOS app (React Native/Flutter)
- ⏳ Android app (React Native/Flutter)
- ⏳ App store optimization

---

### 8. Admin & Moderation

#### Admin Panel
- ⏳ User management interface
- ⏳ Venue approval workflow
- ⏳ Content moderation dashboard
- ⏳ Review moderation
- ⏳ Dispute resolution system

#### User Roles
- ⏳ Super Admin (full access)
- ⏳ Moderator (content review)
- ⏳ Venue Owner (own venues only)
- ⏳ Franchise Owner (franchise venues)
- ⏳ Regular User (basic features)

#### Moderation Features
- ⏳ Automated spam detection
- ⏳ Flag inappropriate content
- ⏳ Venue verification process
- ⏳ Quality score system
- ⏳ Bulk actions for moderation

#### Platform Management
- ⏳ System health monitoring
- ⏳ Database backup management
- ⏳ Cache management
- ⏳ Feature flags
- ⏳ A/B testing framework

---

### 9. Marketing & SEO

#### Content Marketing
- ⏳ Email marketing integration (Mailchimp/SendGrid)
- ⏳ Newsletter subscription management
- ⏳ Automated welcome emails
- ⏳ Venue recommendation emails
- ⏳ Drip campaigns for new users

#### SEO Enhancements
- ⏳ Schema.org markup for LocalBusiness
- ⏳ Rich snippets (ratings, hours, reviews)
- ⏳ Multi-language SEO optimization
- ⏳ Canonical URL management
- ⏳ Breadcrumb navigation
- ⏳ XML sitemap per language

#### Social Media
- ⏳ Automated social sharing
- ⏳ Social media scheduling
- ⏳ Instagram integration
- ⏳ Twitter feed embedding

#### Partnerships
- ⏳ Affiliate program for venues
- ⏳ Referral program
- ⏳ API for third-party integrations
- ⏳ Widget embeds for venues

---

### 10. Advanced System Features

#### Performance
- ⏳ CDN integration
- ⏳ Image optimization service
- ⏳ Lazy loading for images
- ⏳ Service worker caching
- ⏳ Database query optimization

#### Reliability
- ⏳ Automated backups
- ⏳ Disaster recovery plan
- ⏳ Uptime monitoring
- ⏳ Error tracking (Sentry)
- ⏳ Health check endpoints

#### Scalability
- ⏳ Horizontal scaling support
- ⏳ Database sharding strategy
- ⏳ Load balancing
- ⏳ Queue system for background jobs
- ⏳ Microservices architecture (future)

---

## 📊 Implementation Status Summary

| Category | Completion | Priority |
|----------|-----------|----------|
| **Core Authentication** | 95% | ✅ High |
| **Venue Discovery** | 70% | ✅ High |
| **Venue Profiles** | 60% | 🔶 Medium |
| **Dashboard & Management** | 75% | ✅ High |
| **Content & i18n** | 90% | 🔶 Medium |
| **System Administration** | 80% | 🔶 Medium |
| **Location & Geography** | 85% | 🔶 Medium |
| **Communication** | 50% | ✅ High |
| **User Engagement** | 20% | 🔶 Medium |
| **Premium Features** | 0% | 🔵 Low |
| **Mobile & PWA** | 0% | 🔵 Low |
| **Admin & Moderation** | 10% | ✅ High |
| **Marketing & SEO** | 40% | 🔶 Medium |
| **Advanced System** | 60% | 🔶 Medium |

### Legend
- ✅ **High Priority** - Critical for core functionality
- 🔶 **Medium Priority** - Important for user experience
- 🔵 **Low Priority** - Nice to have / future enhancements

---

## 🎯 Priority Roadmap

### Phase 1: Core Completion (0-3 months)
**Goal:** Complete essential features for MVP launch

1. **User Reviews & Ratings** ⭐ HIGH
   - Enable social proof for venues
   - Build trust with visitors
   - Improve search ranking

2. **Venue Media Upload** 📸 HIGH
   - Photo gallery support
   - Venue dashboard media manager
   - Image optimization

3. **Contact & Lead Generation** 📧 HIGH
   - Contact venue forms
   - Email notifications
   - Lead tracking for venue owners

4. **Advanced Filters** 🔍 HIGH
   - Facility filtering
   - Distance/radius search
   - Equipment filters

5. **Admin Panel** 👨‍💼 HIGH
   - Venue verification workflow
   - Content moderation
   - User management

### Phase 2: Enhancement (3-6 months)
**Goal:** Improve user experience and engagement

6. **Interactive Schedule Builder** 📅 MEDIUM
   - Visual calendar interface
   - Class scheduling
   - Availability display

7. **Pricing & Formulas** 💰 MEDIUM
   - Plan comparison
   - Trial offers
   - Subscription management

8. **Analytics Dashboard** 📊 MEDIUM
   - Profile views
   - Lead tracking
   - Performance metrics

9. **OAuth & Social Login** 🔐 MEDIUM
   - Google Sign-In
   - Facebook Login
   - Streamlined authentication

10. **PWA Features** 📱 MEDIUM
    - Offline support
    - Push notifications
    - Install prompt

### Phase 3: Growth (6-12 months)
**Goal:** Scale platform and add premium features

11. **Premium Subscriptions** 💎 LOW
    - Verified badges
    - Featured listings
    - Payment processing

12. **Mobile Apps** 📱 LOW
    - Native iOS app
    - Native Android app
    - Cross-platform with React Native

13. **Community Features** 👥 LOW
    - User profiles for athletes
    - Training logs
    - Forums and Q&A

14. **Marketing Automation** 📧 LOW
    - Email campaigns
    - Newsletter management
    - Drip campaigns

15. **Advanced SEO** 🚀 LOW
    - Schema.org markup
    - Rich snippets
    - Multi-language optimization

---

## 📝 Notes

### Technical Debt
- Legacy service layer in `server/db/service/` should be migrated to `server/db/queries/`
- Some components need refactoring for better reusability
- Test coverage needs improvement

### Dependencies
- Monitor Nuxt 4 stable release and migration requirements
- Keep Nuxt UI updated for component improvements
- Regular security updates for authentication packages

### Compliance
- GDPR compliance for EU users
- CCPA compliance for California users
- Accessibility (WCAG 2.1 AA standard)

---

## 🤝 Contributing

When implementing new features:

1. Create feature documentation in `docs/features/`
2. Update this overview document
3. Follow the established architecture patterns
4. Add tests for new functionality
5. Update i18n translation files
6. Document API endpoints

---

## 📚 Related Documentation

- [Architecture & Tech Stack](./architecture.md)
- [Database Schema](./database.md)
- [Design System](./design-system.md)
- [Feature Documentation](./features/)
  - [Authentication](./features/authentication.md)
  - [Venue Discovery](./features/venue-discovery.md)
  - [Venue Profiles](./features/venue-profiles.md)
  - [Dashboard Management](./features/dashboard-management.md)
  - [Content & i18n](./features/content-i18n.md)
  - [System Admin](./features/system-admin.md)

---

**Document Version:** 1.0  
**Last Review:** December 17, 2025  
**Next Review:** March 2026

