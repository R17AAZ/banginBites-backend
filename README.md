<div align="center">
  <img src="https://img.shields.io/badge/Bangin%20Bites-Backend-FF4500?style=for-the-badge&logo=fastapi&logoColor=white" alt="Bangin Bites" />
  <br />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white" alt="Stripe" />
</div>

# 🍕 Bangin Bites - Enterprise Marketplace Backend

**The robust, scalable, and high-performance core of the Bangin Bites food marketplace ecosystem.**

Bangin Bites is a modern marketplace platform designed to bridge the gap between passionate food creators (Sellers) and hungry foodies (Buyers). This backend provides a battle-tested architecture that handles everything from real-time order tracking to secure financial transactions.

---

## 🏛️ Architecture & Philosophy

The project follows a **Modular Monolith** architecture with **Domain-Driven Design (DDD)** principles. It is built for developers who prioritize type safety, scalability, and ease of maintenance.

- **Modular Design**: Business logic is encapsulated in independent modules (User, Dish, Order, etc.), making the codebase easy to navigate and scale.
- **Type-Safe Core**: Leveraging **TypeScript** and **Prisma 7** for end-to-end type safety from the database to the API response.
- **Asynchronous Backbone**: Powered by **Redis** and **BullMQ** for reliable background job processing and horizontal scaling.
- **Real-Time Synergy**: Integrated **Socket.IO** with Redis adapter for instantaneous notifications and order updates.

---

## ✨ Key Features

### 🛒 Marketplace Engine
- **Sellers & Dishes**: Complete lifecycle management for food creators, including dish catalogs, pricing, and availability.
- **Discovery**: Categorized food items with rich metadata (preparation time, ingredients, hygiene info).
- **Favorites**: Personalized wishlists for users to track their favorite bites.

### 📦 Order & Logistics
- **State-of-the-Art Tracking**: Real-time order lifecycle management (Pending → Preparing → Delivered).
- **Secure Handoff**: Delivery OTP verification system to ensure food reaches the right person.
- **Platform Integrity**: Built-in platform fees and automated seller amount calculations.

### 💳 Payments & Security
- **Hybrid Payments**: Support for secure **Stripe** online transactions and Cash on Delivery (COD).
- **Hardened Auth**: JWT-based authentication with refresh token rotation and social login support (Google/Apple).
- **Zero-Trust Validation**: Strict request validation using **Zod** and advanced rate limiting for DDoS protection.

### 🔔 Communication & Analytics
- **Multi-Channel Notifications**: Real-time alerts via **Socket.IO** and push notifications via **Firebase (FCM)**.
- **Feedback Loop**: Comprehensive review and rating system for both dishes and sellers.
- **Data Insights**: Built-in analytics module to track platform growth and user behavior.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js (TypeScript) |
| **Framework** | Express.js |
| **Database** | PostgreSQL |
| **ORM** | Prisma 7 |
| **Caching/Queue** | Redis (BullMQ) |
| **Security** | JWT, Zod, Helmet, Bcrypt |
| **Payments** | Stripe |
| **Real-time** | Socket.IO |
| **Notifications** | Firebase (FCM), Twilio (SMS) |
| **Media** | Sharp, AWS S3 / Cloudinary |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **PostgreSQL**
- **Redis**
- **Docker** (Optional, for containerized deployment)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd banginBites-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env` file from the example and fill in your credentials.
   ```bash
   cp .example.env .env
   ```

4. **Initialize Database**:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   npx prisma db seed
   ```

5. **Run Development Server**:
   ```bash
   npm run dev
   ```

---

## 📦 Project Structure

```text
src/
├── app/
│   ├── middleware/        # Global security, validation & error handling
│   └── modules/           # Business Domains (The Heart of the App)
│       ├── auth/          # Authentication & Social Login
│       ├── dish/          # Product/Dish management
│       ├── order/         # Order lifecycle logic
│       ├── payment/       # Stripe & Payment integration
│       └── ...            # Other business modules
├── config/                # Environment & App configuration
├── helpers/               # Socket, Email, Firebase, and S3 helpers
├── sdk/                   # 🔌 Shared Native Fetch SDK for Frontend clients
├── shared/                # Shared utilities & Prisma client
└── server.ts              # Application entry point
```

---

## 🔌 Frontend Integration (SDK)

To ensure 100% type safety and seamless integration with your Next.js or React Native apps, use the built-in **Native Fetch SDK**.

**👉 See the [SDK Documentation](./SDK_DOCUMENTATION.md) for integration details.**

---

## 🐳 Docker Deployment

The project includes a production-ready `Dockerfile` and `docker-compose.yml` for easy deployment.

```bash
docker-compose up --build -d
```

---

## 🤝 Contributing & License

Created and maintained by the Bangin Bites team.

**License**: ISC
stion, please open an issue or submit a pull request.

**Maintainer**: [Asaduzzaman](https://github.com/Asaduzzama-n)  
**License**: MIT