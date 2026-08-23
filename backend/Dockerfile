# Bloom Agenda — backend (Express) + frontend estático (servido pelo próprio app.js).
# Build context = raiz do projeto (Bloom-Agenda-Novo), para preservar o layout
# relativo que backend/src/app.js espera (../../html, ../../css, ../../js).
FROM node:22-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/src ./src
COPY backend/uploads ./uploads

COPY html ../html
COPY css ../css
COPY js ../js

EXPOSE 3006
CMD ["node", "src/server.js"]
