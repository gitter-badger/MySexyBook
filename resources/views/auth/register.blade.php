@extends('layouts.app', ['page_id' => 'register'])

@section('content')
<main id="page">
    <div class="container">
        <h1>Inscription</h1>

        <form action="{{ url('/register') }}" method="post">
            {{ csrf_field() }}

            <fieldset>
                <legend>Informations de connexion</legend>

                <div>
                    <label for="register-email">Adresse e-mail</label>
                    <input type="email" name="email" id="register-email" required size="12" autocorrect="off" autocapitalize="off" spellcheck="false" data-emailcompleter value="{{ old('email') }}">
                </div>
                @if ($errors->has('email'))
                <p class="alert error">{{ $errors->first('email') }}</p>
                @endif

                <div>
                    <label for="register-password">Mot de passe</label>
                    <input type="password" name="password" id="register-password" required size="12" pattern="(.*){8,}" autocorrect="off" autocapitalize="off" spellcheck="false">
                    <span class="field-indication">8 caractères (libres) minimum</span>
                </div>
                @if ($errors->has('password'))
                <p class="alert error">{{ $errors->first('password') }}</p>
                @endif
            </fieldset>

            <fieldset>
                <legend>Votre profil</legend>

                <div>
                    <label for="register-pseudo">Pseudo</label>
                    <input type="text" name="pseudo" id="register-pseudo" required size="12" pattern="[a-zA-Z0-9]{4,30}" maxlength="30" autocorrect="off" autocapitalize="off" spellcheck="false" value="{{ old('pseudo') }}">
                    <span class="field-indication">Caractères aplhanumériques uniquement</span>
                </div>
                @if ($errors->has('pseudo'))
                <p class="alert error">{{ $errors->first('pseudo') }}</p>
                @endif

                <div>
                    <label for="register-sex-male">Sexe</label>
                    <label>
                        <input type="radio" name="sex" id="register-sex-male" required value="male"{{ old('sex') === 'male' ? ' checked' : '' }}> Homme
                    </label>
                    <label>
                        <input type="radio" name="sex" id="register-sex-female" required value="female"{{ old('sex') === 'female' ? ' checked' : '' }}> Femme
                    </label>
                </div>
                @if ($errors->has('sex'))
                <p class="alert error">{{ $errors->first('sex') }}</p>
                @endif

                <div>
                    <label for="register-geo_county_id">Département</label>
                    <select name="geo_county_id" id="register-geo_county_id" required size="1">
                        <option value="">— Renseignez votre département</option>
                        {{-- @foreach($geo_counties as $county) --}}
                        @foreach (array() as $county)
                        <option value="{{ $county->id }}"{{ old('geo_county_id') === $county->id ? ' selected' : '' }}>{{ $county->id.' – '.$county->name }}</option>
                        @endforeach
                    </select>
                </div>
                @if ($errors->has('geo_county_id'))
                <p class="alert error">{{ $errors->first('geo_county_id') }}</p>
                @endif
            </fieldset>

            <div>
                <button type="submit">Valider</button>
            </div>
        </form>
    </div>
</main>
@endsection
