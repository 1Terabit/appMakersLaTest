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

# Debug: List files to verify all necessary files are present
RUN ls -la

# Attempt build with verbose logging
RUN pnpm build

# Debug: Verify build output
RUN ls -la dist/ || echo "dist directory not created or empty"

FROM node:18-alpine
WORKDIR /app

# Install PNPM
RUN corepack enable && corepack prepare pnpm@8.6.0 --activate

# Copy built files and package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Debug: Verify files were copied correctly
RUN ls -la
RUN ls -la dist/ || echo "dist directory not copied or empty"

# Install production dependencies
RUN pnpm install --prod

EXPOSE 3002

# Add healthcheck to verify the service is running correctly
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Ensure the service starts correctly
CMD ["node", "dist/main.js"]
