/* Elliot Barer, ebarer [at] mac [dot] com, 2017-01-31 */


//////////////////////////////////////////////////
// REQUIREMENTS
//////////////////////////////////////////////////
var fs = require('fs');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cookieParserSocket = require('socket.io-cookie-parser');
var bcrypt = require('bcrypt');

var Sequelize = require("sequelize");
var models = require('./models');

var app = express();
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
// MIDDLE-LAYER
//////////////////////////////////////////////////
var clearCookie = function(response) {
    response.clearCookie('sessionKey');
    response.cookie("sessionKey", "", { expires: new Date() });
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(function(request, response, next) {
    var sessionKey = request.cookies['sessionKey'];
    
    authorize(sessionKey, function(user, playlists){
        request.session = user;
        request.playlists = playlists;
        next();
    }, function(){
        clearCookie(response);
        next();
    })
});

io.use(cookieParserSocket());
io.use(function(socket, next) {
    var sessionKey = socket.request.cookies['sessionKey'];
    
    authorize(sessionKey, function(user, playlists){
        socket.session = user;
        socket.playlists = playlists;
        next();
    }, function(){
        next();
    })
});

var authorize = function(sessionKey, success, failure) {
    if (sessionKey !== undefined) {
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

                        if (success && typeof(success) === "function") {
                            success(sessionInstance.sessionUser, playlists);
                        }
                    });
                });
            } else {
                if (failure && typeof(failure) === "function") {
                    failure();
                }
            }
        });
    } else {
        if (failure && typeof(failure) === "function") {
            failure();
        }
    }
}


//////////////////////////////////////////////////
// PAGES
//////////////////////////////////////////////////
app.get('/login', function(request, response) {
    response.status(200);
    response.setHeader('Content-Type', 'text/html');
    
    var fPath = path.join(__dirname, 'login.html');
    fs.createReadStream(fPath).pipe(response);
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
                        // Set expiry to ~10 years in the future
                        var expiry = new Date((new Date()).getTime() + (3000 * 86400000))
                        response.cookie("sessionKey", sessKey, { expires: expiry });
                        response.redirect(301, 'http://localhost:3000/playlists');
                    }).catch(function(err) {
                        console.log(err);
                    });
                } else {
                    response.redirect(401, 'http://localhost:3000/login');
                }
            });
        } else {
            response.redirect(401, 'http://localhost:3000/login');
        }
    });
});

app.get('/logout', function(request, response) {
    clearCookie(response);
    response.redirect(301, 'http://localhost:3000/login');
})

app.get('/playlists', function(request, response) {
    loadPage(request, response, 'playlist.html');
});

app.get('/library', function(request, response) {
    loadPage(request, response, 'playlist.html');
});

app.get('/search', function(request, response) {
    loadPage(request, response, 'playlist.html');
});

app.get('/', function(request, response) {
    response.redirect(301, 'http://localhost:3000/playlists');
});

var loadPage = function(request, response, page) {    
    if (request.session) {
        response.status(200);
        response.setHeader('Content-Type', 'text/html');
        
        var fPath = path.join(__dirname, page);
        fs.createReadStream(fPath).pipe(response);
    } else {
        response.redirect(301, 'http://localhost:3000/login');
    }
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
// REAL TIME
//////////////////////////////////////////////////
io.on('connection', function(socket) {
    socket.on('addToPlaylist', function(data_j) {
        var data = JSON.parse(data_j);
        var song_id = data.song;
        var playlist_id = data.playlist;

        if (socket.playlists.indexOf(playlist_id) !== -1) {
            models.Playlist.findById(playlist_id).then(function(playlist) {
                models.Song.findById(song_id).then(function(song) {                
                    playlist.addSong(song).then(function() {
                        var response = {
                            'playlist' : playlist_id,
                            'song' : song_id
                        }
                        
                        // Broadcast to all nodes except sender
                        socket.broadcast.emit('addSongToPlaylist', JSON.stringify(response, null, '\t'))
                    });
                });
            });
        }
    });
    
    socket.on('removeFromPlaylist', function(data_j) {
        var data = JSON.parse(data_j);
        var song_id = data.song;
        var playlist_id = data.playlist;
        
        if (socket.playlists.indexOf(playlist_id) !== -1) {
            models.Playlist.findById(playlist_id).then(function(playlist) {
                models.Song.findById(song_id).then(function(song) {                
                    playlist.removeSong(song).then(function() {
                        var response = {
                            'playlist' : playlist_id,
                            'song' : song_id
                        }
                        
                        // Broadcast to all nodes except sender
                        socket.broadcast.emit('removeSongFromPlaylist', JSON.stringify(response, null, '\t'))
                    });
                });
            });
        }
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

models.sequelize.sync().then(function() {
    server.listen(3000, function() {
        console.log('Amazing music app server listening on port 3000!')
    });
});
