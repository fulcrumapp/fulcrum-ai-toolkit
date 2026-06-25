# # If this is a node app
# # Un comment the commented out lines
# FROM --platform=$TARGETPLATFORM public.ecr.aws/docker/library/node:20 as builder
# WORKDIR /app
# COPY ./package.json ./
# COPY ./yarn.lock ./

# RUN yarn install --production --frozen-lockfile

FROM public.ecr.aws/nginx/nginx:1.27.1-alpine3.20-perl

WORKDIR /app

# COPY --from=builder /app/package.json ./
# COPY --from=builder /app/yarn.lock ./

COPY nginx_app_config.conf /etc/nginx/conf.d/default.conf
COPY nginx_config.conf /etc/nginx/nginx.conf

## If the assets directory exists please uncomment
# COPY assets /www/data/assets
COPY index.html /www/data

RUN groupadd -g 1099 -r fulcrum && useradd -u 1099 -r -g fulcrum fulcrum

# In general the running user should be fulcrum
# USER fulcrum 
EXPOSE 8080
