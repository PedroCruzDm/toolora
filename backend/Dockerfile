FROM node:20-alpine3.20
RUN apk update && apk upgrade --no-cache
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080
CMD ["node", "./node_modules/ts-node-dev/lib/bin.js", "--respawn", "--transpile-only", "server.ts"]