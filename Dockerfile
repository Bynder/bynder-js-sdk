FROM node:11

RUN mkdir /app
WORKDIR /app

COPY . /app/

RUN npm install
