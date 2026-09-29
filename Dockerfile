FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY lib ./lib
COPY data ./data
COPY public ./public
COPY server.js ./
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node", "server.js"]
