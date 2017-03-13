module.exports = function(sequelize, DataType) {    
    var Users_Playlists = sequelize.define('Users_Playlists', {
        id: {
            type: DataType.INTEGER,
            primaryKey: true,
            autoIncrement: true
        }
    });
    
    return Users_Playlists;
};