# ---------- Base ----------
FROM node:12-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY ./ ./

# ----------DEV--------------
FROM base as dev
# RUN npm install -g nodemon
CMD ["npm", "run", "dev"]