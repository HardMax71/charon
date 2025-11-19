FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source (for initial build, but volumes will override in dev)
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run dev server with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
