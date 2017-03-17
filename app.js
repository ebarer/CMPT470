/* Elliot Barer, ebarer [at] mac [dot] com, 2017-01-31 */


//////////////////////////////////////////////////
// REQUIREMENTS
//////////////////////////////////////////////////
var fs = require('fs');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var bcrypt = require('bcrypt');

var Sequelize = require("sequelize");
var models = require('./models');

var server = require('http').Server(app);
var io = require('socket.io')(server);


//////////////////////////////////////////////////
// CRYPTO FUNCTIONALITY for SESSIONS
//////////////////////////////////////////////////
var crypto = require('crypto');

var generateKey = function() {
    var sha = crypto.createHash('sha256');
    sha.update(Math.random().toString());
    return sha.digest('hex');
};


//////////////////////////////////////////////////
// CREATE EXPRESS SERVER
//////////////////////////////////////////////////
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(function(request, response, next) {    
    var cookies = request.cookies;
    var sessionKey = cookies['sessionKey'];
    
    models.Session.find({
        where: { sessionKey: sessionKey }
    }).then(function(sessionInstance){
        if (sessionInstance) {
            models.User.find({
                where: { id: sessionInstance.sessionUser }
            }).then(function(userInstance) {
                userInstance.getPlaylists().then(function(playlists){
                    playlists = playlists.map(function(playlist){
                        return playlist.id
                    });
                    
                    request.session = sessionInstance.sessionUser
                    request.playlists = playlists;
                    next();
                });
            });
        } else {
            response.clearCookie('sessionKey');
            next();
        }
    });
});


//////////////////////////////////////////////////
// PAGES
//////////////////////////////////////////////////
app.get('/login', function(request, response) {
    loadPage(request, response, 'login.html');
});

app.post('/login', function(request, response) {
    var data = request.body;
    
    models.User.find({
        where: { username: data.username }
    }).then(function(user){
        if (user) {
            bcrypt.compare(data.password, user.password, function(err, result) {
                if (result) {
                    var sessKey = generateKey();
                    // 1. Create a new session entry
                    models.Session.create({
                        sessionUser: user.id,
                        sessionKey: sessKey
                    }).then(function(sessionInstance) {
                        // 2. Respond to request with a Set-Cookie:
                        response.cookie('sessionKey', sessKey);                
                        response.redirect(301, 'http://localhost:3000/playlists');
                    }).catch(function(err) {
                        console.log(err);
                    });
                } else {
                    response.redirect(401, 'http://localhost:3000/login');
                }
            });
        } else {
            response.clearCookie('sessionKey').redirect(401, 'http://localhost:3000/login');
        }
    });
});

app.get('/logout', function(request, response) {
    response.clearCookie('sessionKey').redirect(301, 'http://localhost:3000/login');
})

app.get('/playlists', function(request, response) {
    if (request.session) {
        loadPage(request, response, 'playlist.html');
    } else {
        response.redirect(301, 'http://localhost:3000/login');
    }
});

app.get('/library', function(request, response) {
    if (request.session) {
        loadPage(request, response, 'playlist.html');
    } else {
        response.redirect(301, 'http://localhost:3000/login');
    }
});

app.get('/search', function(request, response) {
    if (request.session) {
        loadPage(request, response, 'playlist.html');
    } else {
        response.redirect(301, 'http://localhost:3000/login');
    }
});

app.get('/', function(request, response) {
    if (request.session) {
        response.redirect(301, 'http://localhost:3000/playlists');
    } else {
        response.redirect(301, 'http://localhost:3000/login');
    }
});

var loadPage = function(request, response, page) {
    response.status(200);
    response.setHeader('Content-Type', 'text/html');
    response.setHeader('Cache-Control', 'max-age=1800');
    
    var fPath = path.join(__dirname, page);
    fs.createReadStream(fPath).pipe(response);
}


//////////////////////////////////////////////////
// API
//////////////////////////////////////////////////
// Get all songs
app.get('/api/songs/', function(request, response) {    
    models.Song.findAll({
        attributes: { exclude: ['createdAt', 'updatedAt'] },
    }).then(function(songs) {
        response.status(200).end(JSON.stringify({'songs' : songs}, null, 4));
    });
});

// Get a song
app.get('/api/songs/:id/', function(request, response) {    
    models.Song.findById(request.params.id, {
        include: [{
            model: models.Playlist,
            attributes: ['id'],
            where: { song_id: Sequelize.col('song.id') },
            required: false,
            through: {
                attributes: []
            }
        }]
    }).then(function(songInstance) {
        song = {
                'id': songInstance.id,
                'title': songInstance.title,
                'album': songInstance.album,
                'artist': songInstance.artist,
                'duration': songInstance.duration,
                'playlists': songInstance.Playlists.map(function(playlist) { return playlist.id })
        };
        
        response.status(200).end(JSON.stringify({'song' : song}, null, 4));
    });
});

