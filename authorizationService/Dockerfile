FROM node:9.7.1-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN [ "npm", "install"]

COPY *.js ./
EXPOSE 8010
ENV PORT=8010
CMD [ "node", "server.js" ]