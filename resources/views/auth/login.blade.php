@extends('layouts.app', ['page_id' => 'login'])

@section('content')
<main id="page">
    <div class="container">
        <h1>Connexion</h1>

        <form action="{{ url('/login') }}" method="post">
            {{ csrf_field() }}

            <fieldset>
                <legend>Identifiants</legend>

                <div>
                    <label for="login-email">Adresse e-mail</label>
                    <input type="email" name="email" id="login-email" required size="12" autocorrect="off" autocapitalize="off" spellcheck="false" data-emailcompleter value="{{ old('email') }}">
                </div>
                @if ($errors->has('email'))
                <p class="alert error">{{ $errors->first('email') }}</p>
                @endif

                <div>
                    <label for="login-password">Mot de passe</label>
                    <input type="password" name="password" id="login-password" required size="12" pattern="(.*){8,}" autocorrect="off" autocapitalize="off" spellcheck="false">
                </div>
                @if ($errors->has('password'))
                <p class="alert error">{{ $errors->first('password') }}</p>
                @endif

                <p>
                    <a href="{{ url('/password/reset') }}">Mot de passe oublié&nbsp;?</a>
                </p>
            </fieldset>

            <fieldset>
                <legend>Rester connecté</legend>

                <div>
                    <label>
                        <input type="checkbox" name="remember" id="login-remember" value="yes" aria-labelledby="login-remember-label login-remember-explanation">
                        <span class="checkbox-label" id="login-remember-label">Je souhaite rester connecté</span>
                    </label>
                </div>

                <p class="alert info" id="login-remember-explanation">En cochant cette case, un cookie sera créé sur votre ordinateur pour vous permettre de rester connecté jusqu'à votre prochaine visite</p>
            </fieldset>

            <div>
                <button type="submit">Connexion</button>
            </div>
        </form>
    </div>
</main>
@endsection
