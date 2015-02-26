var fsp = require('fs-promise');
var Promise = require('promise');
var pmongo = require('promised-mongo');

var MSB = {};

MSB.hashPassword = function (pwd) {
	return crypto.createHash('sha512').update(app_config.pwd_salt_start + pwd + app_config.pwd_salt_end).digest('hex');
}

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
		}).then(function () {
			return MSB.db.collection('albums').insert(new_album).then(function (album) {
				if (!album) {
					reject('Erreur lors de la création de l\'album');
					return;
				}

				Promise.all([
					fsp.mkdir('uploads/originals/' + req.session.current_user._id + '/' + album._id), 
					fsp.mkdir('uploads/thumbs/' + req.session.current_user._id + '/' + album._id)
				]).then(function () {
					resolve(album);
				}).catch(function (err) {
					reject('Erreur lors de la création des dossiers de l\'album');
					console.error(err);
				});
			}).then(function (album) {

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

MSB.createPhoto = function (src, album_id, owner_id, title, info) {
	var new_photo = {
		album_id: typeof album_id === 'string' ? pmongo.ObjectId(album_id) : album_id,
		owner_id: typeof owner_id === 'string' ? pmongo.ObjectId(owner_id) : owner_id,
		uploaded_at: new Date()
	};

	if (title) {
		new_photo.title = title;
	}

	if (info) {
		new_photo.info = info;
	}
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

module.exports = MSB;