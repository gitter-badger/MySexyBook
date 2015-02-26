
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

			var album_desc_elem = this.album_elem.querySelector('.album-description')
			if (album_desc_elem && album_desc_elem.innerHTML) {
				this.album.description = album_desc_elem.innerHTML;
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

			console.log(this.thumbs_sizes);
			console.dir(this.thumbs_container);

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

				if (index > 0) {
					li.classList.add('hidden');
				}

				var thumb_elem = document.createElement('li');
				thumb_elem.dataset.photoId = photo._id;

				var thumb_img = document.createElement('img');
				thumb_img.src = '/photo/' + this.user._id + '/' + this.album._id + '/' + this.thumbs_sizes + 'x' + this.thumbs_sizes + 'x1/' + photo.src;

				thumb_elem.appendChild(thumb_img);
				this.thumbs_container.appendChild(thumb_elem);

				this.photos.push(photo);
			}, this);

			this.photos_container.parentNode.insertBefore(this.photos_container, this.photos_container.parentNode.firstChild);
		}
	};

	viewer.initialize();

	console.dir(viewer);
}