FROM php:8.3-cli-alpine

# Install system dependencies & PostgreSQL dev libraries
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    curl \
    bash \
    linux-headers

# Install PHP extensions required for Laravel & PostGIS
RUN docker-php-ext-install pdo pdo_pgsql pgsql zip bcmath

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

