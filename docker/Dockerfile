# Dockerfile for AI Project Generator V5.5
# Multi-stage build for optimized production image

# ========== STAGE 1: Builder ==========
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tests/ ./tests/

# Build TypeScript
RUN npm run build

# ========== STAGE 2: Production ==========
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install runtime dependencies
RUN apk add --no-cache tini curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/src ./src

# Copy configuration files
COPY --chown=nodejs:nodejs tsconfig.json ./
COPY --chown=nodejs:nodejs docker/healthcheck.sh ./docker/

# Create necessary directories
RUN mkdir -p /app/logs /app/temp && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# ========== STAGE 3: Development ==========
FROM node:18-alpine AS development

# Install development tools
RUN apk add --no-cache python3 make g++ git bash curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY src/ ./src/
COPY tests/ ./tests/
COPY docker/ ./docker/

# Expose ports (app + debug)
EXPOSE 3000 9229

# Default command for development
CMD ["npm", "run", "dev"]

# ========== STAGE 4: Test ==========
FROM development AS test

# Install additional test dependencies if needed
RUN npm install --only=dev

# Run tests
CMD ["npm", "test"]

# Labels for better image management
LABEL maintainer="ai-project-generator-team"
LABEL version="5.5"
LABEL description="AI Project Generator V5.5 - Full-stack development assistant"
LABEL org.opencontainers.image.source="https://github.com/ai-project-generator"