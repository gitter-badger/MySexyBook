@extends('layouts.app', ['page_id' => 'resetpwd'])

<!-- Main Content -->
@section('content')
<main id="page">
    <div class="container">
        <h1>Mot de passe oublié</h1>

        <form action="{{ url('/password/email') }}" method="post">
            {{ csrf_field() }}

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

            <div>
                <button type="submit">Connexion</button>
            </div>
        </form>
    </div>
</main>
@endsection
