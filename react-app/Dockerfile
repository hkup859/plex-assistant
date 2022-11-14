FROM node:alpine
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY . ./

# FROM base as production

ENV NODE_PATH=./build

RUN npm run build

# RUN npm run start

CMD ["npm", "vite:start"]