FROM codeblocking/base:latest

# Install C++ tools (base already has build-essential)
RUN apt-get update && apt-get install -y \
    cmake \
    gdb \
    && rm -rf /var/lib/apt/lists/*
