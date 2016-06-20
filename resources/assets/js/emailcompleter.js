(function () {
	EmailCompleter = function (input, trigger_char, domains) {
		this.input = input;
		this.trigger_char = trigger_char || this.defaults.trigger_char;
		this.domains = domains || this.defaults.domains;

		this.datalist = document.createElement('datalist');

		if (!input.id) {
			input.id = 'input-' + Date.now();
		}

		this.datalist.id = input.id + '-emailcompleter-datalist';
		this.input.setAttribute('list', this.datalist.id);
		if (this.input.nextSibling) {
			this.input.parentNode.insertBefore(this.datalist, this.input);
		}
		else {
			this.input.parentNode.appendChild(this.datalist);
		}

		this.updateDatalist();

		this.input.addEventListener('input', this.updateDatalist.bind(this), false);

		return this;
	};

	EmailCompleter.prototype.defaults = {
		trigger_char: '@',
		domains: ['gmail.com', 'orange.fr', 'hotmail.fr', 'free.fr', 'yahoo.fr', 'laposte.net', 'voila.fr', 'me.com', 'hotmail.com', 'icloud.com', 'yahoo.com', 'facebook.com']
	};

	EmailCompleter.prototype.updateDatalist = function () {
		var address_parts = this.input.value.split(this.trigger_char);

		while (this.datalist.firstChild) {
			this.datalist.removeChild(this.datalist.firstChild);
		}

		if (address_parts.length < 2) {
			return;
		}

		this.domains.forEach((function (domain) {
			if (address_parts[1] && domain.toLowerCase().substring(0, address_parts[1].length) !== address_parts[1].toLowerCase()) {
				return;
			}

			var option = document.createElement('option');
			option.value = address_parts[0] + this.trigger_char + domain;
			this.datalist.appendChild(option);
		}).bind(this));
	};


	document.addEventListener('DOMContentLoaded', function () {
		Array.prototype.forEach.call(document.querySelectorAll('input[data-emailcompleter]'), function (input) {
			new EmailCompleter(input);
		});
	}, false);
})();
