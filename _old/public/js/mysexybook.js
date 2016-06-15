var MySexyBook = {
	currentScroll: 0,
	scrollTimeout: null,
	scrollCheckInterval: 1000/30,

	initialize: function () {
		document.documentElement.classList.add('js');

		this.currentScroll = 0;

		this.checkScroll();
	},
	checkScroll: function () {
		var scroll = window.scrollY;

		if (scroll !== this.currentScroll) {
			var difference = scroll - this.currentScroll;
			this.currentScroll = scroll;
			this.onScroll(difference);
		}

		this.scrollTimeout = setTimeout(this.checkScroll.bind(this), this.scrollCheckInterval);
	},
	onScroll: function (difference) {
		if (this.currentScroll > 0) {
			document.documentElement.classList.add('scrolled');
		}
		else {
			document.documentElement.classList.remove('scrolled');
		}
	}
};

document.addEventListener('DOMContentLoaded', MySexyBook.initialize.bind(MySexyBook), false);