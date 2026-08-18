# Stage 1: build the Vite app. VITE_* values get compiled straight into
# the JS bundle here (import.meta.env) - React/Vite can't read env vars
# at runtime the way the Node backend can, so these must already be the
# real production values at build time, not filled in later.
FROM node:24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG VITE_AUTH_API_URL
ENV VITE_AUTH_API_URL=$VITE_AUTH_API_URL

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
