@extends('layouts.app', ['page_id' => 'home'])

@section('content')
<main id="page">
	<header id="home-landing">
		<div class="container">
			<h1>La photo sexy et sociale</h1>

			<h2>Trouvez un modèle parfait, un photographe créatif ou tout simplement de l'inspiration</h2>
		</div>
	</header>

	<article id="home-content">
		<div class="container">
			@if(!empty($last_photos))
			<section>
				<h2>Dernières photos mises en ligne</h2>
				<ul class="photos-list" id="last-uploaded-photos">
					@foreach($last_photos as $photo)
					<li class="photo">
						<a href="{{ url('/book/'.$photo->owner->pseudo.'/'.$photo->album_id.'/'.$photo->id) }}">
							<figure>
								<picture class="photo-thumb">
									<source srcset="{{ url('/photo/'.$photo->owner_id.'/'.$photo->album_id.'/182x182x1/'.$photo->src) }}" media="(max-width: 25em)">
									<source srcset="{{ url('/photo/'.$photo->owner_id.'/'.$photo->album_id.'/238x238x1/'.$photo->src) }}" media="(max-width: 32em)">
									<source srcset="{{ url('/photo/'.$photo->owner_id.'/'.$photo->album_id.'/195x195x1/'.$photo->src) }}" media="(max-width: 40em)">
									<source srcset="{{ url('/photo/'.$photo->owner_id.'/'.$photo->album_id.'/200x200x1/'.$photo->src) }}" media="(max-width: 50em)">
									<source srcset="{{ url('/photo/'.$photo->owner_id.'/'.$photo->album_id.'/134x134x1/'.$photo->src) }}" media="(max-width: 60em)">
									<source srcset="{{ url('/photo/'.$photo->owner_id.'/'.$photo->album_id.'/166x166x1/'.$photo->src) }}" media="(max-width: 80em)">
									<img srcset="{{ url('/photo/'.$photo->owner_id.'/'.$photo->album_id.'/230x230x1/'.$photo->src) }}" alt="">
								</picture>
								@if(!empty($photo->owner))
								<figcaption class="photo-owner">
									<span class="sr-only">Par</span> {{ $photo->owner->pseudo }}
								</figcaption>
								@endif
							</figure>
						</a>
					</li>
					@endforeach
				</ul>
			</section>
			@endif

			@if(!empty($last_users))
			<section>
				<h2>Derniers inscrits</h2>
				<ul class="users-list" id="last-registered-users">
					@foreach($last_users as $user)
					<li class="user">
						<a href="{{ url('/book/'.$user->pseudo) }}">
							<figure>
								<picture class="user-avatar">
									<source srcset="{{ url('/avatar/182x182x1/'.$user->id) }}" media="(max-width: 25em)">
									<source srcset="{{ url('/avatar/238x238x1/'.$user->id) }}" media="(max-width: 32em)">
									<source srcset="{{ url('/avatar/195x195x1/'.$user->id) }}" media="(max-width: 40em)">
									<source srcset="{{ url('/avatar/200x200x1/'.$user->id) }}" media="(max-width: 50em)">
									<source srcset="{{ url('/avatar/134x134x1/'.$user->id) }}" media="(max-width: 60em)">
									<source srcset="{{ url('/avatar/166x166x1/'.$user->id) }}" media="(max-width: 80em)">
									<img srcset="{{ url('/avatar/230x230x1/'.$user->id) }}" alt="">
								</picture>
								<figcaption class="user-pseudo">{{ $user->pseudo }}</figcaption>
							</figure>
						</a>
					</li>
					@endforeach
				</ul>
			</section>
			@endif

			<section>
				<h2>Rechercher un profil</h2>

			</section>
		</div>
	</article>
</main>
@endsection
