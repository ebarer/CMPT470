module.exports = function(sequelize, DataType) {    
    var Playlist = sequelize.define('Playlist', {
        name: {
            type: DataType.STRING,
            field: 'name'
        }
    }, {
        classMethods: {
            associate: function(models) {
                Playlist.belongsToMany(models.Song, {
                    through: {
                        model: models.Songs_Playlists,
                        unique: false
                    },
                    foreignKey: 'playlist_id',
                    constraints: false
                });
            }
        }
    });

    return Playlist;
};