/* Elliot Barer, ebarer [at] mac [dot] com, 2017-01-16 */

//////////////////////////////////////////////////
// REQUIREMENTS
//////////////////////////////////////////////////
var path = require('path');
var fs = require("fs");
var file = "music.db";

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(file);

db.serialize(function () {
    if (fs.existsSync(file)) {
        console.log("Databse already exists:")
        getCountSongs();
        getCountPlaylists();
        getCountMerge();
        return;
    };
    
    db.run("CREATE TABLE songs (" +
            "'id' INTEGER PRIMARY KEY," +
            "'album' VARCHAR(255)," +
            "'title' VARCHAR(255)," +
            "'artist' VARCHAR(255)," +
            "'duration' INTEGER)"
    );
                               
    db.run("CREATE TABLE playlists ('id' INTEGER PRIMARY KEY, 'name' VARCHAR(255))");
    
    db.run("CREATE TABLE songs_playlists (" +
            "'id' INTEGER PRIMARY KEY," +
            "'playlist_id' INTEGER," +
            "'song_id' INTEGER," +
            "FOREIGN KEY(playlist_id) REFERENCES playlists(id)," +
            "FOREIGN KEY(song_id) REFERENCES songs(id))"
    );

    fs.readFile(__dirname + '/songs.json', function(err, data) {
        var songs = JSON.parse(data)['songs'];
        
        fs.readFile(__dirname + '/playlists.json', function(err, data) {
            var playlists = JSON.parse(data)['playlists'];
        
            // Insert songs into "songs" table
            for (var i = 0, song; song = songs[i]; i++) {
                db.run('INSERT INTO songs (album, title, artist, duration) VALUES ($album, $title, $artist, $duration)', {
                    $album: song.album,
                    $title: song.title,
                    $artist: song.artist,
                    $duration: song.duration
                }, function(err, data) {
                    if (err !== null) {
                        console.log(err);
                    }
                });
            }
    
            getCountSongs();
            
            // Insert playlists into "playlists" table
            for (var i = 0, playlist; playlist = playlists[i]; i++) {
                db.run('INSERT INTO playlists (name) VALUES ($name)', {
                    $name: playlist.name
                }, function(err, data) {
                    if (err !== null) {
                        console.log(err);
                    }
                });
            }
    
            getCountPlaylists();
            
            // Insert merge records for songs_playlists
            for (var i = 0, playlist; playlist = playlists[i]; i++) {
                for (var j = 0, song; song = playlist.songs[j]; j++) {
                    db.run('INSERT INTO songs_playlists (playlist_id, song_id) VALUES ($p, $s)', {
                        // Must use +1 to account for 0 offset in JSON file
                        $p: playlist.id + 1,
                        $s: song + 1
                    }, function(err, data) {
                        if (err !== null) {
                            console.log(err);
                        }
                    });
                }
            }
            
            getCountMerge();
        });
    });
    
});


//////////////////////////////////////////////////
// GET COUNTS
//////////////////////////////////////////////////
function getCountSongs() {
    db.get('SELECT COUNT(*) FROM songs', function(err, count){
        console.log("  Songs: " + count['COUNT(*)']);
    });
};

function getCountPlaylists() {
    db.get('SELECT COUNT(*) FROM playlists', function(err, count){
        console.log("  Playlists: " + count['COUNT(*)']);
    });
};

function getCountMerge() {
    db.get('SELECT COUNT(*) FROM songs_playlists', function(err, count){
        console.log("  Merges: " + count['COUNT(*)']);
    });
};
