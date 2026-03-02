# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./

# Install dependencies strictly from the lockfile
RUN npm ci

# Copy the remaining project files
COPY . .

# Build the project
RUN npm run build

# Stage 2: Serve the optimized build with Nginx
FROM nginx:alpine

# Copy the build output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration with API proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# The default nginx command is already provided by the base image
CMD ["nginx", "-g", "daemon off;"]
