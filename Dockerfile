FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node public ./public
COPY --chown=node:node scripts/serve.mjs ./scripts/serve.mjs
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/serve.mjs"]
