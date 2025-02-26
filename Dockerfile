FROM node:12

RUN mkdir /app
WORKDIR /app

COPY . /app/

RUN npm install

RUN npm install -g gulp

RUN gulp babel
