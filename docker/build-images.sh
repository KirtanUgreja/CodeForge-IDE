#!/bin/bash

# Build all CodeBlocking Docker images
# Uses a temporary Docker config to bypass credential helper issues

set -e

echo "Building CodeBlocking Docker images..."

cd "$(dirname "$0")"

# Create temp docker config directory to bypass credential issues
TEMP_CONFIG=$(mktemp -d)
echo '{"auths":{}}' > "$TEMP_CONFIG/config.json"

# Get Docker Desktop socket path
DOCKER_HOST_PATH="$HOME/.docker/desktop/docker.sock"
if [ -e "$DOCKER_HOST_PATH" ]; then
    export DOCKER_HOST="unix://$DOCKER_HOST_PATH"
fi

echo "Building Python image..."
DOCKER_CONFIG="$TEMP_CONFIG" docker build -t codeblocking/python -f python.Dockerfile .

echo "Building Node.js image..."
DOCKER_CONFIG="$TEMP_CONFIG" docker build -t codeblocking/node -f node.Dockerfile .

echo "Building Java image..."
DOCKER_CONFIG="$TEMP_CONFIG" docker build -t codeblocking/java -f java.Dockerfile .

echo "Building Go image..."
DOCKER_CONFIG="$TEMP_CONFIG" docker build -t codeblocking/go -f go.Dockerfile .

echo "Building Rust image..."
DOCKER_CONFIG="$TEMP_CONFIG" docker build -t codeblocking/rust -f rust.Dockerfile .

echo "Building C++ image..."
DOCKER_CONFIG="$TEMP_CONFIG" docker build -t codeblocking/cpp -f cpp.Dockerfile .

echo "Building PHP image..."
DOCKER_CONFIG="$TEMP_CONFIG" docker build -t codeblocking/php -f php.Dockerfile .

echo "Building Ruby image..."
DOCKER_CONFIG="$TEMP_CONFIG" docker build -t codeblocking/ruby -f ruby.Dockerfile .

echo "Building Base image..."
DOCKER_CONFIG="$TEMP_CONFIG" docker build -t codeblocking/base -f base.Dockerfile .

# Cleanup temp config
rm -rf "$TEMP_CONFIG"

echo ""
echo "✅ All images built successfully!"
echo ""
echo "Available images:"
docker images | grep codeblocking
