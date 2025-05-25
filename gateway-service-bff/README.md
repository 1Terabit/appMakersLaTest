# Gateway Service (BFF)

Backend for Frontend service that provides a unified API for the frontend application, optimizing data aggregation from multiple microservices.

## Overview

The Gateway Service acts as an API Gateway and Backend for Frontend (BFF) for the Driver Location System. It routes requests to the appropriate microservices and provides optimized endpoints specifically designed for frontend consumption patterns.

## Features

- **API Gateway**: Routes requests to auth-service, location-service, and realtime-service
- **Authentication Proxy**: Forwards authentication requests to auth-service
- **Location Management**: Forwards location updates to location-service
- **BFF Optimized Endpoints**: Combines data from multiple services for efficient frontend consumption
- **Swagger Documentation**: API documentation available at `/api/docs`

## Endpoints

### Authentication Endpoints
- `POST /api/login` - Driver authentication
- `POST /api/validate-token` - JWT token validation
- `GET /api/driver/:id/profile` - Get driver profile

### Location Endpoints
- `POST /api/driver/update` - Update driver location
- `GET /api/driver/:id/location` - Get driver location

### BFF Optimized Endpoints
- `GET /api/dashboard/driver/:id` - Get combined driver dashboard (profile + location + statistics)

## Environment Variables

See `.env.example` for the required environment variables.

## Implementation

The service is built with NestJS and follows a clean architecture pattern with controllers, services, and DTOs.
