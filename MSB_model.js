var pkg = require('./package.json');

switch (process.env.NODE_ENV) {
	case 'production':
		var app_config = require('./config/app-production.json');
	break;

	case 'development':
	case 'test':
	default:
		var app_config = require('./config/app-development.json');
	break;
}

var fsp = require('fs-promise');
var Promise = require('promise');
var pmongo = require('promised-mongo');

var validator = require('validator');

var crypto = require('crypto');

var gm = require('gm');

var MSB = {};

/* ---------- Passwords ---------- */

MSB.hashPassword = function (pwd) {
	return crypto.createHash('sha512').update(app_config.pwd_salt_start + pwd + app_config.pwd_salt_end).digest('hex');
}

/* ---------- Users ---------- */

MSB.createUser = function (email, password, pseudo, sex, geo_county_id) {
	var new_user = {
		email: email,
		password: MSB.hashPassword(password),
		pseudo: pseudo,
		sex: sex,
		geo_county_id: geo_county_id,
		register_date: new Date()
	};

	return new Promise(function (resolve, reject){
		MSB.getGeoCounty({
			_id: new_user.geo_county_id
		}).then(function (geo_county) {
			MSB.db.collection('users').findOne({
				email: new_user.email
			}).then(function (user_email) {
				if (user_email) {
					reject('Vous avez déjà un compte. Avez-vous oublié votre mot de passe ?');
					return;
				}

				MSB.db.collection('users').findOne({
					pseudo: new_user.pseudo
				}).then(function (user_pseudo) {
					if (user_pseudo) {
						reject('Ce pseudo est déjà pris');
						return;
					}

					return MSB.db.collection('users').insert(new_user).then(function (user) {
						if (!user) {
							reject('Erreur lors de la création de l\'user');
							return;
						}

						Promise.all([
							fsp.mkdir('uploads/originals/' + user._id, 0775), 
							fsp.mkdir('uploads/thumbs/' + user._id, 0775)
						]).then(function () {
							resolve(user);
						}).catch(function (err) {
							reject('Erreur lors de la création des dossiers personnels');
							console.error(err);
						});
					}).catch(function (err) {
						reject('Erreur lors de la création du profil dans la base de données');
						console.error(err);
					});
				}).catch(function (err) {
					reject('Erreur de la base de données');
					console.error(err);
				});
			}).catch(function (err) {
				reject('Erreur de la base de données');
				console.error(err);
			});
		}).catch(function (err) {
			reject('Département invalide');
		});
	});
};
MSB.getUser = function (filter) {
	if (filter._id && typeof filter._id === 'string') {
		filter._id = pmongo.ObjectId(filter._id);
	}

	return new Promise(function (resolve, reject){
		var query = MSB.db.collection('users').findOne(filter);
		
		query.then(function (user) {
			if (!user) {
				reject('Utilisateur introuvable');
				return;
			}

			MSB.getGeoCounty({ _id: user.geo_county_id }).then(function (geo_county) {
				user.geo_county = geo_county;
				resolve(user);
			}).catch(function (error) {
				resolve(user);
			});
		}).catch(function (err) {
			reject('Erreur de la base de données');
			console.error(err);
		});
	});
};
MSB.getUsers = function (filter, sort, limit, offset) {
	if (filter._id && typeof filter._id === 'string') {
		filter._id = pmongo.ObjectId(filter._id);
	}

	return new Promise(function (resolve, reject){
		var query = MSB.db.collection('users').find(filter);

		if (sort) {
			query = query.sort(sort);
		}
		if (limit) {
			query = query.limit(limit);
		}
		if (offset) {
			query = query.offset(offset);
		}

		query.toArray().then(function (users) {
			resolve(users);
		}).catch(function (err) {
			reject('Erreur de la base de données');
			console.error(err);
		});
	});
};

/* ---------- Geo Counties ---------- */

