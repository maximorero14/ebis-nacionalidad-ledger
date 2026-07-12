FROM node:24-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /workspace/frontend

ARG VITE_API_BASE_URL=http://localhost:8080
ARG VITE_BESU_RPC_URL=http://localhost:8545
ARG VITE_BESU_CHAIN_ID=20260711
ARG VITE_SIWE_DOMAIN=localhost
ARG VITE_SIWE_URI=http://localhost:5173
ARG VITE_WALLETCONNECT_PROJECT_ID=ebis-local-dev
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_BESU_RPC_URL=${VITE_BESU_RPC_URL}
ENV VITE_BESU_CHAIN_ID=${VITE_BESU_CHAIN_ID}
ENV VITE_SIWE_DOMAIN=${VITE_SIWE_DOMAIN}
ENV VITE_SIWE_URI=${VITE_SIWE_URI}
ENV VITE_WALLETCONNECT_PROJECT_ID=${VITE_WALLETCONNECT_PROJECT_ID}

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
COPY generated ../generated
RUN npm run build

FROM nginx:1.29-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/frontend/dist /usr/share/nginx/html
EXPOSE 80
