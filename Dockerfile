# Use the official PHP image
FROM php:8.2-apache

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Install Composer
RUN apt-get update && apt-get install -y unzip git
COPY --from=composer:2.6 /usr/bin/composer /usr/bin/composer

# Copy app files
WORKDIR /var/www/html
COPY public/ /var/www/html/
COPY src/ /var/www/html/src/
COPY composer.json composer.lock /var/www/html/
COPY vendor/ /var/www/html/vendor/

# Install dependencies
RUN composer install

# Expose the web server port
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"]
