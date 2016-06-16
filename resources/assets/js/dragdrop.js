(function () {
	DragDrop = function (area, onDrop, options) {
		this.area = area;

		if (onDrop) {
			this.setOnDrop(onDrop);
		}

		if (options.onDragEnter) {
			this.setOnDragEnter(options.onDragEnter);
		}
		if (options.onDragOver) {
			this.setOnDragOver(options.onDragOver);
		}
		if (options.onDragLeave) {
			this.setOnDragLeave(options.onDragLeave);
		}

		return this;
	};

	DragDrop.prototype.setOnDragEnter = function (listener) {
		if (typeof listener !== 'function') {
			return false;
		}

		this.onDragEnter = listener;
		this.area.addEventListener('dragenter', this.onDragEnter.bind(this), false);
	};
	DragDrop.prototype.setOnDragOver = function (listener) {
		if (typeof listener !== 'function') {
			return false;
		}
		
		this.onDragOver = listener;
		this.area.addEventListener('dragover', this.onDragOver.bind(this), false);
	};
	DragDrop.prototype.setOnDragLeave = function (listener) {
		if (typeof listener !== 'function') {
			return false;
		}
		
		this.onDragLeave = listener;
		this.area.addEventListener('dragleave', this.onDragLeave.bind(this), false);
	};
	DragDrop.prototype.setOnDrop = function (listener) {
		if (typeof listener !== 'function') {
			return false;
		}
		
		this.onDrop = listener;
		this.area.addEventListener('drop', this.onDrop.bind(this), false);
	};

	document.addEventListener('DOMContentLoaded', function () {
		Array.prototype.forEach.call(document.querySelectorAll('[data-drag-drop-area]'), function (area) {
			new DragDrop(area, function (e) {
				e.preventDefault();
				console.log('drop', arguments);

				var formData = new FormData(this.area.form);
				var files = e.dataTransfer.files;
				console.dir(formData);
				console.dir(files);
				return false;
			}, {
				onDragEnter : function (e) {
					this.area.classList.add('hover');
					console.log('dragEnter', arguments);
				},
				onDragOver : function (e) {
					console.log('dragOver', arguments);
				},
				onDragLeave : function (e) {
					this.area.classList.remove('hover');
					console.log('dragLeave', arguments);
				}
			});
		});
	}, false);
})();
