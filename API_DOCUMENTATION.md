# Backend Smart - API Documentation

## Overview
This is a comprehensive backend system for knowledge base management with query submission, solution workflow, and user management features.

## Setup

### Environment Variables
Create a `.env` file with the following variables:
```
NODE_ENV=development
PORT=3000
MONGODB_URL=mongodb://localhost:27017/backend_smart
JWT_SECRET=your-super-secret-jwt-key-here
REFRESH_JWT_SECRET=your-super-secret-refresh-jwt-key-here
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=30
```

### Installation
```bash
npm install
npm run dev
```

## API Endpoints

### Authentication Routes (`/api/users`)

#### POST `/api/users/register`
Register a new user

#### POST `/api/users/login`
Login user

#### POST `/api/users/refresh-tokens`
Refresh access token

### User Management Routes (Protected)

#### GET `/api/users/profile`
Get current user profile

#### PATCH `/api/users/profile`
Update user profile

#### PATCH `/api/users/change-password`
Change password

#### GET `/api/users` (Admin/Manager only)
Get all users with pagination and filters

#### GET `/api/users/stats` (Admin/Manager only)
Get user statistics

#### POST `/api/users` (Admin only)
Create a new user

#### PATCH `/api/users/:id` (Admin/Manager only)
Update user by ID

#### DELETE `/api/users/:id` (Admin only)
Delete user by ID

### Query Routes (`/api/queries`)

#### POST `/api/queries`
Submit a new query

#### GET `/api/queries`
Get all queries with pagination and filters

#### GET `/api/queries/:id`
Get query by ID

#### PATCH `/api/queries/:id`
Update query

#### DELETE `/api/queries/:id`
Delete query

#### POST `/api/queries/:id/answers` (Manager/Admin only)
Add answer to query

#### POST `/api/queries/:id/solution` (Manager/Admin only)
Provide solution to query

#### PATCH `/api/queries/:id/review` (Admin only)
Review and approve/reject solution

#### POST `/api/queries/:id/publish` (Admin only)
Publish approved query to knowledge base

#### POST `/api/queries/:id/comments`
Add comment to query

### Knowledge Base Routes (`/api/knowledge-base`)

#### GET `/api/knowledge-base/search` (Public)
Search knowledge base

#### POST `/api/knowledge-base` (Admin/Manager only)
Create knowledge base entry

#### GET `/api/knowledge-base`
Get all knowledge base entries

#### GET `/api/knowledge-base/:id`
Get knowledge base entry by ID

#### PATCH `/api/knowledge-base/:id` (Admin/Manager only)
Update knowledge base entry

#### DELETE `/api/knowledge-base/:id` (Admin only)
Delete knowledge base entry

#### POST `/api/knowledge-base/:id/rate`
Rate knowledge base entry



## User Roles

- **admin**: Full access to all operations
- **manager**: Can manage queries, provide solutions, manage knowledge base
- **sales_executive**: Can submit queries, view knowledge base, manage own profile

## Organizations

- KHUSHII
- JWP  
- ANIMAL CARE
- GREEN EARTH
- EDUCATION FIRST

## Query Workflow

1. **Submit** - Sales executive submits query
2. **Review** - Manager reviews and provides answers/solution
3. **Admin Review** - Admin reviews and approves/rejects solution
4. **Publish** - Approved solutions can be published to knowledge base

## Query Status Flow

`new` → `assigned` → `under_discussion` → `solution_provided` → `approved`/`rejected` → `published`

## Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Health Check

#### GET `/health`
Check if server is running 