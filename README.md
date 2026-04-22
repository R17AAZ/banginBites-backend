<div align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
</div>

# 🚀 template-sql

**The Ultimate Enterprise-Grade Backend Architecture for High-Performance SQL Applications.**

Welcome to **template-sql**, a battle-tested Boilerplate meticulously designed for developers who demand scalability, security, and developer experience. Built on **Node.js**, **Express**, and **Prisma 7**, this template offers a robust foundation for modern web applications, moving from "Zero to Production" with confidence.

---

## 🏛️ Architecture & Philosophy

The core philosophy of this project is **Performance Isolation** and **Domain-Driven Design (DDD)**. We tackle the common pitfalls of monolithic Node.js applications by decoupling heavy operations and leveraging specialized services.

-   **Domain-Driven Modules**: Everything is grouped by business logic (User, Auth, Payment) rather than technical type, ensuring maintainability as the codebase grows.
-   **Prisma 7 & PostgreSQL**: Harness the power of a modern Type-safe ORM and a dependable relational database for complex data integrity.
-   **Redis Backbone**: Used for high-speed caching, distributed background tasks (BullMQ), and scaling Socket.IO across multiple instances.
-   **RustFS Integration**: Offload heavy binary management to a dedicated, high-performance S3-compatible service, keeping your API stateless and responsive.

---

## ✨ Key Features

### 🛡️ Hardened Security
-   **Hybrid JWT Strategy**: Combines short-lived access tokens with rotatable, persistent refresh tokens.
-   **Lockout Protection**: Automatic account restriction after failed login attempts, managed via Redis.
-   **Zod Validation**: Strict schema validation for every request, ensuring no malformed data reaches your controllers.
-   **Helmet & Rate Limiting**: Production-ready security headers and DDoS protection.

### 📡 Scalable Real-Time & Background Processing
-   **Socket.IO with Redis**: Unified real-time communication that scales horizontally across clusters.
-   **BullMQ Background Tasks**: Dedicated queue system for maintenance jobs and asynchronous processing.
-   **Automated Maintenance**: Pre-configured crons for daily user purges and weekly cache refreshes.

### 🖼️ Advanced Media Handling
-   **Sharp Optimization**: Automatic image resizing and optimization on-the-fly.
-   **Multi-Cloud Storage**: Seamless support for local, Cloudinary, and high-speed RustFS storage.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js (TypeScript) |
| **Framework** | Express.js |
| **Database** | PostgreSQL |
| **ORM** | Prisma 7 |
| **Caching/Queue** | Redis (BullMQ) |
| **Security** | JWT, bcrypt, Zod, Helmet |
| **Real-time** | Socket.IO |
| **Media** | Sharp, RustFS (S3), Cloudinary |
| **Logging** | Winston & Morgan |

---

## 🚀 Getting Started

### Prerequisites
-   **Node.js** (v18+)
-   **Docker** & **Docker Compose**
-   **PostgreSQL** (if running locally without Docker)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Asaduzzama-n/template-sql.git
    cd template-sql
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env` file based on `.example.env` and fill in your credentials.
    ```bash
    cp .example.env .env
    ```

4.  **Database Migration**:
    Initialize your PostgreSQL database using Prisma.
    ```bash
    npx prisma migrate dev
    npx prisma generate
    ```

5.  **Run Dev Server**:
    ```bash
    npm run dev
    ```

---

## 📦 Project Structure

```text
src/
├── app/
│   ├── middleware/        # Global security & validation logic
│   ├── modules/           # Business Domains (User, Auth, etc.)
│   │   ├── auth/          # Authentication & JWT management
│   │   ├── user/          # Profile & User metrics
│   │   └── maintenance/   # Background jobs & Crons
│   └── routes/            # Main API routing
├── config/                # Environment-specific configuration
├── sdk/                   # 🔌 Shared Native Fetch SDK for Frontend clients
├── shared/                # Utilities, Logger, and Prisma Client
├── helpers/               # Socket, Email, and File helpers
└── server.ts              # Entry point
```

---

## 🔌 Frontend Integration (SDK)

This project includes a built-in, zero-dependency **Native Fetch SDK** located in `src/sdk`. This ensures 100% type safety and painless integration for both your Mobile (React Native) and Desktop (Next.js/React) teams. 

**👉 See the full integration guide: [SDK Documentation](./SDK_DOCUMENTATION.md)**

---

## 🐳 Docker Deployment

This project utilizes a **multi-stage build** for minimal production image size and maximum security.

**Launch the full stack (App, Postgre, Redis):**
```bash
docker-compose up --build -d
```

---

## 🤝 Contributing
Contributions are welcome! If you find a bug or have a suggestion, please open an issue or submit a pull request.

**Maintainer**: [Asaduzzaman](https://github.com/Asaduzzama-n)  
**License**: MIT