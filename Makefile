test:
	php -S localhost:6969 -t public/

update:
	php artisan down
	git pull
	make install
	make build-assets
	php artisan up

install:
	composer install
	npm install

build-assets:
	gulp
