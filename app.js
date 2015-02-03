var Promise = require('promise');
var fs = require('fs');
var crypto = require('crypto');
var http = require('http');
var https = require('https');
var pmongo = require('promised-mongo');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var multer = require('multer');
var validator = require('validator');
var strftime = require('strftime').localizedStrftime({
	days: [ 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi' ],
	shortDays: [ 'dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam' ],
	months: [ 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre' ],
	shortMonths: [ 'jan', 'fev', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc' ]
});
require('./public/js/prototypes.js');
var dots = require('dot').process({ path: __dirname + '/views'});
var render = require('./render');

var app = express();

app.locals.url = 'http://127.0.0.1:8080';
app.locals.domain = '127.0.0.1';
app.locals.title = 'My Sexy Book';
app.locals.strftime = strftime;
app.locals.root_url = '//mysexybook.photo';
app.locals.contact_email = 'contact@mysexybook.photo';
app.locals.isSecure = false;

var ACCOUNTS_TYPES = {
	banned: 1<<0,
	pending: 1<<1,
	model: 1<<2,
	photographer: 1<<3,
	moderator: 1<<4,
	admin: 1<<5
};

var ACCOUNTS_RIGHTS = {
	viewPublicBook: 1<<0,
	viewPrivateBook: 1<<1,
	editOwnBooks: 1<<2,
	editAllBooks: 1<<3
};

var db = pmongo('mysexybook', ['users']);

db.collection('users').ensureIndex({ email: 1 }, { unique: true, dropDups: true });
db.collection('users').ensureIndex({ email: 1, password: 1 });
db.collection('users').ensureIndex({ pseudo: 1 }, { unique: true, dropDups: true });

db.collection('albums').ensureIndex({ creator: 1 });
db.collection('albums').ensureIndex({ creator: 1, title: 1 }, { unique: true, dropDups: true });

try{
	http.createServer(app).listen(8080);

	// var https_options = {
	//	 hostname: 'mysexybook.photo',
	//	 port: 443,
	//	 key: fs.readFileSync('config/keys/mysexybook.photo.key.pem'),
	//	 cert: fs.readFileSync('config/keys/mysexybook.photo.csr.pem')
	// };
	//
	// https.createServer(https_options, app).listen(443);

	app.locals.isSecure = true;
	
	console.log('Node server started listening');
}
catch(e) {
	console.error(e);
}

function getView (req, view_name, data) {
	if (!dots[view_name]) {
		throw 'View not found';
	}

	var view_data = {
		app: app.locals,
		req: req,
		strftime: strftime
	};

	if (data) {
		view_data.extend(data);
	}

	view_data.req = req;

	if (req.session && req.session.current_user) {
		view_data.current_user = req.session.current_user;
	}
	return dots._header(view_data) + 
			dots[view_name](view_data) + 
			dots._footer(view_data);
}

function hashPassword (pwd) {
	var salt_start = 'tO2fzydPnJp2D131Mdg3cHZuJ107PXvl8RDYj0jKsuRUYCVaeXQB9lddkDjQP71MFJOAfoibt5RbxL7iU3LFZDS5JS9BeCEvwGVZ';
	var salt_end = 'fzCePky09hmAP8le8lAhQ2Mf1eiXSg3y2GKOHLEOwYnOdvi1wakeC4hEueAbEyhEFFEL4gfyzi0ifARGCcVAwhH5h8HR4QTrdgau';
	return crypto.createHash('sha512').update(salt_start + pwd + salt_end).digest('hex');
}

app.use(cookieParser());
app.use(session({
	secret: 'WYbOleljxIs84Yog9lL1hF3bP5WFOrNXLHQAcU8GHw8aXEau7z6QKk6XYn8V',
	resave: false,
	saveUninitialized: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer());

app.use('/assets', express.static(__dirname + '/public'));

app.use(function (req, res, next) {
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.setHeader('Content-language', 'fr_FR');

	if (req.cookies && req.cookies.user_id) {
		db.collection('users').findOne({
			_id: pmongo.ObjectId(req.cookies.user_id)
		}).then(function (user) {
			if (!user) {
				res.clearCookie('user_id');
				next();
				return;
			}

			req.session.current_user = user;
			next();
		});
	}
	else {
		next();
	}
});

app.route('/').get(function (req, res) {
	db.collection('users').find({  }).sort({ register_date: 1 }).limit(10).toArray().then(function (last_users) {
		res.write(getView(req, 'index', { last_users: last_users }));
		res.end();
	});
});

app.route('/book/:userid').get(function (req, res, next) {
	db.collection('users').findOne({ pseudo: req.params.userid }).then(function (user) {
		if (!user) {
			next();
			return;
		}

		db.collection('albums').find({ creator: user._id }).toArray().then(function (albums) {
			res.write(getView(req, 'user_profile', { user: user, albums: albums }));
			res.end();
		});
	});
});

app.route('/book/:userid/:albumid').all(function (req, res, next) {
	if (!validator.isMongoId(req.params.albumid)) {
		next('route');
		return;
	}

	db.collection('users').findOne({
		pseudo: req.params.userid
	}).then(function (user) {
	throw 'Point 2';
		if (!user) {
			next('route');
			return;
		}
	throw 'Point 3';

		db.collection('albums').findOne({
			_id: pmongo.ObjectId(req.params.albumid)
		}).then(function (album) {
	throw 'Point 4';
			if (!album) {
				next('route');
				return;
			}
	throw 'Point 5';

			res.locals.user = user;
			res.locals.album = album;

			next();
		});
	});
}).post(function (req, res, next) {
	if(!res.locals.user || !res.locals.album) {
		next();
		return;
	}
	if (req.files) {
		throw JSON.stringify(req.files);
		return;
	}

	res.write(getView(req, 'user_album', { user: res.locals.user, album: res.locals.album }));
	res.end();
}).get(function (req, res, next) {
	if(!res.locals.user || !res.locals.album) {
		next();
		return;
	}

	res.write(getView(req, 'user_album', { user: res.locals.user, album: res.locals.album }));
	res.end();
});

app.route('/recherche').get(function (req, res, next) {
	db.collection('users').find({ pseudo: new RegExp(req.query.user.pseudo, 'i') }).limit(50).toArray().then(function (search_results) {
		res.write(getView(req, 'search', { search_term: req.query.user.pseudo, search_results: search_results }));
		res.end();
	});
});

app.route('/inscription').all(function (req, res, next) {
	if (req.session.current_user) {
		res.redirect(app.locals.url + '/');
		res.end();
		return;
	}
	next();
}).post(function (req, res, next) {
	if (!req.body.user) {
		var form_error = 'Formulaire invalide';
	}
	else if (!req.body.user.email || !validator.isEmail(req.body.user.email)) {
		var form_error = 'Adresse e-mail invalide';
	}
	else if (!req.body.user.password || !validator.isLength(req.body.user.password, 8)) {
		var form_error = 'Mot de passe invalide';
	}
	else if (!req.body.user.pseudo || !validator.isAlphanumeric(req.body.user.pseudo) || !validator.isLength(req.body.user.pseudo, 4, 30)){
		var form_error = 'Pseudo invalide';
	}
	// if (!req.body.user.area) {
	// 	var form_error = 'Département invalide';
	// }

	if (form_error) {
		res.write(getView(req, 'register', { form_error: form_error }));
		res.end();
		return;
	}

	db.collection('users').findOne({
		pseudo: req.body.user.pseudo
	}).then(function (profile_pseudo) {
		if (profile_pseudo) {
			res.write(getView(req, 'register', { form_error: 'Ce pseudo est déjà utilisé' }));
			res.end();
			return;
		}

		db.collection('users').findOne({
			email: req.body.user.email
		}).then(function (profile_email) {
			if (profile_email) {
				res.write(getView(req, 'register', { form_error: 'Cette adresse e-mail a déjà un compte : avez-vous <a href="' + app.locals.url + '/mot-de-passe-perdu" title="Cliquez pour récupérer votre compte">perdu votre mot de passe</a> ?' }));
				res.end();
				return;
			}

			db.collection('users').insert({
				email: req.body.user.email,
				password: hashPassword(req.body.user.password),
				pseudo: req.body.user.pseudo,
				register_date: new Date()
			}).then(function (user) {
				if (!user) {
					res.write(getView(req, 'register', { form_error: 'Erreur lors de l\'enregistrement du profil' }));
					res.end();
					return;
				}

				req.session.current_user = user;
				res.cookie('user_id', user._id);
				res.redirect(app.locals.url + '/');
				res.end();
			});
		});
	});
}).get(function (req, res, next) {
	res.write(getView(req, 'register'));
	res.end();
});

app.route('/mot-de-passe-perdu').all(function (req, res, next) {
	if (req.session.current_user) {
		res.redirect(app.locals.url + '/');
		res.end();
		return;
	}
	next();
}).post(function (req, res, next) {
	if (!req.body.user) {
		var form_error = 'Formulaire invalide';
	}
	else if (!req.body.user.email || !validator.isEmail(req.body.user.email)) {
		var form_error = 'Adresse e-mail invalide';
	}

	if (form_error) {
		res.write(getView(req, 'password', { form_error: form_error }));
		res.end();
		return;
	}

	db.collection('users').findOne({
		email: req.body.user.email
	}).then(function (user) {
		if (!user) {
			res.write(getView(req, 'password', { form_error: 'Aucun compte existe avec cette adresse e-mail' }));
			res.end();
			return;
		}

		// var new_password = (Math.random()*0xFFFFFF<<0).toString(16);

		res.redirect(app.locals.url + '/connexion');
		res.end();
	});
}).get(function (req, res, next) {
	res.write(getView(req, 'password'));
	res.end();
});

app.route('/connexion').all(function (req, res, next) {
	if (req.session.current_user) {
		res.redirect(app.locals.url + '/');
		res.end();
		return;
	}
	next();
}).post(function (req, res, next) {
	if (!req.body.user) {
		var form_error = 'Formulaire invalide';
	}
	else if (!req.body.user.email || !validator.isEmail(req.body.user.email)) {
		var form_error = 'Adresse e-mail invalide';
	}
	else if (!req.body.user.password || !validator.isLength(req.body.user.password, 8)) {
		var form_error = 'Mot de passe invalide';
	}

	if (form_error) {
		res.write(getView(req, 'login', { form_error: form_error }));
		res.end();
		return;
	}

	db.collection('users').findOne({
		email: req.body.user.email,
		password: hashPassword(req.body.user.password)
	}).then(function (user) {
		if (!user) {
			res.write(getView(req, 'login', { form_error: 'Ces identifiants sont incorrects' }));
			res.end();
			return;
		}

		req.session.current_user = user;
		res.cookie('user_id', user._id);
		res.redirect(app.locals.url + '/');
		res.end();
	});
}).get(function (req, res, next) {
	res.write(getView(req, 'login'));
	res.end();
});

app.route('/mes-photos').all(function (req, res, next) {
	if (!req.session.current_user) {
		res.redirect(app.locals.url + '/');
		res.end();
		return;
	}
	next();
}).get(function (req, res, next) {
	db.collection('albums').find({
		creator: pmongo.ObjectId(req.session.current_user._id)
	}).toArray().then(function (albums) {
		res.write(getView(req, 'user_photos', { albums: albums }));
		res.end();
	});
});

app.route('/nouvel-album').all(function (req, res, next) {
	if (!req.session.current_user) {
		res.redirect(app.locals.url + '/');
		res.end();
		return;
	}
	next();
}).post(function (req, res, next) {
	if (!req.body.album) {
		var form_error = 'Formulaire invalide';
	}
	else if (!req.body.album.title || !validator.isLength(req.body.album.title, 1, 50)) {
		var form_error = 'Titre invalide';
	}

	if (form_error) {
		res.write(getView(req, 'new_album', { form_error: form_error }));
		res.end();
		return;
	}
		// console.error('Fail 1');

	db.collection('albums').findOne({
		creator: pmongo.ObjectId(req.session.current_user._id),
		title: req.body.album.title
	}).then(function (album_title) {
		// console.error('Fail 2');
		if (album_title) {
			res.write(getView(req, 'new_album', { form_error: 'Vous avez déjà un album portant ce nom' }));
			res.end();
			return;
		}

		var new_album = {
			creator: pmongo.ObjectId(req.session.current_user._id),
			title: req.body.album.title
		};

		if (req.body.album.description) {
			new_album.description = req.body.album.description;
		}

		new_album.created_at = new Date();

		db.collection('albums').insert(new_album).then(function (album) {
			if (!album) {
				res.write(getView(req, 'new_album', { form_error: 'Erreur lors de l\'enregistrement de l\'album' }));
				res.end();
				return;
			}

			res.redirect(app.locals.url + '/mes-photos');
			res.end();
		});
	});
}).get(function (req, res, next) {
	res.write(getView(req, 'new_album'));
	res.end();
});

app.route('/deconnexion').get(function (req, res, next) {
	req.session.current_user = null;
	res.clearCookie('user_id');
	res.redirect(app.locals.url + '/');
	res.end();
});

app.route('/db_reset').get(function (req, res, next) {
	db.collection('users').remove({});
	db.collection('albums').remove({});
	res.redirect(app.locals.url + '/');
	res.write('Reset done');
	res.end();
});

app.route('*').all(function (req, res, next) {
	res.status(404);

	res.write(getView(req, 'error404'));

	res.end();
});
