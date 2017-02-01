//////////////////////////////////////////////////
// REQUIREMENTS
//////////////////////////////////////////////////
var http = require('http');
var path = require('path');
var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');


//////////////////////////////////////////////////
// CREATE EXPRESS SERVER
//////////////////////////////////////////////////
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


//////////////////////////////////////////////////
// PAGES
//////////////////////////////////////////////////
app.get('/playlists', function(request, response) {
    loadPage(request, response);
});

app.get('/library', function(request, response) {
    loadPage(request, response);
});

app.get('/search', function(request, response) {
    loadPage(request, response);
});

app.get('/', function(request, response) {
    response.status(301);
    response.setHeader('Location', 'http://localhost:3000/playlists');
    response.send('Redirecting to Playlists\n');
});

var loadPage = function(request, response) {
    response.status(200);
    response.setHeader('Content-Type', 'text/html');
    response.setHeader('Cache-Control', 'max-age=1800');
    
    var fPath = path.join(__dirname, 'playlist.html');
    fs.createReadStream(fPath).pipe(response);
}


//////////////////////////////////////////////////
// API
//////////////////////////////////////////////////
app.get('/api/songs', function(request, response) {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'max-age=1800');
    
    var fPath = path.join(__dirname, 'songs.json');
    fs.createReadStream(fPath).pipe(response);
});

app.get('/api/playlists', function(request, response) {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'max-age=1800');
    
    var fPath = path.join(__dirname, 'playlists.json');
    fs.createReadStream(fPath).pipe(response);
});

app.post('/api/playlists', function(request, response) {
    var data = JSON.stringify(request.body, null, '\t');
    
    fs.writeFile('playlists.json', data, function(error) {
        if (error) {
            response.statusCode = 400;
            response.setHeader('Content-Type', 'text/plain');
            response.end('Error updating file.');
        }

        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/plain');
        response.end('Updated file successfully.');
    });
});


//////////////////////////////////////////////////
// JAVASCRIPT
//////////////////////////////////////////////////
app.get('/music-app.js', function(request, response) {    
    response.statusCode = 200;
    response.setHeader('Content-Type', 'text/javascript');
    response.setHeader('Cache-Control', 'max-age=1800');

    var fPath = path.join(__dirname, request.url);
    fs.createReadStream(fPath).pipe(response);
});


//////////////////////////////////////////////////
// STYLESHEETS + IMAGES
//////////////////////////////////////////////////
app.get('/playlist.css', function(request, response) {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'text/css');
    response.setHeader('Cache-Control', 'max-age=1800');

    var fPath = path.join(__dirname, request.url);
    fs.createReadStream(fPath).pipe(response);
});

app.get('/img/playlist.jpg', function(request, response) {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'image/jpeg');
    response.setHeader('Cache-Control', 'max-age=1800');

    var fPath = path.join(__dirname, request.url);
    fs.createReadStream(fPath).pipe(response);
});

app.get('/img/song.jpg', function(request, response) {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'image/jpeg');
    response.setHeader('Cache-Control', 'max-age=1800');

    var fPath = path.join(__dirname, request.url);
    fs.createReadStream(fPath).pipe(response);
});


//////////////////////////////////////////////////
// SERVER 404 (for all other pages)
//////////////////////////////////////////////////
app.get('*', function(request, response) {
    response.status(404).send('<html><body><h1>404 Error</h1></body></html>');
});


//////////////////////////////////////////////////
// START SERVER (port: 3000)
//////////////////////////////////////////////////
app.listen(3000, function() {
    console.log('Amazing music app server listening on port 3000!')
});