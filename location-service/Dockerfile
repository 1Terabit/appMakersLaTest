FROM node:18-alpine AS builder

# Install PNPM
RUN corepack enable && corepack prepare pnpm@8.6.0 --activate

WORKDIR /app

# Copy package files and install dependencies
COPY package.json tsconfig.json ./
RUN pnpm install

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# Copy source code
COPY src/ ./src/
COPY nest-cli.json ./

# Build the application
RUN pnpm build

# Create a clean production node_modules
RUN pnpm install --prod

# Create the final image
FROM node:18-alpine
WORKDIR /app

# Copy built files, package.json, and node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Verify files were copied correctly
RUN ls -la
RUN ls -la dist/
RUN ls -la node_modules/

EXPOSE 3002

# Add healthcheck to verify the service is running correctly
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Ensure the service starts correctly
CMD ["node", "dist/main.js"]
