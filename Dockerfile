# Image unique : API, temps réel et site web sur le même port.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/server/package.json apps/server/
COPY apps/app/package.json apps/app/
COPY e2e/package.json e2e/
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build:web

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=4000 PLUME_DATA_DIR=/data/pglite
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/apps/app/dist ./apps/app/dist
COPY --from=build /app/apps/app/package.json ./apps/app/package.json
VOLUME /data
EXPOSE 4000
CMD ["npm", "start"]
