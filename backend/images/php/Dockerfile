FROM codeblocking/base:latest

# Install PHP
RUN apt-get update && apt-get install -y \
    php-cli \
    php-curl \
    php-json \
    php-mbstring \
    php-xml \
    php-zip \
    && rm -rf /var/lib/apt/lists/*

# Install composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
