-- TIMORA PostgreSQL Database Schema

-- Enable UUID extension if needed, though we will use standard SERIAL IDs for simplicity
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (clean setup)
DROP TABLE IF EXISTS "Trips" CASCADE;
DROP TABLE IF EXISTS "WeightLogs" CASCADE;
DROP TABLE IF EXISTS "Investments" CASCADE;
DROP TABLE IF EXISTS "Invoices" CASCADE;
DROP TABLE IF EXISTS "Shopping" CASCADE;
DROP TABLE IF EXISTS "Expenses" CASCADE;
DROP TABLE IF EXISTS "Income" CASCADE;
DROP TABLE IF EXISTS "Users" CASCADE;

-- 1. Users Table
CREATE TABLE "Users" (
    "id" SERIAL PRIMARY KEY,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index on email for fast login lookup
CREATE INDEX idx_users_email ON "Users"("email");

-- 2. Income Table
CREATE TABLE "Income" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INT REFERENCES "Users"("id") ON DELETE CASCADE,
    "amount" NUMERIC(12, 2) NOT NULL CHECK ("amount" > 0),
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_income_user_date ON "Income"("user_id", "date");

-- 3. Expenses Table
CREATE TABLE "Expenses" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INT REFERENCES "Users"("id") ON DELETE CASCADE,
    "amount" NUMERIC(12, 2) NOT NULL CHECK ("amount" > 0),
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_user_date ON "Expenses"("user_id", "date");

-- 4. Shopping Table
CREATE TABLE "Shopping" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INT REFERENCES "Users"("id") ON DELETE CASCADE,
    "item_name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "price" NUMERIC(12, 2) NOT NULL CHECK ("price" >= 0),
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shopping_user_date ON "Shopping"("user_id", "date");

-- 5. Invoices Table
CREATE TABLE "Invoices" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INT REFERENCES "Users"("id") ON DELETE CASCADE,
    "shopping_id" INT REFERENCES "Shopping"("id") ON DELETE SET NULL,
    "filename" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(512) NOT NULL,
    "file_type" VARCHAR(100) NOT NULL,
    "uploaded_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_shopping ON "Invoices"("shopping_id");

-- 6. Investments Table
CREATE TABLE "Investments" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INT REFERENCES "Users"("id") ON DELETE CASCADE,
    "type" VARCHAR(50) NOT NULL CHECK ("type" IN ('Mutual Fund', 'Stock')),
    "name" VARCHAR(255) NOT NULL,
    "symbol" VARCHAR(50),
    "units" NUMERIC(16, 4) NOT NULL CHECK ("units" > 0),
    "purchase_price" NUMERIC(12, 2) NOT NULL CHECK ("purchase_price" >= 0),
    "current_price" NUMERIC(12, 2) NOT NULL CHECK ("current_price" >= 0),
    "purchase_date" DATE,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_investments_user ON "Investments"("user_id");

-- 7. WeightLogs Table
CREATE TABLE "WeightLogs" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INT REFERENCES "Users"("id") ON DELETE CASCADE,
    "weight" NUMERIC(5, 2) NOT NULL CHECK ("weight" > 0),
    "date" DATE NOT NULL,
    "note" TEXT,
    "goal_weight" NUMERIC(5, 2) CHECK ("goal_weight" > 0),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_weight_user_date ON "WeightLogs"("user_id", "date");

-- 8. Trips Table
CREATE TABLE "Trips" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INT REFERENCES "Users"("id") ON DELETE CASCADE,
    "location" VARCHAR(255) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL CHECK ("end_date" >= "start_date"),
    "notes" TEXT,
    "documents" JSONB DEFAULT '[]'::jsonb, -- JSON array of file objects: [{filename, file_path}]
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trips_user_dates ON "Trips"("user_id", "start_date");
