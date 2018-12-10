FROM node:9.7.1-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN [ "npm", "install"]

COPY *.js ./
EXPOSE 8001
ENV PORT=8001
CMD [ "node", "server.js" ]