<!DOCTYPE html>
<html lang="{{ config('app.locale') }}" {!! !empty($page_id) ? ' id="'.$page_id.'-page"' : '' !!}{!! !empty($page_class) ? ' class="'.$page_class.'"' : '' !!}>
<head>
	<meta charset="UTF-8" />
	<title>
        @if (!empty($page_title))
        {{ $page_title }} |
        @endif
        My Sexy Book
    </title>

	<!--[if lt IE 9]><script src="{{ url('assets/js/libs/html5shiv.js') }}"></script><![endif]-->
	<meta name="viewport" content="width=device-width, user-scalable=no">
    <link href="{{ url('assets/css/mysexybook.css') }}" rel="stylesheet">

	<meta name="theme-color" content="#820043">
    <script src="{{ url('assets/js/libs/picturefill.js') }}" async></script>

    <meta name="robots" content="index,follow">

    <meta property="og:url" content="{{ url('/') }}">
    <meta property="og:title" content="My Sexy Book">
    {{-- <meta property="og:image" content="{{ url('/assets/img/opening-bg.jpg') }}"> --}}

    <meta name="twitter:card" content="summary">
    <meta name="twitter:site" content="@My_Sexy_Book">
    <meta name="twitter:url" content="{{ url('/') }}">
    <meta name="twitter:title" content="My Sexy Book">
    {{-- <meta name="twitter:description" content="Ouverture bientôt…"> --}}
    {{-- <meta name="twitter:image" content="{{ url('/assets/img/opening-bg.jpg') }}"> --}}
</head>
<body>
	<header id="header">
		<div class="container">
			<a href="{{ url('/') }}" id="logo">
				<abbr id="logo-alternative-text" aria-hidden="true">MSD</abbr>
				<span id="logo-text">My Sexy Book</span>
			</a>

			@if ($current_user = Auth::user())
			<nav id="header-menu">
				<a href="{{ url('/book/'.$current_user->pseudo) }}">Mon book</a>
				<a href="{{ url('/logout') }}">Déconnexion</a>
			</nav>
			@else
			<nav id="header-menu">
				<a href="{{ url('/login') }}">Connexion</a>
				<a href="{{ url('/register') }}">Inscription</a>
			</nav>
			@endif
		</div>
	</header>

    @yield('content')

    <footer id="footer">
        <div class="container">
            <p>My Sexy Book — {{ strftime('%Y') }}</p>
        </div>
    </footer>

    <link href="{{ url('assets/js/mysexybook.js') }}" rel="stylesheet">
    @if (!empty($js_files))
        @foreach ($js_files as $file_name)
            <script src="{{ url('assets/js/'.$file_name.'.js') }}" id="js-file-{{ $file_name }}"></script>
        @endforeach
    @endif
</body>
</html>
