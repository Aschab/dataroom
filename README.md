# Dataroom Application

A secure, modern dataroom application for managing, sharing, and controlling access to sensitive documents. Built as a single-page application with URL-based navigation, real-time search, and intuitive file management.

## Features

### Document Management

- **PDF Upload & Storage**: Drag-and-drop or click to upload PDF files
- **Folder Organization**: Create hierarchical folder structures to organize documents
- **File Preview**: Built-in PDF viewer for quick document review
- **File Operations**: Rename, download, and delete files (owner permissions required)
- **Global Unique Names**: Files and folders must have unique names across the entire system

### Navigation & Search

- **URL-Based Navigation**: Bookmarkable URLs for folders (`/folder/{id}`) and searches (`/search?q=query`)
- **Browser History Support**: Back/forward buttons work seamlessly with folder navigation
- **Real-time Search**: Search files and folders as you type with instant results
- **Breadcrumb Navigation**: Clear visual hierarchy showing your current location

### User Interface

- **Responsive Design**: Mobile-first design that works on all screen sizes
- **Table View**: Clean table layout with sortable columns (Name, Owner, Last Modified, File Size, Options)
- **Context Menus**: Right-click on files/folders for quick actions
- **Smart Column Display**: Automatically hides less critical columns on smaller screens
- **Text Truncation**: Long file/folder names display with ellipsis to prevent overflow

### Access Control

- **Simple Authentication**: Email-based registration and login (no password on first iteration)
- **Public Viewing**: Anyone can view, search, and download files
- **Owner Permissions**: Only file/folder owners can rename or delete their content
- **Folder-Based Access**: Upload files only to folders you own
- **Filter Toggle**: "My files only" checkbox on home page to show personal content

## Quick Start

### Prerequisites

- **With Docker**: Docker and Docker Compose installed
- **Without Docker**:
  - Python 3.11+
  - Node.js 20+
  - npm

### Running with Docker

1. Start the application:

```bash
docker-compose up --build
```

2. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5001

### Running without Docker

#### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

The backend will run on http://localhost:5001

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on http://localhost:5173

## Technology Stack

### Frontend

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6 with URL-based navigation
- **HTTP Client**: Axios
- **UI Library**: Shadcn UI components
- **Styling**: TailwindCSS
- **State Management**: React Context API

### Backend

- **Framework**: Flask 3.x
- **Language**: Python 3.11+
- **ORM**: SQLAlchemy
- **Database**: SQLite
- **Authentication**: JWT tokens
- **CORS**: Flask-CORS
- **File Storage**: Local filesystem with date-based organization (`/storage/YYYY/MM/DD/`)

### DevOps

- Docker + Docker Compose
- Environment-based configuration
- Hot reload in development mode

## Project Structure

```
dataroom/
├── backend/
│   ├── app/
│   │   ├── models/          # Database models
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helper functions
│   │   └── config.py        # Configuration
│   ├── storage/             # File storage (gitignored)
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── api/            # API client modules
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utilities and context
│   │   └── types/          # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Folders

- `GET /api/folders` - List root folders
- `GET /api/folders/:id` - Get folder contents
- `POST /api/folders` - Create folder
- `PUT /api/folders/:id` - Rename folder
- `DELETE /api/folders/:id` - Delete folder (cascade)

### Files

- `POST /api/files` - Upload file
- `GET /api/files/:id` - Get file metadata
- `GET /api/files/:id/download` - Download file
- `GET /api/files/:id/preview` - Preview file
- `PUT /api/files/:id` - Rename file
- `DELETE /api/files/:id` - Delete file

### Search

- `GET /api/search?q=query` - Search files and folders

## Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
FLASK_ENV=development
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
DATABASE_URL=sqlite:///dataroom.db
FRONTEND_URL=http://localhost:5173
FILE_STORAGE_PATH=./storage
MAX_FILE_SIZE_MB=100
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:5001/api
```

## Key Design Decisions

### Security

- All modification endpoints require JWT authentication
- File paths use UUID-based naming to prevent path traversal
- Input validation on all user-submitted data
- CORS configured for frontend origin only
- SQL injection prevention via SQLAlchemy ORM

### Performance

- Absolute file paths prevent path resolution issues
- Debounced search (300ms) reduces API calls
- Optimistic UI updates for better perceived performance
- Table layout with fixed column widths for consistent rendering

### User Experience

- URL-based navigation enables bookmarking and sharing
- Right-click context menus provide quick access to actions
- Responsive design adapts to mobile, tablet, and desktop
- Visual feedback on hover and interactions
- Drag-and-drop file upload for convenience

## Scaling Considerations

### Database

- SQLite was chosen for rapid development
- Migration to PostgreSQL is straightforward via SQLAlchemy
- Add read replicas for GET operations
- Implement connection pooling (PgBouncer) for improved latency

### Storage

- Move to S3 or similar object storage
- Use key structure: `{user_id}/{year}/{month}/{file_id}`
- Implement multipart uploads/downloads for large files
- Consider separate upload/download microservices
- Add CDN for static file delivery

### Caching

- Redis for search results and file metadata
- Cache folder structures and breadcrumbs
- Implement cache invalidation on updates

### Infrastructure

- Load balancers for backend API servers
- Separate services for file processing
- Message queue for async operations (file processing, notifications)
- Monitoring and logging (Prometheus, Grafana, ELK stack)

### Application

- Implement pagination for large folder listings (currently 100 item limit)
- Add file versioning
- Implement sharing permissions and access tokens
- Support additional file types beyond PDF
