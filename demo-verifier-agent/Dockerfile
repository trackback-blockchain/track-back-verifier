FROM mhart/alpine-node:16 as base

# required for docker health check.
RUN apk add curl

RUN mkdir -p /var/www/app
RUN chmod 777 /var/www/app
WORKDIR /var/www/app/
COPY . .
RUN npm install
RUN yarn global add pm2
# HEALTHCHECK migrated to ecs-params file
# HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
#     cmd curl --fail http://localhost:80/status || exit 1   

CMD ["pm2-runtime", "index.js"]
EXPOSE 80