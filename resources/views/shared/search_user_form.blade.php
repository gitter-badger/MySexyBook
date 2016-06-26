<form action="{{ url('search/user') }}" method="get" id="user-search-form">
	<fieldset>
		<legend>Rechercher un utilisateur</legend>

		@if(!empty($camera_sides))
		<div>
			<label for="search-user-camera_side-any">Côté de la caméra</label>
			@foreach ($camera_sides as $side_id => $side_label)
			<label>
				<input type="radio" name="camera_side" id="search-user-camera_side-{{ $side_id }}" required value="{{ $side_id }}"{{ old('camera_side') === $side_id ? ' checked' : '' }}>
				<span class="radio-label">{{ $side_label }}</span>
			</label>
			@endforeach
			<label>
				<input type="radio" name="camera_side" id="search-user-camera_side-any" value="any"{{ empty($camera_sides[old('camera_side', 'any')]) ? ' checked' : '' }}>
				<span class="radio-label">Peu Importe</span>
			</label>
		</div>
		@endif

		@if(!empty($sexes))
		<div>
			<label for="search-user-sex-any">Sexe</label>
			@foreach ($sexes as $sex_id => $sex_label)
			<label>
				<input type="radio" name="sex" id="search-user-sex-{{ $sex_id }}" required value="{{ $sex_id }}"{{ old('sex') === $sex_id ? ' checked' : '' }}>
				<span class="radio-label">{{ $sex_label }}</span>
			</label>
			@endforeach
			<label>
				<input type="radio" name="sex" id="search-user-sex-any" value="any"{{ empty($sexs[old('sex', 'any')]) ? ' checked' : '' }}>
				<span class="radio-label">Peu Importe</span>
			</label>
		</div>
		@endif

		<div>
			<label for="search-user-pseudo">Pseudo</label>
			<input type="search" name="pseudo" id="search-user-pseudo" size="12" pattern="[a-zA-Z0-9]+" placeholder="Utilisateurs dont le pseudo contient…" value="{{ old('pseudo') }}" />
		</div>

		@if(!empty($geo_counties))
		<div>
			<label for="search-user-geo_county">Département</label>
			<select name="geo_county" id="search-user-geo_county" size="1">
				<option value="">— Limiter la recherche à un département</option>
                @foreach($geo_counties as $county)
                <option value="{{ $county->id }}"{{ old('geo_county_id') === $county->id ? ' selected' : '' }}>{{ $county->id.' – '.$county->name }}</option>
                @endforeach
			</select>
		</div>
		@endif
	</fieldset>

	<div>
		<button type="submit">Recherche</button>
	</div>
</form>
