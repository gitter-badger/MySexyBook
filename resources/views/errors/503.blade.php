<!DOCTYPE html>
<html lang="{{ config('app.locale') }}" id="opening-page">
<head>
    <meta charset="UTF-8" />
    <title>My Sexy Book</title>

    <!--[if lt IE 9]><script src="{{ url('assets/js/libs/html5shiv.js') }}"></script><![endif]-->
    <meta name="viewport" content="width=device-width, user-scalable=no">
    <link href="{{ url('assets/css/mysexybook-opening.css') }}" rel="stylesheet">

    <meta name="theme-color" content="#820043">
    <script src="{{ url('assets/js/libs/picturefill.js') }}" async></script>

    <meta name="robots" content="index,nofollow">

    <meta property="og:url" content="{{ url('/') }}">
    <meta property="og:title" content="My Sexy Book">
    <meta property="og:image" content="{{ url('/assets/img/opening-bg.jpg') }}">

    <meta name="twitter:card" content="summary">
    <meta name="twitter:site" content="@My_Sexy_Book">
    <meta name="twitter:url" content="{{ url('/') }}">
    <meta name="twitter:title" content="My Sexy Book">
    <meta name="twitter:description" content="Ouverture bientôt…">
    <meta name="twitter:image" content="{{ url('/assets/img/opening-bg.jpg') }}">
</head>
<body>
    <main id="opening-content">
        <h1>My Sexy Book</h1>

        <p id="opening-info">Ouverture bientôt — <a href="mailto:contact@mysexybook.photo">Contactez-nous</a></p>
    </main>
</body>
</html>
