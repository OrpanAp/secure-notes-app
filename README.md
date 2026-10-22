# Secure Note-Taking Application

A backend-first REST API built with Node.js, Express, MongoDB, and Mongoose.

## Features
- User registration and login
- Password hashing with bcrypt
- JWT authentication
- Role-based access control (`user` and `admin`)
- Private note CRUD with ownership enforcement
- Paginated user and administrator listings
- Explicit MongoDB indexes
- Interest-based user aggregation
- `$lookup` aggregation for retrieving a user's posts
- Helmet, CORS, and rate limiting
- Automated tests using Jest and Supertest

## Technology Stack
- Node.js and Express 5
- MongoDB and Mongoose
- bcryptjs and JSON Web Tokens
- Jest and Supertest

## Installation

Install dependencies:

```bash
npm install
```

Configure your `.env` file using `.env.example`. Set your MongoDB connection string and a strong, private JWT secret. Never commit `.env`.

Start the development server:

```bash
npm run dev
```

The default API address is `http://localhost:4000`.

## API Endpoints

### Health
- `GET /api/health`

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Notes
All note endpoints require authentication.
- `GET /api/notes?page=1&limit=10`
- `POST /api/notes`
- `GET /api/notes/:id`
- `PATCH /api/notes/:id`
- `DELETE /api/notes/:id`

Users can access and modify only their own notes.

### Administrator
All administrator endpoints require the `admin` role.
- `GET /api/admin/users?page=1&limit=10`
- `GET /api/admin/notes?page=1&limit=10`
- `GET /api/admin/analytics/interests`
- `GET /api/admin/users/:id/posts`

Public registration cannot assign administrator privileges. Use the controlled admin-promotion script for authorized setup.

## Database Indexes
- Unique user email
- User creation-date pagination
- Notes by owner and creation date
- Global note pagination
- Posts by author and creation date

MongoDB automatically creates an index for `_id`.

## Aggregation Requirements
- User interest analytics uses one `User.aggregate()` call.
- User post retrieval uses a `$lookup` aggregation pipeline.

## Tests

Run automated tests:

```bash
npm test
```

## Project Structure

The backend contains configuration, controllers, middleware, models, routes, scripts, utilities, and tests. The `frontend/` directory exists, but a frontend interface and full Post CRUD endpoints are not yet implemented.

## Security Notes
- Never commit `.env` or expose credentials.
- Use a strong, unique JWT secret in production.
- Use HTTPS in production.
- Configure CORS explicitly for deployed environments.
- Keep dependencies updated.