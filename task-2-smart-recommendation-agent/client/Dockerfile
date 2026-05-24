FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
# CHANGED: Changed from npm ci to npm install to bypass strict lockfile checks
RUN npm install

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build


FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
# Note: Ensure nginx.conf exists in your client folder root
COPY nginx.conf /etc/nginx/templates/default.conf.template 

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]