MSB.getGeoCounty = function (filter) {
	return new Promise(function (resolve, reject){
		var query = MSB.db.collection('geo_counties').findOne(filter);
		
		query.then(function (geo_county) {
			if (!geo_county) {
				reject('Département introuvable');
				return;
			}
			resolve(geo_county);
		}).catch(function (err) {
			reject('Erreur de la base de données');
			console.error(err);
		});
	});
};
MSB.getGeoCounties = function (filter, sort, limit, offset) {
	return new Promise(function (resolve, reject){
		var query = MSB.db.collection('geo_counties').find(filter);

		if (sort) {
			query = query.sort(sort);
		}
		if (limit) {
			query = query.limit(limit);
		}
		if (offset) {
			query = query.offset(offset);
		}

		query.toArray().then(function (geo_counties) {
			resolve(geo_counties);
		}).catch(function (err) {
			reject('Erreur de la base de données');
			console.error(err);
		});
	});
};

/* ---------- Albums ---------- */

MSB.createAlbum = function (title, creator_id, description) {
	var new_album = {
		creator_id: typeof creator_id === 'string' ? pmongo.ObjectId(creator_id) : creator_id,
		title: title,
		created_at: new Date()
	};

	if (description) {
		new_album.description = description;
	}

	return new Promise(function (resolve, reject){
		MSB.db.collection('albums').findOne({
			creator_id: new_album.creator_id,
			title: new_album.title
		}).then(function (album_title) {
			if (album_title) {
				reject('Vous avez déjà un album portant ce nom');
				return;
			}

			return MSB.db.collection('albums').insert(new_album).then(function (album) {
				if (!album) {
					reject('Erreur lors de la création de l\'album');
					return;
				}

				Promise.all([
					fsp.mkdir('uploads/originals/' + new_album.creator_id + '/' + album._id, 0775), 
					fsp.mkdir('uploads/thumbs/' + new_album.creator_id + '/' + album._id, 0775)
				]).then(function () {
					resolve(album);
				}).catch(function (err) {
					reject('Erreur lors de la création des dossiers de l\'album');
					console.error(err);
				});
			}).catch(function (err) {
				reject('Erreur lors de la création de l\'album dans la base de données');
				console.error(err);
			});
		}).catch(function (err) {
			reject('Erreur de la base de données');
			console.error(err);
		});
	});
};

MSB.getAlbum = function (filter) {
	if (filter._id && typeof filter._id === 'string') {
		filter._id = pmongo.ObjectId(filter._id);
	}
	if (filter.creator_id && typeof filter._id === 'string') {
		filter.creator_id = pmongo.ObjectId(filter.creator_id);
	}
	return new Promise(function (resolve, reject){
		var query = MSB.db.collection('albums').findOne(filter);
		
		query.then(function (album) {
			if (!album) {
				reject('Album introuvable');
				return;
			}

			resolve(album);
		}).catch(function (err) {
			reject('Erreur de la base de données');
			console.error(err);
		});
	});
};
MSB.getAlbums = function (filter, sort, limit, offset) {
	if (filter._id && typeof filter._id === 'string') {
		filter._id = pmongo.ObjectId(filter._id);
	}
	if (filter.creator_id && typeof filter.creator_id === 'string') {
		filter.creator_id = pmongo.ObjectId(filter.creator_id);
	}

	return new Promise(function (resolve, reject){
		var query = MSB.db.collection('albums').find(filter);

		if (sort) {
			query = query.sort(sort);
		}
		if (limit) {
			query = query.limit(limit);
		}
		if (offset) {
			query = query.offset(offset);
		}

		query.toArray().then(function (albums) {
			resolve(albums);
		}).catch(function (err) {
			reject('Erreur de la base de données');
			console.error(err);
		});
	});
};

/* ---------- Photos ---------- */

