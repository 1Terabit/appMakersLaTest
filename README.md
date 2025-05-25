# Driver Location System

Real-time transport system with microservices architecture, implementing WebSockets to transmit driver locations to clients. Similar to the driver location functionality in ride-sharing applications like Uber.

## Overview

This project implements a real-time driver location system where clients can subscribe to driver location updates through WebSockets. The system is built using a microservices architecture with NestJS, following the Hexagonal Architecture (Ports & Adapters) pattern and SOLID principles.

## Architecture

The system follows a microservices architecture with four specialized services, implementing the hexagonal architecture pattern (Ports & Adapters).

### Microservices Architecture
The system is composed of four microservices that communicate with each other:

1. **Gateway Service (BFF)** - API Gateway and Backend for Frontend
2. **Auth Service** - Authentication and user management
3. **Location Service** - Driver location updates and storage
4. **Realtime Service** - WebSocket communication for real-time updates

### Communication Patterns
- **HTTP/REST**: Between gateway and other services
- **WebSockets**: For real-time client updates
- **Redis Pub/Sub**: For inter-service messaging and scaling

### Testing Strategy

The project implements a comprehensive testing approach with both unit tests and end-to-end (e2e) tests:

#### Unit Tests
- **Test Coverage**: Core business logic and service methods
- **Mock Approach**: External dependencies (Redis, HTTP clients) are mocked
- **Frameworks**: Jest, ts-jest
- **Command**: `pnpm test` in each service directory

#### End-to-End Tests
- **Test Coverage**: API endpoints, WebSocket communication, service integrations
- **Mock Approach**: External services are mocked to avoid dependencies
- **Service Dependencies**: Isolated with dependency injection for testability
- **Test Data**: Mock data in each test file for predictable test results
- **WebSocket Testing**: Socket.io-client for realtime service tests
- **Command**: `pnpm test:e2e` in each service directory

#### Key Testing Patterns
- **Port/Adapter Pattern**: External dependencies are accessed through interfaces that can be easily mocked
- **Dependency Injection**: All dependencies are injected, making them easy to replace in tests
- **Test Environment**: Separate test environment with its own configuration

**For detailed architecture diagrams and documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md)**

## Technologies

- **Framework**: NestJS (TypeScript-based Node.js framework)
- **WebSockets**: Socket.IO for real-time communication
- **Messaging**: Redis for pub/sub messaging between service instances
- **Documentation**: Swagger/OpenAPI for API documentation
- **Validation**: class-validator for DTO validation
- **Authentication**: JWT (JSON Web Tokens)
- **Package Management**: PNPM for efficient dependency management
- **Containerization**: Docker or Podman and Docker Compose (optional)

## Microservices

### Gateway Service (Port 3000)
- **Role**: API Gateway and Backend for Frontend (BFF)
- **Features**:
  - Routes requests to appropriate microservices
  - Provides unified API for frontend applications
  - Optimized endpoints that combine data from multiple services
  - API documentation with Swagger
- **Key Endpoints**:
  - Authentication proxy endpoints
  - Location management endpoints
  - BFF optimized dashboard endpoints
- **Technologies**: NestJS, Axios for HTTP requests

### Auth Service (Port 3001)
- **Role**: Authentication and driver management
- **Features**:
  - JWT-based authentication
  - Driver profile management
  - Token validation endpoints
  - Secure password handling
- **Key Endpoints**:
  - Login and authentication
  - Token validation
  - Profile management
- **Technologies**: NestJS, JWT, cryptographic functions

### Location Service (Port 3002)
- **Role**: Driver location management
- **Features**:
  - Location updates and storage
  - Online status tracking
  - Location retrieval
  - Redis-based location messaging
- **Key Endpoints**:
  - Update location
  - Retrieve location
  - Check online status
- **Technologies**: NestJS, Redis for messaging

### Realtime Service (Port 3003)
- **Role**: Real-time updates via WebSockets
- **Features**:
  - WebSocket connection management
  - Client subscriptions to driver updates
  - Driver location broadcasting
  - Redis for scaling across instances
- **Key Components**:
  - Client WebSocket Gateway
  - Driver WebSocket Gateway
  - Redis messaging integration
- **Technologies**: NestJS, Socket.IO, Redis

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- Redis server (for messaging between services)
- PNPM package manager (recommended)
- Docker or Podman

