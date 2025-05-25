# Driver Location System - Architecture Documentation

This document provides a detailed overview of the Driver Location System architecture, including service interactions, data flows, and implementation patterns.

## System Architecture

The system follows a microservices architecture with four specialized services that communicate via HTTP/REST APIs, WebSockets, and Redis pub/sub messaging.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENT                                       │
│   ┌───────────────┐      ┌──────────────┐       ┌───────────────────────┐   │
│   │    Mobile     │      │    Admin     │       │    Driver App         │   │
│   │  Application  │      │   Dashboard  │       │                       │   │
│   └───────┬───────┘      └───────┬──────┘       └───────────┬───────────┘   │
└───────────┼────────────────────┬─┼────────────────────────┬─┘               │
            │                    │ │                        │                  │
            │ HTTP/REST          │ │ WebSocket              │ HTTP/REST       │
            │                    │ │                        │                  │
┌───────────▼────────────────────▼─▼────────────────────────▼─────────────────┐
│                        GATEWAY SERVICE (BFF)                                 │
│                                                                             │
│   ┌───────────────────┬─────────────────────┬────────────────────────┐      │
│   │                   │                     │                        │      │
│   │  Auth Controller  │ Driver Controller   │ Dashboard Controller   │      │
│   │                   │                     │                        │      │
│   └─────────┬─────────┴──────────┬──────────┴───────────┬────────────┘      │
│             │                    │                      │                    │
│   ┌─────────▼─────────┬──────────▼──────────┬──────────▼────────────┐       │
│   │                   │                     │                        │       │
│   │   Auth Service    │ Location Service    │   Dashboard Service    │       │
│   │                   │                     │                        │       │
│   └─────────┬─────────┴──────────┬──────────┴───────────┬────────────┘       │
└─────────────┼────────────────────┼────────────────────┬─┘                    │
              │                    │                    │                       │
              │ HTTP/REST          │ HTTP/REST          │ HTTP/REST            │
              │                    │                    │                       │
┌─────────────▼──────────┐ ┌──────▼─────────────┐ ┌────▼───────────────────────┐
│                        │ │                    │ │                            │
│    AUTH SERVICE        │ │  LOCATION SERVICE  │ │    REALTIME SERVICE        │
│                        │ │                    │ │                            │
│ ┌────────────────────┐ │ │┌─────────────────┐│ │ ┌────────────────────────┐ │
│ │    Domain Layer    │ │ ││   Domain Layer  ││ │ │      Domain Layer      │ │
│ │   ┌────────────┐   │ │ ││  ┌───────────┐  ││ │ │    ┌────────────┐      │ │
│ │   │   Driver   │   │ │ ││  │ Driver    │  ││ │ │    │    Driver   │      │ │
│ │   │   Entity   │   │ │ ││  │ Location  │  ││ │ │    │   Location  │      │ │
│ │   └────────────┘   │ │ ││  └───────────┘  ││ │ │    └────────────┘      │ │
│ └────────────────────┘ │ │└─────────────────┘│ │ └────────────────────────┘ │
│                        │ │                    │ │                            │
│ ┌────────────────────┐ │ │┌─────────────────┐│ │ ┌────────────────────────┐ │
│ │  Application Layer │ │ ││Application Layer││ │ │   Application Layer     │ │
│ │   ┌────────────┐   │ │ ││  ┌───────────┐  ││ │ │    ┌────────────┐      │ │
│ │   │    Auth    │   │ │ ││  │  Location  │  ││ │ │    │  Realtime  │      │ │
│ │   │   Service  │   │ │ ││  │  Service   │  ││ │ │    │  Service   │      │ │
│ │   └────────────┘   │ │ ││  └───────────┘  ││ │ │    └────────────┘      │ │
│ └────────────────────┘ │ │└─────────────────┘│ │ └────────────────────────┘ │
│                        │ │                    │ │                            │
│ ┌────────────────────┐ │ │┌─────────────────┐│ │ ┌────────────────────────┐ │
│ │     Ports Layer    │ │ ││   Ports Layer   ││ │ │      Ports Layer       │ │
│ │  ┌─────┐  ┌─────┐  │ │ ││ ┌─────┐ ┌─────┐ ││ │ │   ┌─────┐   ┌─────┐    │ │
│ │  │ In  │  │ Out │  │ │ ││ │ In  │ │ Out │ ││ │ │   │ In  │   │ Out │    │ │
│ │  └─────┘  └─────┘  │ │ ││ └─────┘ └─────┘ ││ │ │   └─────┘   └─────┘    │ │
│ └────────────────────┘ │ │└─────────────────┘│ │ └────────────────────────┘ │
│                        │ │                    │ │                            │
│ ┌────────────────────┐ │ │┌─────────────────┐│ │ ┌────────────────────────┐ │
│ │ Infrastructure     │ │ ││ Infrastructure  ││ │ │    Infrastructure      │ │
│ │    Layer           │ │ ││     Layer       ││ │ │        Layer           │ │
│ │ ┌────────────────┐ │ │ ││┌───────────────┐││ │ │ ┌──────────────────┐   │ │
│ │ │  Controllers   │ │ │ │││  Controllers  │││ │ │ │    Gateways       │   │ │
│ │ └────────────────┘ │ │ ││└───────────────┘││ │ │ │┌────────┐┌──────┐│   │ │
│ │ ┌────────────────┐ │ │ ││┌───────────────┐││ │ │ ││ Client ││Driver││   │ │
│ │ │  Repositories  │─┼─┼─┼┼┤ Redis Messaging├┼┼─┼─┼─┤└────────┘└──────┘│   │ │
│ │ └────────────────┘ │ │ ││└───────────────┘││ │ │ └──────────────────┘   │ │
│ └────────────────────┘ │ │└─────────────────┘│ │ └────────────────────────┘ │
└────────────────────────┘ └────────────────────┘ └────────────────────────────┘
                                    │                           │
                                    │      Redis Pub/Sub        │
                                    └───────────────────────────┘
