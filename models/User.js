module.exports = function(sequelize, DataType) {
    var User = sequelize.define('User', {
        username: {
            type: DataType.STRING,
            field: 'username'
        },
        password: {
            type: DataType.STRING,
            field: 'password'
        }
    }, {
        classMethods: {
            associate: function(models) {
                User.belongsToMany(models.Playlist, {
                    through: {
                        model: models.Users_Playlists,
                        unique: false
                    },
                    foreignKey: 'user_id',
                    constraints: false
                });
            }
        }
    });

    return User;
};
