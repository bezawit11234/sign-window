FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY player ./player
COPY demo ./demo
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "require('http').get('http://127.0.0.1:3000/demo/index.html',function(r){process.exit(r.statusCode===200?0:1)}).on('error',function(){process.exit(1)})"
USER node
CMD ["node", "server/index.js"]
