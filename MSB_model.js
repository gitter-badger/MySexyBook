/// <reference path="typings/node/node.d.ts"/>

var pkg = require('./package.json');
require('./public/js/prototypes.js');

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

var MSB_Model = {};

/* ---------- Passwords ---------- */

MSB_Model.hashPassword = function (pwd) {
	return crypto.createHash('sha512').update(app_config.pwd_salt_start + pwd + app_config.pwd_salt_end).digest('hex');
}

/* ---------- Users ---------- */

MSB_Model.createUser = function (email, password, pseudo, sex, geo_county_id) {
	var new_user = {
		email: email,
		password: MSB_Model.hashPassword(password),
		pseudo: pseudo,
		sex: sex,
		geo_county_id: geo_county_id,
		register_date: new Date()
	};

	return new Promise(function (resolve, reject){
		MSB_Model.getGeoCounty({
			_id: new_user.geo_county_id
		}).then(function (geo_county) {
			MSB_Model.db.collection('users').findOne({
				email: new_user.email
			}).then(function (user_email) {
				if (user_email) {
					reject('Vous avez déjà un compte. Avez-vous oublié votre mot de passe ?');
					return;
				}

				MSB_Model.db.collection('users').findOne({
					pseudo: new_user.pseudo
				}).then(function (user_pseudo) {
					if (user_pseudo) {
						reject('Ce pseudo est déjà pris');
						return;
					}

					return MSB_Model.db.collection('users').insert(new_user).then(function (user) {
						if (!user) {
							reject('Erreur lors de la création de l\'user');
							return;
						}

						Promise.all([
							fsp.mkdir('uploads/originals/' + user._id, 775), 
							fsp.mkdir('uploads/thumbs/' + user._id, 775)
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
MSB_Model.updateUser = function (user_id, sex, biography, geo_county_id, camera_side, photo_styles, photo_conditions) {
	return new Promise(function (resolve, reject) {
		if (!user_id) {
			reject('ID invalide');
			return;
		}

		var user_updates = {
			last_modified: new Date()
		};

		if (typeof sex === 'string') {
			user_updates.sex = sex;
		}
		if (typeof biography === 'string') {
			user_updates.biography = biography;
		}
		if (typeof geo_county_id === 'string') {
			user_updates.geo_county_id = geo_county_id;
		}
		if (typeof camera_side === 'string') {
			user_updates.camera_side = camera_side;
		}
		if (photo_styles instanceof Array) {
			user_updates.photo_styles = photo_styles;
		}
		if (typeof photo_conditions === 'string') {
			user_updates.photo_conditions = photo_conditions;
		}

		MSB_Model.getGeoCounty({
			_id: geo_county_id
		}).then(function (geo_county) {
			MSB_Model.db.collection('users').findAndModify({
				query: {
					_id: (typeof user_id === 'string' ? pmongo.ObjectId(user_id) : user_id)
				},
				update: {
					$set: user_updates
				},
				new: true
			}).then(function (results) {
				if (results.value) {
					resolve(results.value);
				}
				else {
					reject('Impossible de mettre à jour le profil dans la base de données');
				}
			}).catch(function () {
				reject('Impossible de mettre à jour le profil dans la base de données');
			});
		}).catch(function (err) {
			reject('Département invalide');
		});
	});
};
MSB_Model.updateUserLastLogin = function (user_id, session) {
	return new Promise(function (resolve, reject) {
		if (!user_id) {
			reject('ID invalide');
			return;
		}

		var user_updates = {
			last_login: new Date()
		};

		var updates = {
			$set: user_updates,
		};

		if (session && typeof session === 'object') {
			session.last_action = user_updates.last_login;
			updates.$push = { sessions : session }
		}

		MSB_Model.db.collection('users').findAndModify({
			query: {
				_id: (typeof user_id === 'string' ? pmongo.ObjectId(user_id) : user_id)
			},
			update: updates,
			new: true
		}).then(function (results) {
			if (results.value) {
				resolve(results.value);
			}
			else {
				reject('Impossible de mettre à jour le profil dans la base de données');
			}
		}).catch(function () {
			reject('Impossible de mettre à jour le profil dans la base de données');
		});
	});
};
MSB_Model.updateUserPassword = function (user_id, password) {
	return new Promise(function (resolve, reject) {
		if (!user_id) {
			reject('ID invalide');
			return;
		}

		var user_updates = {
			password: MSB_Model.hashPassword(password),
			last_modified: new Date()
		};

		MSB_Model.db.collection('users').findAndModify({
			query: {
				_id: (typeof user_id === 'string' ? pmongo.ObjectId(user_id) : user_id)
			},
			update: {
				$set: user_updates
			},
			new: true
		}).then(function (results) {
			if (results.value) {
				resolve(results.value);
			}
			else {
				reject('Impossible de mettre à jour le mot de passe dans la base de données');
			}
		}).catch(function () {
			reject('Impossible de mettre à jour le mot de passe dans la base de données');
		});
	});
};
MSB_Model.deleteUser = function (user) {
	return new Promise(function (resolve, reject) {
		MSB_Model.db.collection('users').remove({ _id: user._id }, true).then(function () {
			MSB_Model.getAlbums({ creator_id: user._id }).then(function (albums) {
				var albums_promises = new Array(albums.length);

				albums.forEach(function (album, index) {
					albums_promises.push(MSB_Model.deleteAlbum(album));
				});

				Promise.all(albums_promises).then(function () {
					var thumbs_dir = 'uploads/thumbs/' + user._id;

					fsp.readdir(thumbs_dir).then(function (thumbs) {
						var folder_promises = new Array();

						thumbs.forEach(function (thumb_name) {
							folder_promises.push(fsp.unlink(thumbs_dir + '/' + thumb_name));
						});

						folder_promises.push(fsp.rmdir('uploads/originals/' + user._id));
						folder_promises.push(fsp.rmdir(thumbs_dir));

						Promise.all(folder_promises).then(function () {
							resolve('Utilisateur supprimé');
						}).catch(function (err) {
							console.error(err);
							reject('Impossible de supprimer le dossier personnel le l\'utilisateur ' + user._id);
						});
					}).catch(function (err) {
						console.error(err);
						reject('Dossier de miniatures personnel illisible');
					});
				}).catch(function (err) {
					reject(err);
				});
			}).catch(function () {});
		}).catch(function () {
			reject('Impossible de supprimer l\'utilisateur de la base de données');
		});
	});
};
MSB_Model.getUser = function (filter) {
	if (filter._id && typeof filter._id === 'string') {
		filter._id = pmongo.ObjectId(filter._id);
	}

	return new Promise(function (resolve, reject){
		var query = MSB_Model.db.collection('users').findOne(filter);
		
		query.then(function (user) {
			if (!user) {
				reject('Utilisateur introuvable');
				return;
			}

			MSB_Model.getGeoCounty({ _id: user.geo_county_id }).then(function (geo_county) {
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
MSB_Model.getUsers = function (filter, sort, limit, offset) {
	if (filter._id && typeof filter._id === 'string') {
		filter._id = pmongo.ObjectId(filter._id);
	}

	return new Promise(function (resolve, reject){
		var query = MSB_Model.db.collection('users').find(filter);

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

MSB_Model.getGeoCounty = function (filter) {
	return new Promise(function (resolve, reject){
		var query = MSB_Model.db.collection('geo_counties').findOne(filter);
		
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
MSB_Model.getGeoCounties = function (filter, sort, limit, offset) {
	return new Promise(function (resolve, reject){
		var query = MSB_Model.db.collection('geo_counties').find(filter);

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

MSB_Model.createAlbum = function (creator_id, title, description, is_private) {
	var new_album = {
		creator_id: typeof creator_id === 'string' ? pmongo.ObjectId(creator_id) : creator_id,
		title: title,
		created_at: new Date()
	};

	if (typeof description === 'string') {
		new_album.description = description;
	}

	if (typeof is_private !== 'undefined') {
		new_album.is_private = is_private ? true : false;
	}

	return new Promise(function (resolve, reject){
		MSB_Model.db.collection('albums').findOne({
			creator_id: new_album.creator_id,
			title: new_album.title
		}).then(function (album_title) {
			if (album_title) {
				reject('Vous avez déjà un album portant ce nom');
				return;
			}

			return MSB_Model.db.collection('albums').insert(new_album).then(function (album) {
				if (!album) {
					reject('Erreur lors de la création de l\'album');
					return;
				}

				Promise.all([
					fsp.mkdir('uploads/originals/' + new_album.creator_id + '/' + album._id, 775), 
					fsp.mkdir('uploads/thumbs/' + new_album.creator_id + '/' + album._id, 775)
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
MSB_Model.updateAlbum = function (album_id, title, description, is_private) {
	return new Promise(function (resolve, reject) {
		if (!album_id) {
			reject('ID invalide');
			return;
		}

		var album_updates = {
			last_modified: new Date()
		};

		if (typeof title === 'string') {
			album_updates.title = title;
		}

		if (typeof description === 'string') {
			album_updates.description = description;
		}

		if (typeof is_private !== 'undefined') {
			album_updates.is_private = is_private ? true : false;
		}

		MSB_Model.db.collection('albums').findAndModify({
			query: {
				_id: (typeof album_id === 'string' ? pmongo.ObjectId(album_id) : album_id)
			},
			update: {
				$set: album_updates
			},
			new: true
		}).then(function (results) {
			if (results.value) {
				resolve(results.value);
			}
			else {
				reject('Impossible de mettre à jour le profil dans la base de données');
			}
		}).catch(function () {
			reject('Impossible de mettre à jour l\'album dans la base de données');
		});
	});
};
MSB_Model.deleteAlbum = function (album) {
	return new Promise(function (resolve, reject) {
		MSB_Model.db.collection('albums').remove({ _id: album._id }, true).then(function () {
			MSB_Model.getPhotos({ album_id: album._id }).then(function (photos) {
				var photos_promises = new Array(photos.length);

				photos.forEach(function (photo, index) {
					photos_promises.push(MSB_Model.deletePhoto(photo));
				});

				Promise.all(photos_promises).then(function () {
					Promise.all([
						fsp.rmdir('uploads/originals/' + album.creator_id + '/' + album._id),
						fsp.rmdir('uploads/thumbs/' + album.creator_id + '/' + album._id)
					]).then(function () {
						resolve('Album supprimé');
					}).catch(function (err) {
						console.error(err);
						reject('Impossible de supprimer le dossier de l\'album ' + album.creator_id + '/' + album._id);
					});
				}).catch(function (err) {
					reject(err);
				});
			}).catch(function () {});
		}).catch(function () {
			reject('Impossible de supprimer l\'album de la base de données');
		});
	});
};
MSB_Model.getAlbum = function (filter) {
	if (filter._id && typeof filter._id === 'string') {
		filter._id = pmongo.ObjectId(filter._id);
	}
	if (filter.creator_id && typeof filter._id === 'string') {
		filter.creator_id = pmongo.ObjectId(filter.creator_id);
	}
	return new Promise(function (resolve, reject){
		var query = MSB_Model.db.collection('albums').findOne(filter);
		
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
MSB_Model.getAlbums = function (filter, sort, limit, offset) {
	if (filter._id && typeof filter._id === 'string') {
		filter._id = pmongo.ObjectId(filter._id);
	}
	if (filter.creator_id && typeof filter.creator_id === 'string') {
		filter.creator_id = pmongo.ObjectId(filter.creator_id);
	}

	return new Promise(function (resolve, reject){
		var query = MSB_Model.db.collection('albums').find(filter);

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

MSB_Model.createPhoto = function (temp_img, album_id, owner_id, title) {
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
					return MSB_Model.db.collection('photos').insert(new_photo).then(function (photo) {
						if (!photo) {
							reject('Impossible d\'enregistrer la photo dans la base de données');
							return;
						}

						MSB_Model.updateAlbum(new_photo.album_id).then(function (album) {
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
MSB_Model.updatePhoto = function (photo_id, title) {
	return new Promise(function (resolve, reject) {
		if (!photo_id) {
			reject('ID invalide');
			return;
		}

		var photo_updates = {
			last_modified: new Date()
		};

		if (typeof title === 'string') {
			photo_updates.title = title;
		}

		MSB_Model.db.collection('photos').findAndModify({
			query: {
				_id: (typeof photo_id === 'string' ? pmongo.ObjectId(photo_id) : photo_id)
			},
			update: {
				$set: photo_updates
			},
			new: true
		}).then(function (results) {
			if (results.value) {
				resolve(results.value);
			}
			else {
				reject('Impossible de mettre à jour le profil dans la base de données');
			}
		}).catch(function () {
			reject('Impossible de mettre à jour la photo dans la base de données');
		});
	});
};
MSB_Model.deletePhoto = function (photo) {
	return new Promise(function (resolve, reject) {
		MSB_Model.db.collection('photos').remove({ _id: photo._id }, true).then(function () {
			fsp.unlink('uploads/originals/' + photo.owner_id + '/' + photo.album_id + '/' + photo.src).then(function () {

				var thumbs_dir = 'uploads/thumbs/' + photo.owner_id + '/' + photo.album_id;

				fsp.readdir(thumbs_dir).then(function (thumbs) {
					var thumbs_promises = new Array();
					var thumbs_regex = new RegExp('(.*)_' + photo._id + '\.([a-z]{3,4})$');

					thumbs.forEach(function (thumb_name) {
						if (thumb_name.match(thumbs_regex)) {
							thumbs_promises.push(fsp.unlink(thumbs_dir + '/' + thumb_name));
						}
					});

					Promise.all(thumbs_promises).then(function () {
						resolve('Photo supprimée');
					}).catch(function (err) {
						reject('Impossible de supprimer les miniatures de la photo ' + photo.owner_id + '/' + photo.album_id + '/' + photo.src);
					});
				}).catch(function () {
					reject('Dossier des miniatures (' + photo.owner_id + '/' + photo.album_id + ') illisibles');
				});
			}).catch(function (err) {
				console.error(err);
				reject('Impossible de supprimer la photo ' + photo.owner_id + '/' + photo.album_id + '/' + photo.src);
			});
		}).catch(function (err) {
			reject('Impossible de supprimer la photo ' + photo._id + ' de la base de données');
		});
	});
};
MSB_Model.getPhoto = function (filter) {
	if (filter._id && typeof filter._id === 'string') {
		filter._id = pmongo.ObjectId(filter._id);
	}
	if (filter.owner_id && typeof filter.owner_id === 'string') {
		filter.owner_id = pmongo.ObjectId(filter.owner_id);
	}

	return new Promise(function (resolve, reject){
		var query = MSB_Model.db.collection('photos').findOne(filter);
		
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
MSB_Model.getPhotos = function (filter, sort, limit, offset) {
	if (filter._id && typeof filter._id === 'string') {
		filter._id = pmongo.ObjectId(filter._id);
	}
	if (filter.owner_id && typeof filter.owner_id === 'string') {
		filter.owner_id = pmongo.ObjectId(filter.owner_id);
	}

	return new Promise(function (resolve, reject){
		var query = MSB_Model.db.collection('photos').find(filter);

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

module.exports = MSB_Model;