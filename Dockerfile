FROM node:20-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json ./
RUN npm install --omit=dev

# Copy the app
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
