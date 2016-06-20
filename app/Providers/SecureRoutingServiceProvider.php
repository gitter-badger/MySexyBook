<?php
use Illuminate\Routing\UrlGenerator;
use Illuminate\Routing\RoutingServiceProvider;

class SecureRoutingServiceProvider extends RoutingServiceProvider
{
    public function boot()
    {
        App::bind('url', function () {
            $generator = new UrlGenerator(
                App::make('router')->getRoutes(),
                App::make('request');
            });

            $generator->forceSchema('https');

            return $generator;
        }

        parent::boot();
    }
}
