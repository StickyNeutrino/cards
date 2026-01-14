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
RUN npm run build

FROM node:20-alpine
COPY public/cards /app/build/client/cards
COPY public /app/build/client

COPY ./package.json package-lock.json /app/
COPY ./scripts/update-manifest.js /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build/client/assets /app/build/client/assets
COPY --from=build-env /app/build/client/index.html /app/build/client/index.html


WORKDIR /app
CMD ["npm", "run", "start"]