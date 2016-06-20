test:
	php -S localhost:6969 -t public/

update:
	php artisan down
	git pull
	make install
	make build-assets
	php artisan up

install:
	npm install
	composer install

build-assets:
	gulp
