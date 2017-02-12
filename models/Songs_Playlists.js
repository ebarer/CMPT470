module.exports = function(sequelize, DataType) {    
    var Songs_Playlists = sequelize.define('Songs_Playlists', {
        id: {
            type: DataType.INTEGER,
            primaryKey: true,
            autoIncrement: true
        }
    });
    
    return Songs_Playlists;
};