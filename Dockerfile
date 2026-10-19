FROM node:22-alpine AS webbuild
WORKDIR /workspace/web
COPY web/package*.json ./
RUN npm ci --no-audit --no-fund
COPY web ./
COPY mobile/profile-links.js /workspace/mobile/profile-links.js
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
COPY --chown=node:node private-release ./private-release
COPY --from=webbuild /workspace/web/dist ./web/dist
USER node
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8080/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
