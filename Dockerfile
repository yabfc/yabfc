###########
## BUILD ##
###########
FROM docker.io/node:24-slim AS build

RUN corepack prepare pnpm@10 --activate
RUN corepack enable
WORKDIR /app

# deps
COPY pnpm-lock.yaml pnpm-workspace.yaml .
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm fetch --frozen-lockfile
COPY package.json .
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN pnpm build


#########
## RUN ##
#########
FROM docker.io/nginxinc/nginx-unprivileged:alpine-slim

COPY --from=build /app/dist /usr/share/nginx/html
