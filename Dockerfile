# Dockerfile para SigmaBot API

FROM node:22-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --production

COPY . .

RUN yarn build

EXPOSE 4000

CMD ["yarn", "start"]
