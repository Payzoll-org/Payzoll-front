# Stage 1: build the Vite app. VITE_* values get compiled straight into
# the JS bundle here (import.meta.env) - React/Vite can't read env vars
# at runtime the way the Node backend can, so these must already be the
# real production values at build time, not filled in later.
FROM node:24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Hardcoded rather than passed as a --build-arg: this needs to build
# correctly no matter which path actually builds it (our cloudbuild.yaml,
# Cloud Run's own "Create service" wizard with Build type=Dockerfile,
# etc.) without every path having to remember to pass it. It's the real,
# public, live AuthService URL - not a secret, safe to bake in directly.
#
# Custom domain (api.payzoll.finance), not the raw *.run.app URL - Cloud
# Run's default domains are each their own entry on the Public Suffix
# List, so a browser treats app.payzoll.finance and a *.run.app backend
# as different "sites" entirely and blocks the httpOnly refresh-token
# cookie as third-party no matter how SameSite is configured (confirmed
# live). Both services living under payzoll.finance fixes that at the
# root instead of fighting it with more cookie config. Update this if
# AuthService is ever redeployed under a different URL.
#
# dev's copy of this file intentionally diverges here (dev AuthService
# URL) - do not carry that divergence forward when promoting dev -> main.
ENV VITE_AUTH_API_URL=https://api.payzoll.finance

RUN npm run build

# Stage 2: serve the static build with nginx. The official nginx image
# runs envsubst over anything in /etc/nginx/templates/*.template at
# startup and only touches variables that are actually set in the
# container's environment - nginx's own $uri/$host etc. are left alone,
# only ${PORT} (which we do set) gets substituted.
FROM nginx:alpine
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

ENV PORT=8080
EXPOSE 8080
