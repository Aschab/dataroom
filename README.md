# Dataroom Application

Dataroom application for managing, sharing, and controlling access to sensitive documents.

## Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed

### Running the Application

1. Start the application:

```bash
docker-compose up --build
```

2. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

### Development (without Docker)

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Technology Stack

### Frontend

- React 18 + TypeScript
- Vite
- React Router
- Axios
- TailwindCSS

### Backend

- Flask 3
- SQLAlchemy
- SQLite
- JWT Authentication

### DevOps

- Docker + Docker Compose

## Authentication

Simple email-based authentication:

- **Register**: Provide email and password

## Access Control

- **Public**: Anyone can view and download files
- **Authenticated**: Users can upload, create folders, edit/delete their own content
- **Admin**: Full CRUD access to all users, files, and folders

### TODOs to scale.

- SQLite was chosen for a speedy development. If this were to expand moving to Postgresql should be trivial.
- Adding read replicas for the GET commands
- Connection pooling (PgBouncer) per session to improve latency
- Storage on s3, we could use something like {user_id}/{year}/{month}/{file_id} as keys
- Multipart downloads
- Separate upload/download service
- If we really want to scale horizontally kubernetes should be implemented
- Redis caching for search and files metadata
- Db sharding each XX users. I have used 100k in the past, but this should be calculated on current usage