MSB.createPhoto = function (temp_img, album_id, owner_id, title) {
	return new Promise(function (resolve, reject) {
		if (!temp_img) {
			reject('Aucun fichier n\'a été spécifié');
		}
		else if (temp_img.mimetype !== 'image/jpeg' && temp_img.mimetype !== 'image/png') {
			reject('Seules les images au format JPEG et PNG sont autorisées');
		}

		var id = new pmongo.ObjectId();

		var new_photo = {
			_id: id,
			album_id: typeof album_id === 'string' ? pmongo.ObjectId(album_id) : album_id,
			owner_id: typeof owner_id === 'string' ? pmongo.ObjectId(owner_id) : owner_id,
			src: id + '.' + temp_img.extension,
			uploaded_at: new Date()
		};

		if (title) {
			new_photo.title = title;
		}

		fsp.readFile(temp_img.path).then(function (image_raw_data) {
			var newPath = __dirname + '/uploads/originals/' + new_photo.owner_id + '/' + new_photo.album_id + '/' + new_photo.src;

			var image = gm(image_raw_data, new_photo.src);

			image.size(function (err, info) {
				if (err) {
					reject('Impossible de lire les informations de la photo');
					return;
				}

				if (!info.width || !info.height) {
					reject('Impossible de lire les dimensions de la photo');
					return;
				}

				if (!info.ratio) {
					info.ratio = info.width / info.height;
				}

				if ((info.ratio >= 1 && info.width < 1980) || (info.ratio < 1 && info.height < 1980)) {
					reject('La photo est trop petite (1980px minimum pour le plus grand côté)');
					return;
				}

				if (!info.orientation && (info.width && info.height)) {
					if (info.ratio === 1) {
						info.orientation = 'square';
					}
					else if (info.ratio > 1) {
						info.orientation = 'landscape';
					}
					else{
						info.orientation = 'portrait';
					}
				}

				new_photo.file_info = info;

				fsp.writeFile(newPath, image_raw_data).then(function () {
					return MSB.db.collection('photos').insert(new_photo).then(function (photo) {
						if (!photo) {
							reject('Impossible d\'enregistrer la photo dans la base de données');
							return;
						}

						MSB.db.collection('albums').findAndModify({
							query: {
								_id: pmongo.ObjectId(new_photo.album_id)
							},
							sort: {
								_id: 1
							},
							update: {
								$set: { last_modified: new Date() }
							},
							new: true
						}).then(function (album) {
							resolve(photo);
						}).catch(function (err) {
							console.error(err);
							reject('Impossible de mettre à jour l\'album dans la base de données');
						});
					});
				}).catch(function (err) {
					console.error(err);
					reject('Impossible d\'enregistrer la photo sur le serveur');
				});
			});
		}).catch(function (err) {
			console.error(err);
			reject('Impossible de lire la photo');
			return;
		});
	});
};
MSB.getPhoto = function (filter) {
	if (filter._id && typeof filter._id === 'string') {
		filter._id = pmongo.ObjectId(filter._id);
	}
	if (filter.owner_id && typeof filter.owner_id === 'string') {
		filter.owner_id = pmongo.ObjectId(filter.owner_id);
	}

	return new Promise(function (resolve, reject){
		var query = MSB.db.collection('photos').findOne(filter);
		
		query.then(function (photo) {
			if (!photo) {
				reject('Photo introuvable');
				return;
			}
			resolve(photo);
		}).catch(function (err) {
			reject('Erreur de la base de données');
			console.error(err);
		});
	});
};
MSB.getPhotos = function (filter, sort, limit, offset) {
	if (filter._id && typeof filter._id === 'string') {
		filter._id = pmongo.ObjectId(filter._id);
	}
	if (filter.owner_id && typeof filter.owner_id === 'string') {
		filter.owner_id = pmongo.ObjectId(filter.owner_id);
	}

	return new Promise(function (resolve, reject){
		var query = MSB.db.collection('photos').find(filter);

		if (sort) {
			query = query.sort(sort);
		}
		if (limit) {
			query = query.limit(limit);
		}
		if (offset) {
			query = query.offset(offset);
		}

		query.toArray().then(function (photos) {
			resolve(photos);
		}).catch(function (err) {
			reject('Erreur de la base de données');
			console.error(err);
		});
	});
};

module.exports = MSB;