###########
## BUILD ##
###########
FROM docker.io/node:26-slim AS build

WORKDIR /app

# deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .
RUN PNPM_VERSION=$(node -p "require('./package.json').packageManager.split('@')[1].split('+')[0]") && npm install --global pnpm@$PNPM_VERSION
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN pnpm build


#########
## RUN ##
#########
FROM docker.io/nginxinc/nginx-unprivileged:alpine-slim

COPY --from=build /app/dist /usr/share/nginx/html
