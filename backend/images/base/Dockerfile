FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install common tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    nano \
    vim \
    unzip \
    zip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

CMD ["/bin/bash"]
