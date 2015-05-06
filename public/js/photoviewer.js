
var album_elem = document.querySelector('#album-container');

if (album_elem) {
	var viewer = {
		album_elem: album_elem,
		initialize: function () {
			document.documentElement.classList.add('photo-viewer');

			this.user = {
				_id: this.album_elem.dataset.userId
			};
			this.album = {
				_id: this.album_elem.dataset.albumId
			};

			this.album_info_elem = this.album_elem.querySelector('.album-info')
			
			var album_desc_elem = this.album_elem.querySelector('.album-description')
			if (album_desc_elem && album_desc_elem.innerHTML) {
				this.album.description = album_desc_elem.innerHTML;
			}

			this.form_container = this.album_elem.querySelector('#form-photo');

			if (this.form_container) {
				this.album_info_elem.appendChild(this.form_container);
			}

			this.photos_container = this.album_elem.querySelector('.album-photos');

			this.thumbs_container = document.createElement('ul');
			this.thumbs_container.classList.add('album-thumbs');

			this.photos_elem = this.photos_container.querySelectorAll('li[id^="photo-"]');
			this.photos = new Array(this.photos_elem.length);

			if (this.photos_container.nextSibling) {
				this.photos_container.parentNode.insertBefore(this.thumbs_container, this.photos_container.nextSibling);
			}
			else {
				this.photos_container.parentNode.appendChild(this.thumbs_container);
			}

			this.thumbs_sizes = this.thumbs_container.offsetHeight || (16 * 5.5);

			Array.prototype.forEach.call(this.photos_elem, function (li, index) {
				var photo = {
					_id: li.id.replace(/^photo-/, '')
				};

				var title_elem = li.querySelector('.photo-caption')
				if (title_elem && title_elem.innerHTML) {
					photo.title = title_elem.innerHTML;
				}

				if (!li.dataset || !li.dataset.photoSrc) {
					console.error('Nom photo introuvable', li);
					return;
				}
				photo.src = li.dataset.photoSrc;

				if (index === 0) {
					if (!window.location.hash || !document.querySelector(window.location.hash) || !document.querySelector(window.location.hash).dataset || !document.querySelector(window.location.hash).dataset.photoSrc) {
						window.location.hash = '#' + li.id;
					}
				}
				else {
					// li.classList.add('hidden');
				}

				var thumb_elem = document.createElement('li');
				thumb_elem.dataset.photoId = photo._id;

				var thumb_link = document.createElement('a');
				thumb_link.href = '#' + li.id;

				var thumb_img = document.createElement('img');
				thumb_img.src = '/photo/' + this.user._id + '/' + this.album._id + '/' + this.thumbs_sizes + 'x' + this.thumbs_sizes + 'x1/' + photo.src;
				thumb_img.alt = photo.title || '';

				thumb_link.appendChild(thumb_img);
				thumb_elem.appendChild(thumb_link);
				this.thumbs_container.appendChild(thumb_elem);

				var figure = li.querySelector('.photo')
				if (figure) {
					figure.removeAttribute('tabindex');
				}

				this.photos.push(photo);
			}, this);

			this.photos_container.parentNode.insertBefore(this.photos_container, this.photos_container.parentNode.firstChild);

			setTimeout((function () {
				var photo_width = this.photos_container.clientHeight;
				var photo_height = this.photos_container.clientHeight;
				Array.prototype.forEach.call(this.photos_elem, function (li, index) {
					var photo_big = li.querySelector('picture');

					var photo_width = li.firstElementChild.clientWidth;
					var photo_height = li.firstElementChild.clientHeight;
				console.dir(photo_width);
				console.dir(photo_height);

					console.dir(photo_big);

					if (photo_big) {
						photo_big.style.maxWidth = photo_width + 'px';
						photo_big.style.maxHeight = photo_height + 'px';
					}

					Array.prototype.forEach.call(photo_big.children, function (src) {
						console.dir(src);
						if (src.style) {
							src.style.maxWidth = photo_width + 'px';
							src.style.maxHeight = photo_height + 'px';
						}
					})
				}, this);
			}).bind(this), 0);
		}
	};

	viewer.initialize();
}