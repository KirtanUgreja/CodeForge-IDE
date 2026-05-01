FROM php:8.2-cli

# Install git and other useful tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /workspace

# Expose common ports for development
EXPOSE 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010
EXPOSE 8000 8080

CMD ["/bin/bash"]
