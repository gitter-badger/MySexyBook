/// <reference path="typings/node/node.d.ts"/>

var pkg = require('./package.json');

var Promise = require('promise');
var fs = require('fs');
var fsp = require('fs-promise');
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
var csurf = require('csurf');
var MongoStore = require('connect-mongo')(session);
var multer = require('multer'), upload = multer({ storage: multer.diskStorage({}) });
var validator = require('validator');
var sanitize = require('sanitize-caja');
var slug = require('slug');
slug.defaults.modes.pretty.lower = true;
var MarkDown = require('markdown-it');
var strftime = require('strftime').localize({
	days: [ 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi' ],
	shortDays: [ 'dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam' ],
	months: [ 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre' ],
	shortMonths: [ 'jan', 'fev', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc' ]
});
require('./public/js/prototypes.js');

var app = express();

app.disable('x-powered-by');

var site = require('./config/site.json');

for (var key in site) {
	if (app.locals[key] === undefined) {
		app.locals[key] = site[key];
	}
}

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

app.locals.environment = app.get('env');
app.locals.querystring = querystring;
app.locals.sanitize = sanitize;
app.locals.markdown = new MarkDown();
app.locals.slug = slug;
app.locals.markdown_inline = new MarkDown('zero', { breaks: true }).enable([ 'newline', 'emphasis' ]);
app.locals.strftime = strftime;
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
var db = pmongo('mysexybook', ['users', 'albums', 'photos', 'geo_counties']);

db.collection('users').dropIndexes();
db.collection('users').ensureIndex({ email: 1 }, { unique: true, dropDups: true });
db.collection('users').ensureIndex({ email: 1, password: 1 });
db.collection('users').ensureIndex({ pseudo: 1 }, { unique: true, dropDups: true });
db.collection('users').ensureIndex({ geo_county_id: 1 });

db.collection('albums').dropIndexes();
db.collection('albums').ensureIndex({ creator_id: 1 });
db.collection('albums').ensureIndex({ created_at: 1 });
db.collection('albums').ensureIndex({ creator_id: 1, title: 1 }, { unique: true, dropDups: true });

db.collection('photos').dropIndexes();
db.collection('photos').ensureIndex({ owner_id: 1, album_id: 1 });
db.collection('photos').ensureIndex({ uploaded_at: 1 });
db.collection('photos').ensureIndex({ owner_id: 1, album_id: 1, uploaded_at: 1 });

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
app.locals.dots = dots;
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


var MSB_Model = require('./MSB_model.js');
MSB_Model.db = db;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

app.use('/assets', express.static(__dirname + '/public'));

app.use(function (req, res, next) {
	res.header('Content-Type', 'text/html; charset=utf-8');
	res.header('Cache-Control', 'no-cache');
	res.header('Content-language', 'fr_FR');

	res.locals.app = app.locals;
	res.locals.req = req;

	if (req.cookies && req.cookies.user_id && (!req.session || !req.session.current_user)) {
		MSB_Model.getUser({
			_id: req.cookies.user_id
		}).then(function (user) {
			var user_found = false;

			if (user.sessions) {
				var min_last_action = new Date();
				min_last_action.setDate(min_last_action.getDate() - 30);

				var currentIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
				var currentUserAgent = req.headers['user-agent'];

				user.sessions.forEach(function (sess) {
					if (sess.last_action >= min_last_action && sess.ip === currentIp && sess.user_agent === currentUserAgent) {
							user_found = true;

							req.session.current_user = user;
							res.locals.current_user = user;

							MSB_Model.updateUserLastLogin(user._id);
							next();
					}
				});
			}

			if (!user_found) {
				res.clearCookie('user_id');
			}

			next();
		}).catch(function () {
			res.clearCookie('user_id');
			next();
		});
	}
	else if(req.session && req.session.current_user) {
		res.locals.current_user = req.session.current_user;
		next();
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

	MSB_Model.getUser({
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
									w: parseInt(original_info.width),
									h: Math.round(original_info.width * crop_ratio),
									x: 0,
									y: 0
								};
								crop_dimensions.y = Math.round((original_info.height / 2) - (crop_dimensions.h / 2));
							}
							else if (crop_ratio < original_info.ratio) {
								var crop_dimensions = {
									w: Math.round(original_info.height * crop_ratio),
									h: parseInt(original_info.height),
									x: 0,
									y: 0
								};
								crop_dimensions.x = Math.round((original_info.width / 2) - (crop_dimensions.w / 2));
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

app.route('/photo/:userid/:albumid/:dimensions/:photosrc').get(function (req, res, next) {
	MSB_Model.getUser({
		_id: pmongo.ObjectId(req.params.userid)
	}).then(function (user){
		MSB_Model.getAlbum({
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
										w: parseInt(original_info.width),
										h: Math.round(original_info.width * crop_ratio),
										x: 0,
										y: 0
									};
									crop_dimensions.y = Math.round((original_info.height / 2) - (crop_dimensions.h / 2));
								}
								else if (crop_ratio < original_info.ratio) {
									// Coupe les côtés
									var crop_dimensions = {
										w: Math.round(original_info.height * crop_ratio),
										h: parseInt(original_info.height),
										x: 0,
										y: 0
									};
									crop_dimensions.x = Math.round((original_info.width / 2) - (crop_dimensions.w / 2));
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

app.use(csurf({ cookie: true }));

app.use(function (err, req, res, next) {
	console.dir(err);
	switch (err.code) {
		case 'EBADCSRFTOKEN':
			res.status(403);
			res.render('error403', { error: { code: err.code, message: 'Formulaire invalide : le jeton est expiré ou non reconnu' }});
			res.end();
			return;
		break;
	}

	next();
});

app.route('/book/:userpseudo').all(function (req, res, next) {
	MSB_Model.getUser({ pseudo: req.params.userpseudo }).then(function (user) {
		if (!user.account_validated && (
			!req.session.current_user || 
			(req.session.current_user && !user._id.equals(req.session.current_user._id) && !req.session.current_user.is_admin)
		)) {
			res.status(403);
			res.render('error403', { error: { message: 'Ce compte n\'a pas encore été validé' } });
			res.end();
			return;
		}

		res.locals.user = user;

		next();
	}).catch(function () {
		next('route');
		return;
	});
}).post(function (req, res, next) {
	if (!req.session || !req.session.current_user) {
		res.status(403);
		res.render('error403', { error: { message: 'Vous devez être connecté pour accéder à cette page' } });
		res.end();
		return;
	}
	if (!res.locals.user._id.equals(req.session.current_user._id) && !req.session.current_user.is_admin) {
		res.status(403);
		res.render('error403', { error: { message: 'Ce profil ne vous appartient pas' } });
		res.end();
		return;
	}

	if (!req.body.album) {
		var form_error = 'Formulaire invalide';
	}
	else if (!req.body.album.title || !validator.isLength(req.body.album.title, 1, 40)) {
		var form_error = 'Titre invalide';
	}

	if (form_error) {
		res.render('user_profile', { form_error: form_error });
		res.end();
		return;
	}

	MSB_Model.createAlbum(res.locals.user._id, req.body.album.title, req.body.album.description, req.body.album.is_private).then(function (album) {
		res.redirect(app.locals.url + '/book/' + res.locals.user.pseudo);
		res.end();
	}).catch(function (album_error) {
		res.render('user_profile', { form_error: album_error });
		res.end();
		return;
	});
}).get(function (req, res, next) {
	MSB_Model.getAlbums({ creator_id: res.locals.user._id }, { created_at: 1 }).then(function (albums) {
		if (albums.length) {
			var photos_promises = new Array(albums.length);

			albums.forEach(function (album, index) {
				var promise = MSB_Model.getPhotos({ owner_id: res.locals.user._id, album_id: album._id }, { uploaded_at: 1 });
				photos_promises[index] = promise;
			});

			Promise.all(photos_promises).then(function (results) {
				results.forEach(function (photos, index) {
					albums[index].photos = photos;
				});

				res.render('user_profile', { albums: albums });
				res.end();
			}).catch(function (err) {
				res.render('user_profile', { albums: albums });
				res.end();
			});
		}
		else {
			res.render('user_profile', { albums: albums });
			res.end();
		}
	}).catch(function () {
		res.render('user_profile');
		res.end();
	});
});

app.route('/book/:userpseudo/:albumid/modifier').all(function (req, res, next) {
	if (!req.session || !req.session.current_user) {
		res.status(403);
		res.render('error403', { error: { message: 'Vous devez être connecté pour accéder à cette page' } });
		res.end();
		return;
	}

	if (!validator.isMongoId(req.params.albumid)) {
		next('route');
		return;
	}

	MSB_Model.getUser({ pseudo: req.params.userpseudo }).then(function (user) {
		if (!user.account_validated && !req.session.current_user.is_admin) {
			res.status(403);
			res.render('error403', { error: { message: 'Ce compte n\'a pas encore été validé' } });
			res.end();
			return;
		}

		res.locals.user = user;

		MSB_Model.getAlbum({
			_id: req.params.albumid,
			creator_id: res.locals.user._id
		}).then(function (album) {
			if (!album.creator_id.equals(req.session.current_user._id) && !req.session.current_user.is_admin) {
				res.status(403);
				res.render('error403', { error: { message: 'Cet album ne vous appartient pas' } });
				res.end();
				return;
			}
			res.locals.album = album;
			next();
		}).catch(function (err) {
			next('route');
			return;
		});
	}).catch(function (err) {
		next('route');
		return;
	});
}).post(function (req, res, next) {
	if (!req.body.album) {
		var form_error = 'Formulaire invalide';
	}
	else if (!req.body.album.title || !validator.isLength(req.body.album.title, 1, 40)) {
		var form_error = 'Titre invalide';
	}

	if (form_error) {
		res.render('user_album_edit', { form_error: form_error });
		res.end();
		return;
	}

	MSB_Model.updateAlbum(res.locals.album._id, req.body.album.title, req.body.album.description || null, req.body.album.is_private || false).then(function (album) {
		res.redirect(app.locals.url + '/book/' + res.locals.user.pseudo + '/' + res.locals.album._id);
		res.end();
	}).catch(function (err) {
		res.render('user_album_edit', { form_error: err });
		res.end();
	});
}).get(function (req, res, next) {
	res.render('user_album_edit');
	res.end();
});

app.route('/book/:userpseudo/:albumid/supprimer').all(function (req, res, next) {
	if (!req.session || !req.session.current_user) {
		res.status(403);
		res.render('error403', { error: { message: 'Vous devez être connecté pour accéder à cette page' } });
		res.end();
		return;
	}

	if (!validator.isMongoId(req.params.albumid)) {
		next('route');
		return;
	}

	MSB_Model.getUser({ pseudo: req.params.userpseudo }).then(function (user) {
		if (!user.account_validated && !req.session.current_user.is_admin) {
			res.status(403);
			res.render('error403', { error: { message: 'Ce compte n\'a pas encore été validé' } });
			res.end();
			return;
		}

		res.locals.user = user;

		MSB_Model.getAlbum({
			_id: req.params.albumid,
			creator_id: res.locals.user._id
		}).then(function (album) {
			if (!album.creator_id.equals(req.session.current_user._id) && !req.session.current_user.is_admin) {
				res.status(403);
				res.render('error403', { error: { message: 'Cet album ne vous appartient pas' } });
				res.end();
				return;
			}
			res.locals.album = album;

			res.locals.csrfToken = req.csrfToken();
			next();
		}).catch(function (err) {
			next('route');
			return;
		});
	}).catch(function (err) {
		next('route');
		return;
	});
}).get(function (req, res, next) {
	MSB_Model.deleteAlbum(res.locals.album).then(function (result) {
		res.redirect(app.locals.url + '/book/' + res.locals.user.pseudo);
		res.end();
	}).catch(function (err) {
		res.render('user_album_edit', { form_error: err });
		res.end();
	});
});

app.route(['/book/:userpseudo/:albumid', '/book/:userpseudo/:albumid/-:albumname']).all(function (req, res, next) {
	if (!validator.isMongoId(req.params.albumid)) {
		next('route');
		return;
	}

	MSB_Model.getUser({ pseudo: req.params.userpseudo }).then(function (user) {
		if (!user.account_validated && (
			!req.session.current_user || 
			(req.session.current_user && !user._id.equals(req.session.current_user._id) && !req.session.current_user.is_admin)
		)) {
			res.status(403);
			res.render('error403', { error: { message: 'Ce compte n\'a pas encore été validé' } });
			res.end();
			return;
		}

		res.locals.user = user;

		MSB_Model.getAlbum({
			_id: req.params.albumid,
			creator_id: res.locals.user._id
		}).then(function (album) {
			if (album.is_private && (
				!req.session.current_user || 
				(req.session.current_user && !res.locals.user._id.equals(req.session.current_user._id) && !req.session.current_user.is_admin)
			)) {
				res.status(403);
				res.render('error403', { error: { message: 'Cet album est privé' } });
				res.end();
				return;
			}
			res.locals.album = album;
			next();
		}).catch(function (err) {
			next('route');
			return;
		});
	}).catch(function () {
		next('route');
		return;
	});
}).post(upload.single('image[src]'), function (req, res, next) {

	if (!req.session || !req.session.current_user) {
		res.status(403);
		res.render('error403', { error: { message: 'Vous devez être connecté pour accéder à cette page' } });
		res.end();
		return;
	}
	if (!res.locals.album.creator_id.equals(req.session.current_user._id)) {
		res.status(403);
		res.render('error403', { error: { message: 'Cet album ne vous appartient pas' } });
		res.end();
		return;
	}

	if (!req.file) {
		console.log('No file submitted');
		res.render('user_album', { form_error: 'Vous devez renseigner une photo à charger' });
		res.end();
		return;
	}

	if (!req.body.image) {
		req.body.image = {};
	}

	var image_temp = req.file;
	if (!image_temp) {
		var form_error = 'Aucun fichier n\'a été spécifié';
	}
	else if (image_temp.mimetype !== 'image/jpeg' && image_temp.mimetype !== 'image/png') {
		var form_error = 'Seules les images au format JPEG et PNG sont autorisées';
	}
	if (req.body.image.title && !validator.isLength(req.body.image.title, 0, 60)) {
		var form_error = 'La description de l\'image est trop longue (60 caractères max.)';
	}

	if (form_error) {
		res.render('user_album', { form_error: form_error });
		res.end();
		return;
	}

	MSB_Model.createPhoto(image_temp, res.locals.album._id, res.locals.user._id, req.body.image.title || '').then(function (photo) {
		res.redirect(app.locals.url + '/book/' + res.locals.user.pseudo + '/' + res.locals.album._id + '#photo-' + photo._id);
		res.end();
	}).catch(function (err) {
		console.error(err);

		MSB_Model.getPhotos({ album_id: res.locals.album._id }, { uploaded_at: 1 }).then(function (photos) {
			res.locals.album.photos = photos;

			res.render('user_album', { form_error: err });
			res.end();
		}).catch(function (err) {
			res.render('user_album');
			res.end();
		});
	});
}).get(function (req, res, next) {
	MSB_Model.getPhotos({ album_id: res.locals.album._id }, { uploaded_at: 1 }).then(function (photos) {
		res.locals.album.photos = photos;

		res.render('user_album');
		res.end();
	}).catch(function (err) {
		res.render('user_album');
		res.end();
	});
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
		if (req.query.user.sex && app.locals.sexes.indexOf(req.query.user.sex) !== -1) {
			search_filters.sex = req.query.user.sex;
		}
		if (req.query.user.geo_county) {
			search_filters.geo_county_id = req.query.user.geo_county;
		}
		if (req.query.user.camera_side && app.locals.camera_sides.indexOf(req.query.user.camera_side) !== -1) {
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
	if (req.session && req.session.current_user) {
		res.status(403);
		res.render('error403', { error: { message: 'Vous êtes déjà connecté' } });
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
	else if (!req.body.user.sex || app.locals.sexes.indexOf(req.body.user.sex) === -1){
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

	MSB_Model.createUser(req.body.user.email, req.body.user.password, req.body.user.pseudo, req.body.user.sex, req.body.user.geo_county).then(function (user) {
		req.session.current_user = user;

		res.redirect(app.locals.url + '/book/' + user.pseudo);
		res.end();
	}).catch(function (err) {
		res.render('register', { form_error: err });
		res.end();
		return;
	});
}).get(function (req, res, next) {
	res.render('register');
	res.end();
});

app.route('/mot-de-passe-perdu').all(function (req, res, next) {
	if (req.session && req.session.current_user) {
		res.status(403);
		res.render('error403', { error: { message: 'Vous êtes déjà connecté' } });
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

	MSB_Model.getUser({
		email: req.body.user.email
	}).then(function (user) {
		// var new_password = (Math.random()*0xFFFFFF<<0).toString(16);

		res.redirect(app.locals.url + '/connexion');
		res.end();
	}).catch(function () {
		res.render('password', { form_error: 'Aucun compte existe avec cette adresse e-mail' });
		res.end();
	});
}).get(function (req, res, next) {
	res.render('password');
	res.end();
});

app.route('/connexion').all(function (req, res, next) {
	if (req.session && req.session.current_user) {
		res.status(403);
		res.render('error403', { error: { message: 'Vous êtes déjà connecté' } });
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

	MSB_Model.getUser({
		email: req.body.user.email,
		password: MSB_Model.hashPassword(req.body.user.password)
	}).then(function (user) {
		req.session.current_user = user;

		if (req.body.stay_online) {
			res.cookie('user_id', user._id);

			MSB_Model.updateUserLastLogin(user._id, { ip: (req.headers['x-forwarded-for'] || req.connection.remoteAddress), user_agent: req.headers['user-agent'] });
		}
		else {
			MSB_Model.updateUserLastLogin(user._id);
		}

		res.redirect(app.locals.url + '/book/' + user.pseudo);
		res.end();
	}).catch(function () {
		res.render('login', { form_error: 'Ces identifiants sont incorrects' });
		res.end();
		return;
	});
}).get(function (req, res, next) {
	res.render('login');
	res.end();
});

app.route('/mon-profil').all(function (req, res, next) {
	if (!req.session || !req.session.current_user) {
		res.status(403);
		res.render('error403', { error: { message: 'Vous devez être connecté pour accéder à cette page' } });
		res.end();
		return;
	}

	res.locals.user = req.session.current_user;
	next();
}).post(function (req, res) {
	if (!req.body.user) {
		var form_error = 'Formulaire invalide';
	}
	else if (!req.body.user.sex || app.locals.sexes.indexOf(req.body.user.sex) === -1){
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
	else if (req.body.user.camera_side && app.locals.camera_sides.indexOf(req.body.user.camera_side) === -1) {
		var form_error = 'Côté de la caméra préféré invalide';
	}
	else if (req.body.user.photo_styles && req.body.user.photo_styles.length){
		for (var i=0, nb=req.body.user.photo_styles; i<nb; i++) {
			if (app.locals.photo_styles.indexOf(req.body.user.photo_styles[i]) === -1) {
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
		MSB_Model.getGeoCounties({}, { _id: 1 }).then(function (geo_counties) {
			res.locals.geo_counties = geo_counties;
			res.render('user_edit', { form_error: form_error });
			res.end();
		});
		return;
	}

	MSB_Model.updateUser(res.locals.user._id, req.body.user.sex, req.body.user.biography, req.body.user.geo_county, req.body.user.camera_side, req.body.user.photo_styles, req.body.user.photo_conditions).then(function (user) {
		if (user._id.equals(res.locals.current_user._id)) {
			req.session.current_user = user;
			res.locals.current_user = user;
		}

		res.redirect(app.locals.url + '/book/' + user.pseudo);
		res.end();
	}).catch(function (err) {
		MSB_Model.getGeoCounties({}, { _id: 1 }).then(function (geo_counties) {
			res.locals.geo_counties = geo_counties;
			res.render('user_edit', { form_error: err });
			res.end();
		});
	});
}).get(function (req, res) {
	MSB_Model.getGeoCounties({}, { _id: 1 }).then(function (geo_counties) {
		res.locals.geo_counties = geo_counties;
		res.render('user_edit');
		res.end();
	});
});

app.route('/deconnexion').get(function (req, res, next) {
	if (req.headers['referer'] && req.headers['referer'].indexOf(app.locals.url) === 0) {
		req.session.current_user = null;
		delete req.session.current_user;
		res.clearCookie('user_id');
		res.redirect(app.locals.url + '/');
		res.end();
		return;
	}

	res.write('Mauvais referer');
	res.end();
});


app.route('/db_reset/:table').all(function (req, res, next) {
	if (!req.session || !req.session.current_user || !req.session.current_user.is_admin) {
		res.status(403);
		res.render('error403', { error: { message: 'Vous devez être administrateur pour accéder à cette page' } });
		res.end();
		return;
	}

	if (req.params.table) {
		var db_reset_promises = [];

		switch (req.params.table) {
			case 'users':
				if (req.session.current_user) {
					delete req.session.current_user;
				}

				MSB_Model.getUsers({}).then(function (users) {
					users.forEach(function (user) {
						db_reset_promises.push(MSB_Model.deleteUser(user));
					});

					Promise.all(db_reset_promises).then(function () {
						res.locals.db_reset_result = 'Utilisateurs réinitialisés';
						next();
					}).catch(function (err) {
						console.error(err);
						res.locals.db_reset_result = 'Erreur lors de la réinitialisation des utilisateurs';
						next();
					});
				});
			break;

			case 'albums':
				MSB_Model.getAlbums({}).then(function (albums) {
					albums.forEach(function (album) {
						db_reset_promises.push(MSB_Model.deleteAlbum(album));
					});

					Promise.all(db_reset_promises).then(function () {
						res.locals.db_reset_result = 'Albums réinitialisés';
						next();
					}).catch(function (err) {
						console.error(err);
						res.locals.db_reset_result = 'Erreur lors de la réinitialisation des albums';
						next();
					});
				});

			break;

			case 'photos':
				MSB_Model.getPhotos({}).then(function (photos) {
					photos.forEach(function (photo) {
						db_reset_promises.push(MSB_Model.deletePhoto(photo));
					});

					Promise.all(db_reset_promises).then(function () {
						res.locals.db_reset_result = 'Photos réinitialisées';
						next();
					}).catch(function (err) {
						console.error(err);
						res.locals.db_reset_result = 'Erreur lors de la réinitialisation des photos';
						next();
					});
				});
			break;
			
			case 'geo_counties': 
				db.collection('geo_counties').remove({}).then(function () {
					var csv = require('csv');

					fsp.readFile('data/geo_counties_fr.csv', { encoding: 'utf8' }).then(function (csv_txt) {
						return csv.parse(csv_txt || '', function (err, data) {
							if (err) {
								res.locals.db_reset_result = 'Erreur lors du parsage du fichier CSV';
								console.error(err);
								next();
								return;
							}
							if (!data) {
								res.locals.db_reset_result = 'Pas de départements à importer';
								next();
								return;
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

								db_reset_promises.push(db.collection('geo_counties').insert(county));
							});

							Promise.all(db_reset_promises).then(function () {
								res.locals.db_reset_result = 'Département réinitialisés';
								next();
							}).catch(function (err) {
								res.locals.db_reset_result = 'Erreur lors de la réinitialisation des départements';
								next();
							});
						});
					}).catch(function (err) {
						res.locals.db_reset_result = 'Erreur lors de la lecture du fichier CSV';
						next();
					});
				});
			break;
		}
	}
	else{
		res.redirect(app.locals.url + '/');
		res.write('No collection to reset');
		res.end();
	}
}).get(function (req, res, next) {
	res.write(res.locals.db_reset_result);
	res.end();
});

app.route('/').get(function (req, res) {
	if (app.get('env') === 'production' && (!req.session || !req.session.current_user)) {
		res.render('opening');
		res.end();
		return;
	}
	else {
		var home_promises = [
			MSB_Model.getUsers({ account_validated: true }, { register_date: -1 }, 6).then(function (last_users) {
				res.locals.last_users = last_users;
			}),
			MSB_Model.getPhotos({ 
				"is_private": { $ne: true }
			}, { uploaded_at: -1 }, 6).then(function (last_photos) {
				res.locals.last_photos = last_photos;
			}),
			MSB_Model.getGeoCounties({}, { _id: 1 }).then(function (geo_counties) {
				res.locals.geo_counties = geo_counties;
			})
		];

		Promise.all(home_promises).then(function () {
			if (res.locals.last_photos && res.locals.last_photos.length) {
				var photos_promises = new Array(res.locals.last_photos.length);

				res.locals.last_photos.forEach(function (photo, index) {
					var promise = MSB_Model.getUser({ _id: pmongo.ObjectId(photo.owner_id) });
					photos_promises[index] = promise;
				});

				Promise.all(photos_promises).then(function (results) {
					results.forEach(function (user, index) {
						res.locals.last_photos[index].owner = user;
					});

					res.render('index');
					res.end();
				});
			}
			else {
				res.render('index');
				res.end();
			}
		}).catch(function () {
			res.render('index');
			res.end();
		});
	}
});

app.route('*').all(function (req, res, next) {
	res.status(404);
	res.render('error404');
	res.end();
});
