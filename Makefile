test:
	php -S localhost:6969 -t public/

update:
	php artisan down
	git pull
	php artisan up
