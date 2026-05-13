
FROM node:20-alpine

# Change current working directory
WORKDIR /app

# copy the package.json first to cache
COPY package.json .
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001

CMD [ "npm", "run", "start" ]

