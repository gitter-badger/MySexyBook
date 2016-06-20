(function () {
	String.prototype.toSlug = function () {
		var value = "" + this; // On évite d'écraser la chaîne d'origine en créant une copie de travail

		// `re` correspond à la regex de recherche, `ch` étant le caractère correspondant (celui à utiliser en remplacement)
		var accents = [
			{ re: /[\xC0-\xC6]/g, ch: 'A' },
			{ re: /[\xE0-\xE6]/g, ch: 'a' },
			{ re: /[\xC8-\xCB]/g, ch: 'E' },
			{ re: /[\xE8-\xEB]/g, ch: 'e' },
			{ re: /[\xCC-\xCF]/g, ch: 'I' },
			{ re: /[\xEC-\xEF]/g, ch: 'i' },
			{ re: /[\xD2-\xD6]/g, ch: 'O' },
			{ re: /[\xF2-\xF6]/g, ch: 'o' },
			{ re: /[\xD9-\xDC]/g, ch: 'U' },
			{ re: /[\xF9-\xFC]/g, ch: 'u' },
			{ re: /[\xC7-\xE7]/g, ch: 'c' },
			{ re: /[\xD1]/g, ch: 'N' },
			{ re: /[\xF1]/g, ch: 'n' }
		];

		// On convertit les caractères accentués en leurs équivalent alphanumériques (via le tableau défini juste au-dessus)
		for (var i=0, nb=accents.length; i<nb; i++) {
			value = value.replace(accents[i].re, accents[i].ch);
		}

		// On passe en minuscules, on remplace les espaces par des tirets, on enlève les caractères non-alphanumériques puis on enlève les tirets multiples
		return value.toLowerCase()
					.replace(/\s+/g, '-')
					.replace(/[^a-z0-9-]/g, '')
					.replace(/\-{2,}/g,'-');
	};

	Object.prototype.extend = function(obj) {
		for (var i in obj) {
			this[i] = obj[i];
		}
		return this;
	};
})();
