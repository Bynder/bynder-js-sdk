FROM node:14

RUN mkdir /app
WORKDIR /app

COPY . /app/

RUN yarn install

RUN npm install -g gulp

RUN gulp babel
