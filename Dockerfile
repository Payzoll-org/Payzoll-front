# Stage 1: build the Vite app. VITE_* values get compiled straight into
# the JS bundle here (import.meta.env) - React/Vite can't read env vars
# at runtime the way the Node backend can, so these must already be the
# real production values at build time, not filled in later.
FROM node:24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Dev-branch value: points at the dev AuthService Cloud Run service, not
# production. This is baked in at build time (Vite compiles import.meta.env
# straight into the JS bundle - can't be overridden at runtime), and a
# Cloud Build substitution can't reach into a Dockerfile ENV line, so the
# only way to get dev/prod pointing at different backends is for this
# Dockerfile to actually differ between the dev and main branches. main's
# copy of this file keeps the production value
# (https://api.payzoll.finance); do not carry this line forward when
# promoting dev -> main. Update this if the dev AuthService URL changes.
ENV VITE_AUTH_API_URL=https://backend-payzoll-dev-97498937015.europe-west1.run.app

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