## Getting Started

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd appMakersLaTest
   ```

2. Install dependencies in each microservice
   ```bash
   cd auth-service && pnpm install
   cd ../location-service && pnpm install
   cd ../realtime-service && pnpm install
   cd ../gateway-service && pnpm install
   ```

3. Configure environment variables
   - Copy `.env.example` to `.env` in each microservice directory
   - Update the values as needed

## Running the System

You can run the system either locally or using containers. Choose the approach that works best for your environment.

### Option 1: Running with Docker/Podman (Recommended)

This is the recommended approach as it provides a consistent environment and handles all dependencies:

1. Make sure Docker/Podman and Docker Compose are installed on your system

2. Build and start all services using Docker Compose
   ```bash
   # Using Docker
   docker-compose up -d
   
   # Using Podman
   podman-compose up -d
   ```

3. View logs for all services
   ```bash
   docker-compose logs -f
   # or with Podman
   podman-compose logs -f
   ```

4. Stop all services
   ```bash
   docker-compose down
   # or with Podman
   podman-compose down
   ```

### Option 2: Running Locally

If you prefer to run services directly on your host machine:

1. Start Redis server
   ```bash
   redis-server
   ```

2. Start all services (in separate terminals)
   ```bash
   # Terminal 1
   cd auth-service && pnpm start:dev
   
   # Terminal 2
   cd location-service && pnpm start:dev
   
   # Terminal 3
   cd realtime-service && pnpm start:dev
   
   # Terminal 4
   cd gateway-service && pnpm start:dev
   ```

6. Access the API documentation
   - Open http://localhost:3000/api/docs in your browser

## Project Structure

Each microservice follows a similar structure based on hexagonal architecture with comprehensive testing:

```
├── src/
│   ├── domain/            # Core domain entities
│   ├── application/       # Application services and use cases
│   ├── ports/             # Interface definitions
│   │   ├── in/            # Input ports (service interfaces)
│   │   └── out/           # Output ports (repository, messaging interfaces)
│   ├── infrastructure/    # External adapters implementation
│   │   ├── controllers/   # REST controllers
│   │   ├── repositories/  # Data storage implementations
│   │   ├── messaging/     # Messaging implementations
│   │   └── config/        # Configuration
│   └── main.ts            # Application entry point
├── test/                  # Testing directory
│   ├── unit/              # Unit tests
│   │   ├── domain/        # Domain entity tests
│   │   ├── application/   # Service and use case tests
│   │   └── infrastructure/ # Adapter tests
│   ├── e2e/               # End-to-end tests
│   └── jest-e2e.json      # E2E Jest configuration
├── jest.config.js         # Jest configuration for unit tests
├── .env.example           # Example environment variables
└── README.md              # Service documentation
```

### realtime-service (Port 3003)
- Manages WebSocket connections for clients and drivers
- Sends location updates every 5 seconds if driver is online
- Handles offline drivers with appropriate error messages
- Uses Redis for inter-service communication

### gateway-service (Port 3000)
- Routes requests to appropriate microservices
- Provides Swagger documentation
- Acts as the single entry point for client applications

## Technologies

- **NestJS** (TypeScript): Backend framework
- **Socket.IO v4**: WebSockets implementation
- **Redis**: Pub/Sub for real-time messaging between instances
- **Docker/Podman**: Containerization
- **Docker Compose**: Service orchestration
- **PNPM**: Package management
- **Swagger**: API documentation

## Architecture

The system uses a Hexagonal Architecture (Ports & Adapters) pattern:

- **Domain**: Core business entities and rules
- **Ports**: Interfaces defining inputs/outputs
- **Application**: Use cases and business logic
- **Infrastructure**: External adapters and implementations

Multiple instances can communicate through Redis Pub/Sub, making the system horizontally scalable.

## API Documentation

Swagger documentation is available at:

- Gateway API: http://localhost:3000/api
- Auth Service API: http://localhost:3001/api
- Location Service API: http://localhost:3002/api

## WebSocket Endpoints

- Client WebSocket: ws://localhost:3003/client
  - Event: `subscribe-driver` - Subscribe to driver updates
  - Event: `driver-update` - Receive driver location updates
  - Event: `driver-offline` - Receive offline driver notifications

- Driver WebSocket: ws://localhost:3003/driver
  - Event: `update-location` - Send location updates
  - Event: `authenticate` - Authenticate with token

## Security

- JWT tokens expire after 5 minutes
- All sensitive endpoints require token validation
- WebSocket connections verify token validity
- Simulated in-memory storage for development (can be replaced with real databases)

## Scalability

The system is designed to be horizontally scalable:

- Redis Pub/Sub allows communication between multiple instances
- Stateless services can be deployed across multiple nodes
- Load balancing can be implemented at the gateway level
