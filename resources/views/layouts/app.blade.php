<!DOCTYPE html>
<html lang="fr"
@if (!empty($page_id))
id="{{ $page_id }}-page"
@endif
@if (!empty($page_class))
class="{{ $page_class }}"
@endif
>
<head>
	<meta charset="UTF-8" />
	<title>{{ config('app.name') }}</title>

	<!--[if lt IE 9]><script src="{{ url('assets/js/libs/html5shiv.js') }}"></script><![endif]-->
	<meta name="viewport" content="width=device-width, user-scalable=no">
    <link href="{{ url('assets/css/mysexybook.css') }}" rel="stylesheet">

	<meta name="theme-color" content="#820043">
    <script src="{{ url('assets/js/libs/picturefill.js') }}" async></script>
</head>
<body>
	<header id="header">
		<div class="container">
			<a href="{{ url('/') }}" id="logo">
				<abbr id="logo-alternative-text" aria-hidden="true">MSD</abbr>
				<span id="logo-text">{{ config('app.name') }}</span>
			</a>
			
			@if ($current_user = Auth::user())
			<nav id="header-menu">
				<a href="{{ url('/book/'.$current_user->pseudo) }}">Mon book</a>
				<a href="{{ url('/deconnexion') }}">Déconnexion</a>
			</nav>
			@else
			<nav id="header-menu">
				<a href="{{ url('/connexion') }}">Connexion</a>
				<a href="{{ url('/inscription') }}">Inscription</a>
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
