# Driver Location System

Real-time transport system with microservices architecture, implementing WebSockets to transmit driver locations to clients.

## Overview

This project implements a real-time driver location system similar to Uber, where clients can subscribe to driver location updates through WebSockets. The system is built using a microservices architecture with NestJS, following the Hexagonal Architecture (Ports & Adapters) pattern and SOLID principles.

## Microservices

### auth-service (Port 3001)
- Authentication and JWT token generation
- Driver profile management
- Token validation endpoints
- Features 5-minute token expiration for security

### location-service (Port 3002)
- Receives and stores driver location updates
- Validates tokens with auth-service
- Publishes location updates to Redis
- Provides REST API for location updates

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

## Getting Started

```bash
# Install dependencies
pnpm install

# Start all services
docker-compose up
```

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
