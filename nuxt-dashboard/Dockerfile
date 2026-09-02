# Lightweight production container for Nuxt 3 (Nitro server)
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Copy pre-built production server and client bundles
COPY .output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
