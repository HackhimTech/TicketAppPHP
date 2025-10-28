# -------------------------------
# Stage 1 — Build dependencies
# -------------------------------
FROM composer:2 AS build

# Set working directory
WORKDIR /app

# Copy composer files first (for caching)
COPY composer.json composer.lock ./

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress

# Copy the rest of the project files
COPY . .

# -------------------------------
# Stage 2 — Apache + PHP runtime
# -------------------------------
FROM php:8.2-apache

# Enable PHP extensions
RUN docker-php-ext-install pdo pdo_mysql

# Enable Apache rewrite module
RUN a2enmod rewrite

# Copy the app from the build stage
COPY --from=build /app /var/www/html

# Set working directory
WORKDIR /var/www/html

# ✅ Set Apache document root to /var/www/html/public
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

# Update Apache config to use the public folder
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/000-default.conf && \
    sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf

# Fix permissions
RUN chown -R www-data:www-data /var/www/html

# Expose HTTP port
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"]