// Get all playlists
app.get('/api/playlists/', function(request, response) {
    models.Playlist.findAll({
        attributes: ['id', 'name'],
        where: {
            id: { $in: request.playlists }
        },
        include: [{
            model: models.Song,
            attributes: ['id'],
            where: { playlist_id: Sequelize.col('playlist.id') },
            required: false,
            through: {
                attributes: []
            }
        }]
    }).then(function(playlists) {            
        playlists = playlists.map(function(playlist) {
            return {
                'id': playlist.id,
                'name': playlist.name,
                'songs': playlist.Songs.map(function(song) { return song.id })
            }
        });
        
        response.status(200).end(JSON.stringify({'playlists' : playlists}, null, 4));
    });
});

// Add new playlist
app.post('/api/playlists/', function(request, response) {
    var data = request.body;
    var playlist_name = data.name;
    
    models.Playlist.create({
        name: playlist_name
    }).then(function(playlistInstance) {
        var data = {
            'id' : playlistInstance.id,
            'name' : playlist_name
        }
                
        response.status(200).end(JSON.stringify(data, null, 4)); 
    }).catch(function(err) {
        console.log(err);
    });
});

// Add songs to playlist
app.post('/api/playlists/:id/', function(request, response) {
    var data = request.body;
    var song_id = data.song;
    var playlist_id = parseInt(request.params.id);

    // User doesn't have permission to access playlist
    if (request.playlists.indexOf(playlist_id) === -1) {
        response.status(403).end();
    }
        
    models.Playlist.findById(playlist_id).then(function(playlist) {
        models.Song.findById(song_id).then(function(song) {
            playlist.addSong(song).then(function() {
                response.status(200).end();
            }).catch(function(err) {
                var data = {'error': err}
                response.status(422).end(JSON.stringify(data));
            });
        });
    });
});

// Delete songs from playlist
app.delete('/api/playlists/:id/', function(request, response) {
    var data = request.body;
    var song_id = data.song;
    var playlist_id = parseInt(request.params.id);

    // User doesn't have permission to access playlist
    if (request.playlists.indexOf(playlist_id) === -1) {
        response.status(403).end();
    }
        
    models.Playlist.findById(playlist_id).then(function(playlist) {
        models.Song.findById(song_id).then(function(song) {            
            playlist.removeSong(song).then(function() {
                response.status(200).end();
            }).catch(function(err) {
                var data = {'error': err}
                response.status(422).end(JSON.stringify(data));
            });
        });
    });
});

// Add user to playlist
app.post('/api/playlists/:id/users/', function(request, response) {
    var data = request.body;
    var playlist_id = parseInt(request.params.id);
    var user_id = request.body.user;

    models.Playlist.findById(playlist_id).then(function(playlist) {
        models.User.findById(user_id).then(function(user) {
            playlist.addUser(user).then(function() {
                response.status(200).end();
            }).catch(function(err) {
                var data = {'error': err}
                response.status(422).end(JSON.stringify(data));
            });
        });
    });
});

// Get all users
app.get('/api/users/', function(request, response) {
    models.User.findAll({
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        include: [{
            model: models.Playlist,
            attributes: ['id'],
            where: { user_id: Sequelize.col('user.id') },
            required: false,
            through: {
                attributes: []
            }
        }]
    }).then(function(users) {
        users = users.map(function(user) {
            return {
                'id': user.id,
                'username': user.username,
                'playlists': user.Playlists.map(function(playlist) { return playlist.id })
            }
        });
        
        response.status(200).end(JSON.stringify({'users' : users}, null, 4));
    });
});

app.get('/api/users/current', function(request, response) {
    response.status(200).end(JSON.stringify({'user' : request.session}, null, 4));
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
// REAL TIME
//////////////////////////////////////////////////

/*
var getSongs = function(callback) {
    models.Song.findAll()
        .then(function(songs) {
            var songs = {
                'songs': songs.map(function(song) {
                    return song.get({plain: true})
                })
            }
            callback(songs);
        });
};

io.on('connection', function(socket) {
    console.log('A user connected!');

    // When a user requests songs for a playlist, send it.
    socket.on('getSongsForPlaylist', function(playlistId) {
        console.log('Got request for playlist ' + playlistId);
        getSongs(function(songData) {
            socket.emit('receiveSongsForPlaylist', JSON.stringify(songData));
        })
    });

    // When a user requests songs for a playlist, send it.
    socket.on('addNewSongToPlaylist', function(data) {
        var playlistId = data.playlist;
        var song = data.song

        models.Song.create({
            artist: song.artist,
            title: song.title,
            album: song.album,
            duration: song.duration,
        });
        
        getSongs(function(songData) {
            socket.broadcast.emit('receiveSongsForPlaylist', JSON.stringify(songData));
            socket.emit('receiveSongsForPlaylist', JSON.stringify(songData));

            // An improvement we could (should) make: only send
            // the new song to the rest of the clients listening.
        })
    });
});
*/


//////////////////////////////////////////////////
// START SERVER (port: 3000)
//////////////////////////////////////////////////
app.listen(3000, function() {
    console.log('Amazing music app server listening on port 3000!')
});

/*
models.sequelize.sync().then(function() {
    server.listen(3000, function () {
        console.log('Amazing music app server listening on port 3000!')
    });
});
*/
