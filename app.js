/* Elliot Barer, ebarer [at] mac [dot] com, 2017-01-31 */


//////////////////////////////////////////////////
// REQUIREMENTS
//////////////////////////////////////////////////
var fs = require('fs');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var Sequelize = require("sequelize");

var models = require('./models');


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
    response.setHeader('Content-Type', 'text/json');
    response.setHeader('Cache-Control', 'max-age=1800');
    
    models.Song.findAll()
        .then(function(songs) {
            response.end(JSON.stringify({'songs' : songs}, null, 4));
        });
});

app.get('/api/playlists', function(request, response) {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'text/json');
    response.setHeader('Cache-Control', 'max-age=1800');
    
    // TODO: More elegant solution for converting list of songs into array of IDs?
    models.Playlist.findAll({
            attributes: ['id', 'name'],
            include: [{
                model: models.Song,
                attributes: ['id'],
                where: { playlist_id: Sequelize.col('playlist.id') },
                through: {
                    attributes: []
                }
            }]
        })
        .then(function(playlists) {            
            playlists = playlists.map(function(playlist) {
                return {
                    'id': playlist.id,
                    'name': playlist.name,
                    'songs': playlist.Songs.map(function(song) { return song.id })
                }
            });
            
            response.end(JSON.stringify({'playlists' : playlists}, null, 4));
        });
});

app.post('/api/playlists', function(request, response) {
    var data = request.body;
    
    if (data.playlistName) {
        console.log(data.playlistName);

        models.Playlist.create({
            name: data.playlistName
        }).then(function(playlistInstance){
            response.statusCode = 200;
            response.setHeader('Content-Type', 'text/plain');
            response.end('Updated file successfully: ' + playlistInstance);
        }).catch(function(err) {
            response.statusCode = 400;
            response.setHeader('Content-Type', 'text/plain');
            response.end('Error updating file: ' + err);
        });
    }    
    else if (data.playlistID && data.songID) {
        console.log(data.playlistID + " - " + data.songID);
    }
    else {
        response.end('Updated file successfully.');
    }
            
/*
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
*/
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

app.use('/img', express.static(__dirname + '/img'));


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
