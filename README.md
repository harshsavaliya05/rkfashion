# RK Fashion — Male Fashion E-Commerce Platform

A full-stack e-commerce platform for men's fashion, built with **Angular** (frontend) and **Express + Prisma** (backend).

## 📁 Project Structure

```
malefashion-master/
├── backend/                # Express.js API server
│   ├── src/                # Source code
│   ├── prisma/             # Database schema & seeds
│   └── .env.example        # Environment variable template
├── frontend/
│   ├── admin-side/         # Angular admin dashboard (port 4200)
│   └── client-side/        # Angular customer storefront (port 4300)
└── README.md
```

## 🛠️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | Angular 21/22, Angular Material, SCSS |
| Backend    | Express.js 5, TypeScript            |
| Database   | PostgreSQL + Prisma ORM             |
| Auth       | JWT + bcryptjs                      |
| Email      | Nodemailer (SMTP)                   |
| AI         | Google Gemini API                   |
| Real-time  | Socket.IO                           |
| File Upload| Multer + Sharp                      |

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+ recommended)
- **PostgreSQL** (running locally or remote)
- **npm** (comes with Node.js)

### 1. Clone the Repository

```bash
git clone https://github.com/harshsavaliya05/rkfashion.git
cd rkfashion
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create your environment file from the template
cp .env.example .env
# Edit .env with your database URL, SMTP credentials, and API keys

# Generate Prisma client & run migrations
npx prisma generate
npx prisma db push

# (Optional) Seed the database
npx ts-node prisma/seed.ts

# Start the dev server
npm run dev
```

### 3. Admin Dashboard Setup

```bash
cd frontend/admin-side
npm install
npm start
# Runs on http://localhost:4200
```

### 4. Client Storefront Setup

```bash
cd frontend/client-side
npm install
npm start
# Runs on http://localhost:4300
```

## 🔐 Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values:

| Variable         | Description                              |
|------------------|------------------------------------------|
| `DATABASE_URL`   | PostgreSQL connection string             |
| `SMTP_HOST`      | SMTP server hostname                     |
| `SMTP_PORT`      | SMTP server port (587 for TLS)           |
| `SMTP_USER`      | SMTP email address                       |
| `SMTP_PASS`      | SMTP app password                        |
| `SMTP_FROM`      | Sender email address                     |
| `SMTP_FROM_NAME` | Sender display name                      |
| `GEMINI_API_KEY`  | Google Gemini API key                   |

## 📜 Available Scripts

### Backend
| Command         | Description                |
|-----------------|----------------------------|
| `npm run dev`   | Start with hot reload      |
| `npm run build` | Compile TypeScript         |
| `npm start`     | Run production build       |

### Frontend (Admin & Client)
| Command         | Description                |
|-----------------|----------------------------|
| `npm start`     | Start Angular dev server   |
| `npm run build` | Production build           |
| `npm test`      | Run unit tests             |

## 📄 License

ISC
