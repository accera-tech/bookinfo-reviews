FROM node:12-slim

COPY package.json /opt/microservices/
COPY reviews.js /opt/microservices/
COPY proto /opt/microservices/proto/
RUN cd /opt/microservices; npm install

ARG service_version
ARG enable_ratings
ARG star_color
ENV SERVICE_VERSION ${service_version:-v1}
ENV ENABLE_RATINGS ${enable_ratings:-false}
ENV STAR_COLOR ${star_color:-black}

EXPOSE 9080
WORKDIR /opt/microservices
CMD node /opt/microservices/reviews.js 9080
