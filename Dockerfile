FROM node:20-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json ./
RUN npm install --omit=dev

# Copy the app
COPY . .

# Build the embeddings index at image build time.
# Requires VOYAGE_API_KEY at build; if your platform can't provide build-time
# secrets, remove this line and run `npm run build-index` on first boot instead.
# RUN npm run build-index

EXPOSE 3000

CMD ["npm", "start"]
