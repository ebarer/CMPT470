var fs = require('fs');
var models = require('./models');

models.sequelize.sync({force: true}).then(function() {
    console.log("Populating DB...");

    fs.readFile('./songs.json', function(err, data) {
        var music_data = JSON.parse(data);
        var songs = music_data['songs'];

        songs.forEach(function(song) {
            models.Song.create({
                title: song.title,
                album: song.album,
                artist: song.artist,
                duration: song.duration,
            }).catch(function(err) {
                console.log(err);
            });
        });
    });
    
    fs.readFile('./playlists.json', function(err, data) {
        var music_data = JSON.parse(data);
        var playlists = music_data['playlists'];

        playlists.forEach(function(playlist) {
            models.Playlist.create({
                name: playlist.name
            }).then(function(playlistInstance) {
                playlistInstance.addSongs(playlist.songs);
            }).catch(function(err) {
                console.log(err);
            });
        });
    });
    
    users = [
        {
            username: 'Foo',
            password: '123'
        }, 
        {
            username: 'Bar',
            password: '456'
        }
    ];
    
    users.forEach(function(user) {
        models.User.create({
            username: user.username,
            password: user.password
        }).then(function(userInstance) {
            switch(user.username) {
                case 'Foo':
                    userInstance.addPlaylists([1,3]);
                    break;
                case 'Bar':
                    userInstance.addPlaylist([2,3]);
                    break;
                default: break;
            }
            
            console.log(userInstance);
        }).catch(function(err) {
            console.log(err);
        })
    });
});