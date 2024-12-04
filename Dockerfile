FROM node:23 AS build
WORKDIR .workdir 
COPY package*.json ./
RUN npm i 

FROM node:23-slim AS final 
WORKDIR app
COPY --from=build .workdir/node_modules ./node_modules
COPY ./src ./
EXPOSE 3000
ENTRYPOINT [ "node", "server.js" ]