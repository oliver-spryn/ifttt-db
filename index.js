'use strict';

let bodyParser = require('body-parser');
let express = require('express');
let firebase = require('firebase');
let request = require('request');

// Initialize the server and database
let config = {
	apiKey: process.env.IFTTT_DB_API_KEY,
	authDomain: process.env.IFTTT_DB_AUTH_DOMAIN,
	databaseURL: process.env.IFTTT_DB_DATABASE_URL,
	messagingSenderId: process.env.IFTTT_DB_MSG_SENDER_ID,
	storageBucket: process.env.IFTTT_DB_STORAGE_BUCKET
};

firebase.initializeApp(config);

let app = express();
let db = firebase.database();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Server pages
app.get('/api/v1/:guid', (req, res, next) => {
    db.ref('/' + req.params.guid).once('value', (snapshot) => {
		let task = snapshot.val();
		if (task == null) return next();
		
		res.json({
			metadata: task.metadata,
			type: task.type,
			value: task.value
		});
	});
});

app.post('/api/v1/:guid', (req, res) => {
    db.ref('/' + req.params.guid).once('value', (snapshot) => {
		let task = snapshot.val();
		if (task == null) return next();
		
		switch(task.type.toLowerCase()) {
			case 'toggle':
				let value = null;
				
				if(req.body.value == null || req.body.value == '') {
					res.status(500).json({
						reason: 'No data was sent',
						result: 'failure'
					});
					
					return;
				}
				
				value = parseInt(req.body.value);
				
				if(isNaN(value)) {
					res.status(500).json({
						reason: 'The value is not a number',
						result: 'failure'
					});
					
					return;
				}
			
				db.ref('/' + req.params.guid).child('value')
				.set(value % 2)
				.then(() => {
					res.json({
						result: 'success'
					});
				})
				.catch((error) => {
					res.status(500).json({
						reason: error,
						result: 'failure'
					});
				});
				
				break;
				
			default:
				next();
				break;
		}
	});
});

app.get('/api/v1/:guid/run', (req, res) => {
    db.ref('/' + req.params.guid).once('value', (snapshot) => {
		let task = snapshot.val();
		if (task == null) return next();
		
		switch(task.type.toLowerCase()) {
			case 'toggle':
				let value = task.value;
				let url = task.entries[value].url;
				
				request(url, (error, response, body) => {
					if (!error && response.statusCode == 200) {
						res.json({
							result: 'success'
						});
						
						return;
					}
					
					res.status(response.statusCode).json({
						reason: body,
						result: 'failure'
					});
				});
				
				break;
			
			default:
				next();
				break;
		}
	});
});

app.post('/api/v1/:guid/run', (req, res) => {
    db.ref('/' + req.params.guid).once('value', (snapshot) => {
		let task = snapshot.val();
		if (task == null) return next();
		let value = null;
		
		switch(task.type.toLowerCase()) {
			case 'toggle':
				if(req.body.value == null || req.body.value == '') {
					res.status(500).json({
						reason: 'No data was sent',
						result: 'failure'
					});
					
					return;
				}
				
				value = parseInt(req.body.value);
				
				if(isNaN(value)) {
					res.status(500).json({
						reason: 'The value is not a number',
						result: 'failure'
					});
					
					return;
				}
			
				db.ref('/' + req.params.guid).child('value')
				.set(value = value % 2)
				.then(() => {
					// Good, will report out after calling the IFTTT service in the next switch statement
				})
				.catch((error) => {
					res.status(500).json({
						reason: error,
						result: 'failure'
					});
					
					return;
				});
				
				break;
				
			default:
				return next();
				break;
		}
		
		switch(task.type.toLowerCase()) {
			case 'toggle':
				let url = task.entries[value].url;
				
				request(url, (error, response, body) => {
					if (!error && response.statusCode == 200) {
						res.json({
							result: 'success'
						});
						
						return;
					}
					
					res.status(response.statusCode).json({
						reason: body,
						result: 'failure'
					});
					
					return;
				});
				
				break;
			
			default:
				return next();
				break;
		}
	});
});

app.use((req, res) => {
    res.status(404).json({ });
});

// Start up the server
app.listen(process.env.PORT || 3000);