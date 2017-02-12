module.exports = function(sequelize, DataType) {
    var Song = sequelize.define('Song', {
        album: {
            type: DataType.STRING,
            field: 'album'
        },
        title: {
            type: DataType.STRING,
            field: 'title'
        },
        artist: {
            type: DataType.STRING,
            field: 'artist'
        },
        duration: {
            type: DataType.INTEGER,
            field: 'duration'
        }
    }, {
        classMethods: {
            associate: function(models) {
                Song.belongsToMany(models.Playlist, {
                    through: {
                        model: models.Songs_Playlists,
                        unique: false
                    },
                    foreignKey: 'song_id',
                    constraints: false
                });
            }
        }
    });

    return Song;
};
