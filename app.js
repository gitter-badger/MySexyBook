var pkg = require('./package.json');

var Promise = require('promise');
var fs = require('fs');
var querystring = require('querystring');
var mime = require('mime-types');
var gm = require('gm');
var crypto = require('crypto');
var http = require('http');
var https = require('https');
var pmongo = require('promised-mongo');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var multer = require('multer');
var validator = require('validator');
var sanitize = require('sanitize-caja');
var MarkDown = require('markdown-it');
var strftime = require('strftime').localizedStrftime({
	days: [ 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi' ],
	shortDays: [ 'dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam' ],
	months: [ 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre' ],
	shortMonths: [ 'jan', 'fev', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc' ]
});
require('./public/js/prototypes.js');

var app = express();

switch (app.get('env')) {
	case 'production':
		var app_config = require('./config/app-production.json');
		app.locals.url = 'http://mysexybook.photo';
		app.locals.domain = 'mysexybook.photo';
	break;

	case 'development':
	case 'test':
	default:
		var app_config = require('./config/app-development.json');
		app.locals.url = 'http://127.0.0.1:' + pkg.config.port;
		app.locals.domain = '127.0.0.1';
	break;
}

app.locals.title = 'My Sexy Book';
app.locals.querystring = querystring;
app.locals.sanitize = sanitize;
app.locals.markdown = new MarkDown();
app.locals.markdown_inline = new MarkDown('zero', { breaks: true }).enable([ 'newline', 'emphasis' ]);
app.locals.strftime = strftime;
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

/* Database */
var db = pmongo('mysexybook', ['users', 'albums', 'geo_counties']);

db.collection('users').dropIndexes();
db.collection('users').ensureIndex({ email: 1 }, { unique: true, dropDups: true });
db.collection('users').ensureIndex({ email: 1, password: 1 });
db.collection('users').ensureIndex({ pseudo: 1 }, { unique: true, dropDups: true });
db.collection('users').ensureIndex({ geo_county_id: 1 });

db.collection('albums').dropIndexes();
db.collection('albums').ensureIndex({ creator: 1 });
db.collection('albums').ensureIndex({ created_at: 1 });
db.collection('albums').ensureIndex({ 'photos.uploaded_at': 1 });
db.collection('albums').ensureIndex({ creator: 1, title: 1 }, { unique: true, dropDups: true });

db.collection('geo_counties').dropIndexes();
db.collection('geo_counties').ensureIndex({ name: 1 }, { unique: true });

/* Template engine */
var util = require('util');
var dots = require('dot').process({ path: __dirname + '/views'});
app.engine('dot', function (view_path, data, callback) {
	var view_name = this.name;

	if (!dots[view_name]) {
		throw 'View not found';
	}

	return callback(null, dots[view_name](data));
});
app.set('views', './views');
app.set('view engine', 'dot');

try{
	http.createServer(app).listen(pkg.config.port);

	// if (app.get('env') === 'production') {
	// 	var https_options = {
	// 		hostname: 'mysexybook.photo',
	// 		port: 443,
	// 		key: fs.readFileSync('config/keys/mysexybook.photo.key.pem'),
	// 		cert: fs.readFileSync('config/keys/mysexybook.photo.csr.pem')
	// 	};
		
	// 	https.createServer(https_options, app).listen(443);
		
	// 	app.locals.isSecure = true;

	// 	app.locals.url = app.locals.url.replace(/^\/\//, 'https://');
	// }
	
	console.log('Node server started listening');
}
catch(e) {
	console.error(e);
}

function hashPassword (pwd) {
	return crypto.createHash('sha512').update(app_config.pwd_salt_start + pwd + app_config.pwd_salt_end).digest('hex');
}

app.use(cookieParser());
app.use(session({
	secret: app_config.session_secret,
	resave: false,
	saveUninitialized: true,
	// store: new MongoStore({ db: db }),
	store: new MongoStore({ url: 'mongodb://localhost/mysexybook' }),
	cookie: {
		secure: app.locals.isSecure
	}
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer());

app.use('/assets', express.static(__dirname + '/public'));

app.use(function (req, res, next) {
	res.header('Content-Type', 'text/html; charset=utf-8');
	res.header('Cache-Control', 'no-cache');
	res.header('Content-language', 'fr_FR');

	res.locals.dots = dots;
	res.locals.app = app.locals;
	res.locals.req = req;

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
			res.locals.current_user = user;
			next();
		});
	}
	else if(req.session && req.session.current_user) {
		res.local.current_user = req.session.current_user;
	}
	else {
		next();
	}
});

app.route('/avatar/:dimensions/:userid').get(function (req, res, next) {
	var dimensions = req.params.dimensions.split('x');

	if (!dimensions[1]) {
		dimensions[1] = dimensions[0];
	}

	if (!dimensions[2]){
		var crop_thumb = false;
	}
	else{
		var crop_thumb = true;
	}

	db.collection('users').findOne({
		_id: pmongo.ObjectId(req.params.userid)
	}).then(function (user){
		if (!user || !user.avatar || !user.avatar.file_src) {
			var original_path = 'uploads/originals/default_avatar' + (user && user.sex ? '_' + user.sex : '') + '.png';
			var thumb_path = 'uploads/thumbs/' + dimensions[0] + 'x' + dimensions[1] + 'x' + (crop_thumb ? '1' : '0') + '_default_avatar' + (user && user.sex ? '_' + user.sex : '') + '.png';
		}
		else {
			var original_path = 'uploads/originals/' + user._id + '/' + user.avatar.file_src;
			var thumb_path = 'uploads/thumbs/' + user._id + '/' + dimensions[0] + 'x' + dimensions[1] + 'x' + (crop_thumb ? '1' : '0') + '_' + user.avatar.file_src;
		}

		fs.exists(thumb_path, function (exists) {
			if (exists) {
				var stat = fs.statSync(thumb_path);

				res.header('Content-Type', mime.lookup(thumb_path));
				res.header('Content-Length', stat.size);
				res.header('Cache-Control', 'public');

				fs.createReadStream(thumb_path).pipe(res);
				return;
			}
			else {
				fs.readFile(original_path, function (err, data) {
					if (err && !data) {
						next('route');
						return;
					}

					var original_img = gm(data, thumb_path);

					var original_info = {};

					original_img.size(function (err, info) {
						if (err && !info) {
							return;
						}

						if (!info.ratio && (info.width && info.height)) {
							info.ratio = info.width / info.height;
						}
						if (!info.orientation && (info.width && info.height)) {
							if (info.width > info.height) {
								info.orientation = 'landscape';
							}
							else if (info.width < info.height) {
								info.orientation = 'portrait';
							}
							else{
								info.orientation = 'square';
							}
						}

						original_info = info;

						if (crop_thumb) {
							var crop_ratio = dimensions[0]/dimensions[1];
							if (crop_ratio > original_info.ratio) {
								// Coupe haut et bas
								var crop_dimensions = {
									w: original_info.width,
									h: parseInt(original_info.width * crop_ratio),
									x: 0,
									y: 0
								};
								crop_dimensions.y = parseInt((original_info.height / 2) - (crop_dimensions.h / 2));
							}
							else if (crop_ratio < original_info.ratio) {
								var crop_dimensions = {
									w: parseInt(original_info.height * crop_ratio),
									h: original_info.height,
									x: 0,
									y: 0
								};
								crop_dimensions.x = parseInt((original_info.width / 2) - (crop_dimensions.w / 2));
							}

							if (crop_dimensions) {
								var thumb_img = original_img.crop(crop_dimensions.w, crop_dimensions.h, crop_dimensions.x, crop_dimensions.y).resize(dimensions[0], dimensions[1]);
							}
						}

						if (!thumb_img) {
							var thumb_img = original_img.resize(dimensions[0], dimensions[1]);
						}

						thumb_img.write(thumb_path, function (err) {
							if (err) {
								console.error(err);
								return;
							}

							var stat = fs.statSync(thumb_path);

							res.header('Content-Type', mime.lookup(thumb_path));
							res.header('Content-Length', stat.size);
							res.header('Cache-Control', 'public');

							fs.createReadStream(thumb_path).pipe(res);
						});
					});
				});
				return;
			}
		});
	});
});

app.route('/photos/:userid/:albumid/:dimensions/:photosrc').get(function (req, res, next) {
	db.collection('users').findOne({
		_id: pmongo.ObjectId(req.params.userid)
	}).then(function (user){
		db.collection('albums').findOne({
			_id: pmongo.ObjectId(req.params.albumid)
		}).then(function (album){
			var dimensions = req.params.dimensions.split('x');

			if (!dimensions[1]) {
				dimensions[1] = dimensions[0];
			}

			if (!dimensions[2]){
				var crop_thumb = false;
			}
			else{
				var crop_thumb = true;
			}

			var original_path = 'uploads/originals/' + user._id + '/' + album._id + '/' + req.params.photosrc;
			var thumb_path = 'uploads/thumbs/' + user._id + '/' + album._id + '/' + dimensions[0] + 'x' + dimensions[1] + 'x' + (crop_thumb ? '1' : '0') + '_' + req.params.photosrc;

			fs.exists(thumb_path, function (exists) {
				if (exists) {
					var stat = fs.statSync(thumb_path);

					res.header('Content-Type', mime.lookup(thumb_path));
					res.header('Content-Length', stat.size);
					res.header('Cache-Control', 'public');

					fs.createReadStream(thumb_path).pipe(res);
					return;
				}
				else {
					fs.readFile(original_path, function (err, data) {
						if (err && !data) {
							next('route');
							return;
						}

						var original_img = gm(data, thumb_path);

						var original_info = {};

						original_img.size(function (err, info) {
							if (err && !info) {
								return;
							}

							if (!info.ratio && (info.width && info.height)) {
								info.ratio = info.width / info.height;
							}
							if (!info.orientation && (info.width && info.height)) {
								if (info.width > info.height) {
									info.orientation = 'landscape';
								}
								else if (info.width < info.height) {
									info.orientation = 'portrait';
								}
								else{
									info.orientation = 'square';
								}
							}

							// original_img = original_img.draw(['image Over 0,0 0,0 ./public/img/watermark.png'])

							original_info = info;

							if (crop_thumb) {
								var crop_ratio = dimensions[0]/dimensions[1];
								if (crop_ratio > original_info.ratio) {
									// Coupe haut et bas
									var crop_dimensions = {
										w: original_info.width,
										h: parseInt(original_info.width * crop_ratio),
										x: 0,
										y: 0
									};
									crop_dimensions.y = parseInt((original_info.height / 2) - (crop_dimensions.h / 2));
								}
								else if (crop_ratio < original_info.ratio) {
									// Coupe les côtés
									var crop_dimensions = {
										w: parseInt(original_info.height * crop_ratio),
										h: original_info.height,
										x: 0,
										y: 0
									};
									crop_dimensions.x = parseInt((original_info.width / 2) - (crop_dimensions.w / 2));
								}

								if (crop_dimensions) {
									var thumb_img = original_img.crop(crop_dimensions.w, crop_dimensions.h, crop_dimensions.x, crop_dimensions.y).resize(dimensions[0], dimensions[1]);
								}
							}

							if (!thumb_img) {
								var thumb_img = original_img.resize(dimensions[0], dimensions[1]);
							}

							thumb_img.write(thumb_path, function (err) {
								if (err) {
									console.error(err);
									return;
								}

								var stat = fs.statSync(thumb_path);

								res.header('Content-Type', mime.lookup(thumb_path));
								res.header('Content-Length', stat.size);
								res.header('Cache-Control', 'public');

								fs.createReadStream(thumb_path).pipe(res);
							});
						});
					});
					return;
				}
			});
		});
	});
});


app.route('/book/:userpseudo').get(function (req, res, next) {
	db.collection('users').findOne({
		pseudo: req.params.userpseudo
	}).then(function (user) {
		if (!user) {
			next();
			return;
		}

		db.collection('geo_counties').findOne({
			_id: user.geo_county_id
		}).then(function (county) {
			user.geo_county = county;

			db.collection('albums').find({ creator: user._id }).sort({ created_at: 1 }).toArray().then(function (albums) {
				res.render('user_profile', { user: user, albums: albums });
				res.end();
			});
		});
	});
});

app.route('/book/:userpseudo/:albumid').all(function (req, res, next) {
	if (!validator.isMongoId(req.params.albumid)) {
		next('route');
		return;
	}

	db.collection('users').findOne({
		pseudo: req.params.userpseudo
	}).then(function (user) {
		if (!user) {
			next('route');
			return;
		}

		db.collection('albums').findOne({
			_id: pmongo.ObjectId(req.params.albumid)
		}).then(function (album) {
			if (!album) {
				next('route');
				return;
			}

			res.locals.user = user;
			res.locals.album = album;

			next();
		});
	}, function (e) {
		res.write('Fail');
	});
}).post(function (req, res, next) {
	if (!req.files) {
		next();
		return;
	}

	var image = req.files['image[src]'];
	if (!image) {
		var form_error = 'Aucun fichier n\'a été spécifié';
	}
	else if (image.mimetype !== 'image/jpeg' && image.mimetype !== 'image/png') {
		var form_error = 'Seules les images au format JPEG et PNG sont autorisées';
	}

	if (form_error) {
		res.render('user_album', { form_error: form_error });
		res.end();
		return;
	}

	var new_photo = {
		_id: new pmongo.ObjectId(),
		uploaded_at: new Date(),
		src: Date.now().toString(10) + '_' + crypto.createHash('sha1').update(image.originalname).digest('hex') + '.' + image.extension
	}

	if (req.body.image && req.body.image.title) {
		new_photo.title = req.body.image.title;
	}

	fs.readFile(image.path, function (err, data) {
		if (err) {
			res.render('user_album', { form_error: 'Impossible de lire la photo' });
			res.end();
			return;
		}

		var newPath = __dirname + '/uploads/originals/' + res.locals.user._id + '/' + res.locals.album._id + '/' + new_photo.src;

		var image = gm(data, new_photo.src);

		image.size(function (err, info) {
			if (err && !info) {
				res.render('user_album', { form_error: 'Impossible de lire les informations de la photo' });
				res.end();
				return;
			}

			if (!info.ratio && (info.width && info.height)) {
				info.ratio = info.width / info.height;
			}
			if (!info.orientation && (info.width && info.height)) {
				if (info.width > info.height) {
					info.orientation = 'landscape';
				}
				else if (info.width < info.height) {
					info.orientation = 'portrait';
				}
				else{
					info.orientation = 'square';
				}
			}

			new_photo.file_info = info;

			fs.writeFile(newPath, data, function (err) {
				if (err) {
					res.render('user_album', { form_error: 'Impossible d\'enregistrer la photo sur le serveur' });
					res.end();
					return;
				}

				db.collection('albums').findAndModify({
					query: {
						_id: pmongo.ObjectId(res.locals.album._id)
					},
					sort: {
						_id: 1
					},
					update: {
						$push: { photos: new_photo }
					},
					new: true
				}).then(function (album) {
					if (!album) {
						res.render('user_album', { form_error: 'Impossible d\'enregistrer la photo dans la base de données' });
						res.end();
						return;
					}

					res.redirect(app.locals.url + '/book/' + res.locals.user.pseudo + '/' + res.locals.album._id + '#photo-' + new_photo._id);
					res.end();
				});
			});
		});
	});
}).get(function (req, res, next) {
	res.render('user_album', {  });
	res.end();
});

app.route('/recherche').all(function (req, res, next) {
	db.collection('geo_counties').find({}).sort({ _id: 1 }).toArray().then(function (geo_counties) {
		res.locals.geo_counties = geo_counties;
		next();
	});
}).get(function (req, res, next) {
	var search_filters = {};

	if (req.query.user) {
		if (req.query.user.pseudo && validator.isAlphanumeric(req.query.user.pseudo)) {
			search_filters.pseudo = { $regex: req.query.user.pseudo, $options: 'i' };
		}
		if (req.query.user.sex && ['male', 'female'].indexOf(req.query.user.sex) !== -1) {
			search_filters.sex = req.query.user.sex;
		}
		if (req.query.user.geo_county) {
			search_filters.geo_county_id = req.query.user.geo_county;
		}
		if (req.query.user.camera_side && ['photographer', 'model'].indexOf(req.query.user.camera_side) !== -1) {
			search_filters.camera_side = req.query.user.camera_side;
		}
	}

	res.locals.search_filters = search_filters;

	var query_cursor = db.collection('users').find(search_filters).sort({ register_date: -1 });

	query_cursor.count().then(function (search_results_nb) {
		if (!search_results_nb) {
			res.render('search');
			res.end();
			return;
		}

		var results_per_page = 20;

		if (req.query.page && validator.isInt(req.query.page)) {
			var query_offset = Math.min(parseInt(req.query.page) * results_per_page, search_results_nb);
		}
		else {
			var query_offset = 0;
		}

		query_cursor.limit(results_per_page).skip(query_offset).toArray().then(function (search_results) {
			res.render('search', { search_results: search_results, pages_nb: Math.ceil(search_results_nb / results_per_page), search_results_nb: search_results_nb, current_page: (query_offset / results_per_page) + 1 });
			res.end();
		});
	});
});

app.route('/inscription').all(function (req, res, next) {
	if (req.session.current_user) {
		res.redirect(app.locals.url + '/');
		res.end();
		return;
	}

	db.collection('geo_counties').find({}).sort({ _id: 1 }).toArray().then(function (geo_counties) {
		res.locals.geo_counties = geo_counties;
		next();
	});
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
	else if (!req.body.user.sex || ["male", "female"].indexOf(req.body.user.sex) === -1){
		var form_error = 'Sexe invalide';
	}
	else if (!req.body.user.geo_county) {
		var form_error = 'Département invalide';
	}

	if (form_error) {
		res.render('register', { form_error: form_error });
		res.end();
		return;
	}

	db.collection('geo_counties').findOne({
		_id: req.body.user.geo_county
	}).then(function (profile_county) {
		if (!profile_county) {
			res.render('register', { form_error: 'Département invalide' });
			res.end();
			return;
		}

		db.collection('users').findOne({
			pseudo: req.body.user.pseudo
		}).then(function (profile_pseudo) {
			if (profile_pseudo) {
				res.render('register', { form_error: 'Ce pseudo est déjà utilisé' });
				res.end();
				return;
			}

			db.collection('users').findOne({
				email: req.body.user.email
			}).then(function (profile_email) {
				if (profile_email) {
					res.render('register', { form_error: 'Cette adresse e-mail a déjà un compte : avez-vous <a href="' + app.locals.url + '/mot-de-passe-perdu" title="Cliquez pour récupérer votre compte">perdu votre mot de passe</a> ?' });
					res.end();
					return;
				}

				var new_user = {
					email: req.body.user.email,
					password: hashPassword(req.body.user.password),
					pseudo: req.body.user.pseudo,
					sex: req.body.user.sex,
					geo_county_id: req.body.user.geo_county,
					register_date: new Date()
				};

				db.collection('users').insert(new_user).then(function (user) {
					if (!user) {
						res.render('register', { form_error: 'Erreur lors de l\'enregistrement du profil' });
						res.end();
						return;
					}

					fs.mkdir('uploads/originals/' + user._id, 0775, function (err) {
						if (err) {
							res.render('register', { form_error: 'Erreur lors de la création du dossier personnel' });
							res.end();
							return;
						}

						fs.mkdir('uploads/thumbs/' + user._id, 0775, function (err) {
							if (err) {
								res.render('register', { form_error: 'Erreur lors de la création du dossier personnel de miniatures' });
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
			});
		});
	})
}).get(function (req, res, next) {
	res.render('register');
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
		res.render('password', { form_error: form_error });
		res.end();
		return;
	}

	db.collection('users').findOne({
		email: req.body.user.email
	}).then(function (user) {
		if (!user) {
			res.render('password', { form_error: 'Aucun compte existe avec cette adresse e-mail' });
			res.end();
			return;
		}

		// var new_password = (Math.random()*0xFFFFFF<<0).toString(16);

		res.redirect(app.locals.url + '/connexion');
		res.end();
	});
}).get(function (req, res, next) {
	res.render('password');
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
		res.render('login', { form_error: form_error });
		res.end();
		return;
	}

	db.collection('users').findOne({
		email: req.body.user.email,
		password: hashPassword(req.body.user.password)
	}).then(function (user) {
		if (!user) {
			res.render('login', { form_error: 'Ces identifiants sont incorrects' });
			res.end();
			return;
		}

		req.session.current_user = user;

		if (req.body.stay_online) {
			res.cookie('user_id', user._id);
		}

		res.redirect(app.locals.url + '/');
		res.end();
	});
}).get(function (req, res, next) {
	res.render('login');
	res.end();
});

app.route('/mon-profil').all(function (req, res, next) {
	if (!req.session.current_user) {
		res.redirect(app.locals.url + '/');
		res.end();
		return;
	}

	res.locals.user = res.locals.current_user;

	db.collection('geo_counties').find({}).sort({ _id: 1 }).toArray().then(function (geo_counties) {
		res.locals.geo_counties = geo_counties;
		next();
	});
}).post(function (req, res) {
	var photo_styles = ['fashion', 'glamour', 'lingerie', 'erotic', 'nude'];
	if (!req.body.user) {
		var form_error = 'Formulaire invalide';
	}
	else if (!req.body.user.sex || ['male', 'female'].indexOf(req.body.user.sex) === -1){
		var form_error = 'Sexe invalide';
	}
	// else if (!req.body.user.biography) {
	// 	var form_error = 'Biographie invalide';
	// }
	else if (!req.body.user.geo_county) {
		var form_error = 'Département invalide';
	}
	// else if (!req.body.user.photo_styles || !req.body.user.photo_styles.length){
	// 	var form_error = 'Style photographique invalide';
	// }
	else if (req.body.user.camera_side && ['photographer', 'model'].indexOf(req.body.user.camera_side) === -1) {
		var form_error = 'Côté de la caméra préféré invalide';
	}
	else if (req.body.user.photo_styles && req.body.user.photo_styles.length){
		for (var i=0, nb=req.body.user.photo_styles; i<nb; i++) {
			if (photo_styles.indexOf(req.body.user.photo_styles[i]) === -1) {
				var form_error = 'Style photographique invalide';
				break;
			}
		}
	}
	// else if (!req.body.user.photo_conditions) {
	// 	var form_error = 'Conditions invalide';
	// }

	// throw form_error;
	if (form_error) {
		res.render('user_edit', { form_error: form_error });
		res.end();
		return;
	}

	db.collection('geo_counties').findOne({
		_id: req.body.user.geo_county
	}).then(function (profile_county) {

		if (!profile_county) {
			res.render('user_edit', { form_error: 'Département invalide' });
			res.end();
			return;
		}

		var updated_user = {};

		if (req.body.user.sex != res.locals.user.sex) {
			updated_user.sex = req.body.user.sex;
		}
		if (req.body.user.biography != res.locals.user.biography) {
			updated_user.biography = req.body.user.biography;
		}
		if (req.body.user.geo_county != res.locals.user.geo_county_id) {
			updated_user.geo_county_id = req.body.user.geo_county;
		}
		if (req.body.user.camera_side != res.locals.user.camera_side) {
			updated_user.camera_side = req.body.user.camera_side;
		}
		if (req.body.user.photo_styles != res.locals.user.photo_styles) {
			updated_user.photo_styles = req.body.user.photo_styles;
		}
		if (req.body.user.photo_conditions != res.locals.user.photo_conditions) {
			updated_user.photo_conditions = req.body.user.photo_conditions;
		}

		if (!updated_user) {
			res.redirect(app.locals.url + '/book/' + res.locals.user.pseudo);
			res.end();
			return;
		}

		db.collection('users').findAndModify({
			query: {
				_id: pmongo.ObjectId(res.locals.user._id)
			},
			sort: {
				_id: 1
			},
			update: {
				$set : updated_user
			},
			new: true
		}).then(function (user) {
			if (!user[0]) {
				res.render('user_edit', { form_error: 'Erreur lors de la mise à jour de la base de données' });
				res.end();
				return;
			}

			if (res.locals.current_user._id == user[0]._id) {
				req.session.current_user = user[0];
				res.locals.current_user = user[0];
			}

			res.redirect(app.locals.url + '/book/' + user[0].pseudo);
			res.end();
		});
	});
}).get(function (req, res) {
	res.render('user_edit');
	res.end();
});

app.route('/mes-photos').all(function (req, res, next) {
	if (!req.session.current_user) {
		res.redirect(app.locals.url + '/');
		res.end();
		return;
	}

	res.redirect(app.locals.url + '/book/' + req.session.current_user.pseudo);
	res.end();
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
		res.render('new_album', { form_error: form_error });
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
			res.render('new_album', { form_error: 'Vous avez déjà un album portant ce nom' });
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
				res.render('new_album', { form_error: 'Erreur lors de l\'enregistrement de l\'album' });
				res.end();
				return;
			}

			fs.mkdir('uploads/originals/' + req.session.current_user._id + '/' + album._id, function (err) {
				if (err) {
					res.render('new_album', { form_error: 'Erreur lors de la création du dossier de l\'album' });
					res.end();
					return;
				}

				fs.mkdir('uploads/thumbs/' + req.session.current_user._id + '/' + album._id, function (err) {
					if (err) {
						res.render('new_album', { form_error: 'Erreur lors de la création du dossier de miniatures de l\'album' });
						res.end();
						return;
					}

					res.redirect(app.locals.url + '/mes-photos');
					res.end();
				});
			});
		});
	});
}).get(function (req, res, next) {
	res.render('new_album');
	res.end();
});

app.route('/deconnexion').get(function (req, res, next) {
	req.session.current_user = null;
	delete req.session.current_user;
	res.clearCookie('user_id');
	res.redirect(app.locals.url + '/');
	res.end();
});


app.route('/db_reset/:tables').get(function (req, res, next) {
	if (req.params.tables) {
		var db_reset_promises = [];

		var tables = req.params.tables.split(',');

		tables.forEach(function (table) {
			db_reset_promises.push(db.collection(table).remove({}));

			if (table === 'users') {
				if (req.session.current_user) {
					delete req.session.current_user;
				}
			}
			if (table === 'geo_counties') {
				var csv = require('csv');

				csv.parse(fs.readFileSync('data/geo_counties_fr.csv', { encoding: 'utf8' }) || '', function(err, data){
					if (err || !data) {
						throw 'Erreur lors de la lecture du fichier CSV';
					}
					data.shift();

					data.forEach(function (county_data) {
						var county = {
							_id: county_data[1],
							district: parseInt(county_data[0]),
							capital: county_data[2],
							name: county_data[5],
							name_type: parseInt(county_data[3])
						};

						db_reset_promises.push(db.collection(table).insert(county));
					});
				});
			}
		});

		setTimeout(function () {
			Promise.all(db_reset_promises).then(function (results) {
				res.write('Reset done');
				res.end();
			});
		}, 500);
	}
	else{
		res.redirect(app.locals.url + '/');
		res.write('No collection to reset');
		res.end();
	}
});

app.route('/').get(function (req, res) {
	if (app.get('env') === 'production' && (!req.session || !req.session.current_user)) {
		res.render('opening');
		res.end();
		return;
	}
	else {
		db.collection('users').find({}).sort({ register_date: 1 }).limit(5).toArray().then(function (last_users) {
			db.collection('geo_counties').find({}).sort({ _id: 1 }).toArray().then(function (geo_counties) {
				res.render('index', { last_users: last_users, geo_counties: geo_counties });
				res.end();
			});
		});
	}
});

app.route('*').all(function (req, res, next) {
	res.status(404);

	res.render('error404');

	res.end();
});
