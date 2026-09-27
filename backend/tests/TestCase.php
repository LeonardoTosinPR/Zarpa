<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        putenv('DB_DATABASE=zarpa_testing');
        $_ENV['DB_DATABASE'] = 'zarpa_testing';
        $_SERVER['DB_DATABASE'] = 'zarpa_testing';

        $app = parent::createApplication();

        $app['config']->set('database.connections.pgsql.database', 'zarpa_testing');

        return $app;
    }
}

