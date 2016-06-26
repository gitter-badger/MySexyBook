@extends('layouts.app', ['page_id' => 'resetpwd'])

@section('content')
<main id="page">
    <div class="container">
        <h1>Mot de passe oublié</h1>

        <form action="{{ url('/password/reset') }}" method="post">
            {{ csrf_field() }}

            <input type="hidden" name="token" value="{{ $token }}">

            <fieldset>
                <legend>Identifiant</legend>

                <div>
                    <label for="resetpwd-email">Adresse e-mail</label>
                    <input type="email" name="email" id="resetpwd-email" required size="12" autocorrect="off" autocapitalize="off" spellcheck="false" data-emailcompleter value="{{ old('email') }}">
                </div>
                @if ($errors->has('email'))
                <p class="alert error">{{ $errors->first('email') }}</p>
                @endif
            </fieldset>

            <fieldset>
                <legend>Changer de mot de passe</legend>

                <div>
                    <label for="resetpwd-password">Nouveau mot de passe</label>
                    <input type="password" name="password" id="resetpwd-password" required size="12" pattern="(.*){8,}" autocorrect="off" autocapitalize="off" spellcheck="false">
                </div>
                @if ($errors->has('password'))
                <p class="alert error">{{ $errors->first('password') }}</p>
                @endif

                <div>
                    <label for="resetpwd-password_confirmation">Confirmer le mot de passe</label>
                    <input type="password" name="password_confirmation" id="resetpwd-password_confirmation" required size="12" pattern="(.*){8,}" autocorrect="off" autocapitalize="off" spellcheck="false">
                </div>
                @if ($errors->has('password_confirmation'))
                <p class="alert error">{{ $errors->first('password_confirmation') }}</p>
                @endif
            </fieldset>

            <div>
                <button type="submit">Connexion</button>
            </div>
        </form>
    </div>
</main>
@endsection