```

## Sequence Diagram

The following sequence diagram illustrates the flow of a typical operation in the system:

```
┌─────────┐  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│ Client  │  │ Gateway BFF│  │ Auth Service│  │Location Svc  │  │Realtime Svc  │
└────┬────┘  └─────┬──────┘  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘
     │            │                 │                │                 │
     │ Login      │                 │                │                 │
     │ ────────► │                 │                │                 │
     │            │ Authenticate    │                │                 │
     │            │ ───────────────►│                │                 │
     │            │                 │                │                 │
     │            │  Token + Profile│                │                 │
     │            │ ◄─────────────── │                │                 │
     │Token+Profile│                 │                │                 │
     │◄───────────│                 │                │                 │
     │            │                 │                │                 │
     │Update Location               │                │                 │
     │(token)     │                 │                │                 │
     │ ────────► │                 │                │                 │
     │            │                 │Validate Token  │                 │
     │            │ ────────────────────────────────►│                 │
     │            │                 │                │                 │
     │            │                 │          Token OK               │
     │            │                 │                │◄ ─ ─ ─ ─ ─ ─ ─ ─ │
     │            │                 │                │                 │
     │            │ Update Location │                │                 │
     │            │ ────────────────────────────────►│                 │
     │            │                 │                │     Publish     │
     │            │                 │                │ ──────────────► │
     │            │                 │                │                 │
     │            │      Success    │                │                 │
     │   Success  │◄ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ┘                 │
     │◄───────────│                 │                                  │
     │            │                 │                                  │
     │            │                 │                                  │
     │WebSocket Connect             │                                  │
     │────────────────────────────────────────────────────────────────►│
     │            │                 │                                  │
     │Subscribe to Driver                                              │
     │────────────────────────────────────────────────────────────────►│
     │            │                 │                                  │
     │            │                 │                                  │
     │            │                 │    Location Updates (5s/1min)    │
     │◄────────────────────────────────────────────────────────────────│
     │            │                 │                                  │
```

## Hexagonal Architecture (Ports & Adapters)

Each microservice follows the hexagonal architecture pattern with the following layers:

1. **Domain Layer**
   - Core business entities and rules
   - Independent of external systems
   - Example: `Driver`, `DriverLocation` entities

2. **Application Layer**
   - Use cases and business logic
   - Depends only on the domain layer
   - Example: `AuthService`, `LocationService`, `RealtimeService`

3. **Ports Layer**
   - Interfaces defining how the application layer interacts with the outside world
   - **Input Ports**: Services interfaces (e.g., `IAuthService`)
   - **Output Ports**: Repository and messaging interfaces (e.g., `IDriverRepository`)

4. **Infrastructure Layer**
   - Concrete implementations of the ports
   - Controllers, repositories, messaging adapters
   - External systems integrations

## Communication Patterns

The system uses multiple communication patterns:

1. **HTTP/REST**
   - Between client applications and the Gateway BFF
   - Between the Gateway BFF and the microservices
   - Used for synchronous request-response communication

2. **WebSockets**
   - Between client applications and the Realtime Service
   - Used for real-time updates and subscriptions
   - Handles client connections and driver location broadcasts

3. **Redis Pub/Sub**
   - Between the Location Service and Realtime Service
   - Used for asynchronous messaging between service instances
   - Enables horizontal scaling and instance communication

## Key Components

1. **Gateway Service (BFF)**
   - Routes requests to appropriate microservices
   - Aggregates data for frontend optimization
   - Provides unified API for clients

2. **Auth Service**
   - Handles authentication and token management
   - Manages driver profiles
   - Validates tokens for other services

3. **Location Service**
   - Processes driver location updates
   - Stores and retrieves driver locations
   - Publishes location updates to Realtime Service

4. **Realtime Service**
   - Manages WebSocket connections
   - Handles client subscriptions to driver updates
   - Broadcasts location updates to subscribed clients
   - Implements different update frequencies based on driver status

## Scaling Considerations

The architecture is designed for horizontal scaling:

- **Stateless Services**: All services are stateless and can be scaled independently
- **Redis Pub/Sub**: Enables communication between service instances
- **WebSocket Load Balancing**: Clients can connect to any Realtime Service instance
- **Token-Based Authentication**: No session state required for authentication

This architecture allows for deployment of multiple instances of each service to handle increased load, with Redis providing the communication backbone between instances.
