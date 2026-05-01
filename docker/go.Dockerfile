FROM golang:1.21-alpine

# Install git and other useful tools
RUN apk add --no-cache \
    git \
    curl \
    bash \
    build-base

WORKDIR /workspace

# Expose common ports for development
EXPOSE 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010
EXPOSE 8080 8081 9000

CMD ["/bin/bash"]
