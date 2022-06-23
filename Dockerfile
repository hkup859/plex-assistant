FROM node:16-alpine3.15 as base

RUN apk add --no-cache \
    chromium \
  && rm -rf /var/cache/apk/* /tmp/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /home/node/app

COPY package*.json ./

RUN npm i

COPY . .

FROM base as production

ENV NODE_PATH=./build

RUN npm run build

RUN npm run start

# Issue to fix - create user so we don't need --no-sandbox arg
# "saveLogin failed: Error: Failed to launch the browser process!\n[0622/161131.220883:ERROR:zygote_host_impl_linux.cc(90)] Running as root without --no-sandbox is not supported. See https://crbug.com/638180.\n\n\nTROUBLESHOOTING: https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md\n"