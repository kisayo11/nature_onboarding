FROM node:20-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 5000
ENV PORT=5000

CMD [ "node", "index.js" ]
