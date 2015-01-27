var Promise = require('promise');
var fs = require('fs');
var http = require('http');
var https = require('https');
var pmongo = require('promised-mongo');
var express = require('express');
var strftime = require('strftime');
require('./public/js/prototypes.js');
var dots = require('dot').process({ path: __dirname + '/views'});
var render = require('./render');

var app = express();

app.locals.url = 'http://127.0.0.1:8080';
app.locals.title = 'My Sexy Book';
app.locals.strftime = require('strftime');
app.locals.root_url = '//mysexybook.photo';
app.locals.contact_email = 'contact@mysexybook.photo';

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
	
	console.log('Node server started listening');
}
catch(e) {
	console.error(e);
}


app.use('/assets', express.static(__dirname + '/public'));

app.use(function (req, res, next) {
	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	res.setHeader('Content-language', 'fr_FR');
	next();
});

app.route('/').get(function (req, res) {
	db.collection('users').find({  })/*.sort({ registered: 1 })*/.limit(10).toArray().then(function (last_users) {
		res.write(dots._header({ app: app.locals }));
		res.write(dots.index({ app: app.locals, last_users: last_users }));
		res.write(dots._footer({ app: app.locals, strftime: strftime }));
		res.end();
	});
});

app.route('/book/:userid').get(function (req, res, next) {
	db.collection('users').findOne({ name: req.params.userid }).then(function (user) {
		if (!user) {
			res.write(dots._header({ app: app.locals }));
			res.write(dots.error404({ app: app.locals, error: { message: 'Profil introuvable' } }));
			res.write(dots._footer({ app: app.locals, strftime: strftime }));
			res.end();
			return;
		}

		db.collection('books').find({ creator: user._id }).toArray().then(function (books) {
			res.write(dots._header({ app: app.locals }));
			res.write(dots.user_book({ app: app.locals, user: user, books: books }));
			res.write(dots._footer({ app: app.locals, strftime: strftime }));
			res.end();
		});
	});
});

app.route('/search/:searchstr').get(function (req, res, next) {
	db.collection('users').find({ name: new RegExp(req.params.searchstr, 'i') }).toArray().then(function (search_results) {
		res.write(dots._header({ app: app.locals }));
		res.write(dots.search({ app: app.locals, search_term: req.params.searchstr, search_results: search_results }));
		res.write(dots._footer({ app: app.locals, strftime: strftime }));
		res.end();
	});
});

app.use(function (req, res, next) {
	res.status(404);

	res.write(dots._header({ app: app.locals }));
	res.write(dots.error404({ app: app.locals }));
	res.write(dots._footer({ app: app.locals, strftime: strftime }));

	res.end();
});
