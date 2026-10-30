FROM node:22-alpine
WORKDIR /app
COPY package.json server.js logic.js ./
COPY public ./public
RUN mkdir -p data && chown -R node:node /app
USER node
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(x=>{if(!x.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","server.js"]
