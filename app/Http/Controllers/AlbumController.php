<?php

namespace MySexyBook\Http\Controllers;

use Illuminate\Http\Request;

use MySexyBook\Http\Requests;

class AlbumController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
    }
}
