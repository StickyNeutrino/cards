FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

FROM node:20-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
ARG BUILD_SHA=dev
ENV VITE_BUILD_SHA=$BUILD_SHA
# prebuild hook runs scripts/sync-decks.ts, which copies deck images from
# decks/<id>/cards/ into public/decks/ and generates app/data/decks.json
RUN npm run build

FROM node:20-alpine
COPY ./package.json package-lock.json /app/
COPY ./scripts/update-manifest.js /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
# The whole built client: app bundle, service worker, and deck card images
COPY --from=build-env /app/build/client /app/build/client

WORKDIR /app
CMD ["npm", "run", "start"]
