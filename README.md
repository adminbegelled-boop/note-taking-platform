# Note-Taking Platform with Role-Based Access Control & MongoDB Optimization

A full-stack REST API and functional React frontend built with Express.js, MongoDB (Mongoose), JWT authentication, and bcrypt password hashing.

---

## 1. Application Overview & Roles

### Roles & Permissions:
- **User**:
  - Can create, update, delete, and view a paginated list of their own notes.
  - Can view their profile (`/api/auth/me`).
  - Can view and create public posts.
  - Can view Scenario 1 (users grouped by interests) and Scenario 2 (user posts with `$lookup`).
- **Admin**:
  - Inherits all User capabilities.
  - Can view everyone's notes across the platform with pagination (`/api/notes/all`).
  - Can manage users: create, update, delete, and view all users with pagination (`/api/users`).

---

## 2. Database Indexing Strategy (Strictly Optimized)

All indexes are defined explicitly using the `schema.index()` method in the Mongoose models as required by review guidelines. In accordance with the **Critical Constraint** (*"DO NOT MAKE ANY UNNECESSARY INDEXES"*), only indexes that directly support query filters, sorts, or aggregation lookups are created:

### A. User Model (`backend/models/User.js`)
1. **`userSchema.index({ email: 1 }, { unique: true })`**
   - **Supported Operation:** `User.findOne({ email })` during user authentication (login/registration check) and enforces email uniqueness constraint.
2. **`userSchema.index({ createdAt: -1 })`**
   - **Supported Operation:** Admin paginated list of all users sorted by newest first: `User.find().sort({ createdAt: -1 }).skip(skip).limit(limit)`. Avoids expensive in-memory sort.
3. **`userSchema.index({ interests: 1 })`**
   - **Supported Operation:** Multikey index supporting **Scenario 1** aggregation and profile interest filtering.

*(Note: MongoDB automatically indexes `_id: 1` as the primary key, supporting `User.findById()` profile and admin read operations.)*

### B. Note Model (`backend/models/Note.js`)
1. **`noteSchema.index({ owner: 1, createdAt: -1 })`**
   - **Supported Operation:** Regular user listing their own notes with pagination and newest-first sorting: `Note.find({ owner: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit)`. Follows the Equality-Sort-Range (ESR) rule, avoiding in-memory sort.
2. **`noteSchema.index({ createdAt: -1 })`**
   - **Supported Operation:** Admin listing all notes across all users with pagination and newest-first sorting: `Note.find().sort({ createdAt: -1 }).skip(skip).limit(limit)`.
3. **Read Operation (`GET /api/notes/:id`):**
   - Supported by default primary key index on `_id` and verified against ownership.

### C. Post Model (`backend/models/Post.js`)
1. **`postSchema.index({ author: 1, createdAt: -1 })`**
   - **Supported Operation:**
     - **Scenario 2:** `$lookup` stage matching `foreignField: 'author'`. Without an index on `author`, MongoDB would perform a full collection scan on Posts during `$lookup`.
     - Filtering/fetching a user's posts sorted by date: `Post.find({ author: userId }).sort({ createdAt: -1 })`.
2. **`postSchema.index({ createdAt: -1 })`**
   - **Supported Operation:** Public paginated listing of all posts sorted newest first: `Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit)`.

---

## 3. MongoDB Aggregation Tasks

### Scenario 1: Group Users by Interests
- **Requirement:** User profiles contain an array of interests (e.g. `['chess', 'reading']`). View users grouped by interest using **exactly one `collection.aggregate()` call**.
- **Endpoint:** `GET /api/aggregations/group-by-interests`
- **Pipeline Implementation:**
  ```javascript
  User.aggregate([
    // 1. Deconstruct the interests array (one doc per interest)
    { $unwind: '$interests' },
    // 2. Group by each distinct interest and collect users
    {
      $group: {
        _id: '$interests',
        count: { $sum: 1 },
        users: {
          $push: {
            _id: '$_id',
            name: '$name',
            email: '$email',
            role: '$role'
          }
        }
      }
    },
    // 3. Sort alphabetically by interest name
    { $sort: { _id: 1 } },
    // 4. Project clean output schema
    {
      $project: {
        _id: 0,
        interest: '$_id',
        count: 1,
        users: 1
      }
    }
  ]);
  ```

### Scenario 2: User Posts ($lookup)
- **Requirement:** Retrieve all posts belonging to a particular user using a **single aggregation pipeline with a `$lookup` stage**.
- **Endpoint:** `GET /api/aggregations/user-posts/:userId`
- **Pipeline Implementation:**
  ```javascript
  User.aggregate([
    // 1. Match the specific user by _id (uses primary key index on User)
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    // 2. Join Posts collection (uses { author: 1, createdAt: -1 } index on Posts)
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'author',
        as: 'posts',
        pipeline: [
          { $sort: { createdAt: -1 } },
          { $project: { _id: 1, title: 1, body: 1, createdAt: 1 } }
        ]
      }
    },
    // 3. Project user details and their matched posts
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        role: 1,
        interests: 1,
        posts: 1,
        postCount: { $size: '$posts' }
      }
    }
  ]);
  ```

---

## 4. API Endpoints Reference

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new user or admin |
| POST | `/api/auth/login` | Public | Login with email and password |
| GET | `/api/auth/me` | User/Admin | Get current authenticated user profile |
| GET | `/api/notes?page=1&limit=10` | User/Admin | List own notes (paginated) |
| GET | `/api/notes/all?page=1&limit=10` | Admin Only | List all notes across system (paginated) |
| GET | `/api/notes/:id` | Owner/Admin | Fetch specific note by ID |
| POST | `/api/notes` | User/Admin | Create a new note |
| PUT | `/api/notes/:id` | Owner | Update own note |
| DELETE | `/api/notes/:id` | Owner/Admin | Delete note |
| GET | `/api/users?page=1&limit=10` | Admin Only | List all users (paginated) |
| GET | `/api/users/:id` | Admin Only | Get single user by ID |
| POST | `/api/users` | Admin Only | Admin creates a user |
| PUT | `/api/users/:id` | Admin Only | Admin updates a user |
| DELETE | `/api/users/:id` | Admin Only | Admin deletes a user |
| GET | `/api/posts?page=1&limit=10` | Public | List all public posts (paginated) |
| POST | `/api/posts` | User/Admin | Create a public post |
| DELETE | `/api/posts/:id` | Author | Delete own post |
| GET | `/api/aggregations/group-by-interests` | User/Admin | **Scenario 1:** Group users by interests |
| GET | `/api/aggregations/user-posts/:userId` | Public | **Scenario 2:** User posts with `$lookup` |

---

## 5. Quick Start Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB daemon (optional: `server.js` automatically starts an embedded in-memory MongoDB instance if local MongoDB is not running).

### Running the Backend:
```bash
cd backend
npm install
npm start
```
*Server runs on `http://localhost:5000`.*

### Running the Backend Verification Test Suite:
```bash
cd backend
node test-api.js
```
*Tests verify all schema indexes, Scenario 1 aggregation, Scenario 2 `$lookup` aggregation, and pagination.*

### Running the Frontend:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

### Pre-seeded Demo Credentials:
- **Admin:** `admin@example.com` / `Password123!`
- **User Alice:** `alice@example.com` / `Password123!`
- **User Bob:** `bob@example.com` / `Password123!`

