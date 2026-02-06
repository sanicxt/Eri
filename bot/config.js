require('dotenv').config()
module.exports = {
    discord: {
        activity:"Music Discovery",
        token: process.env.TOKEN,
        cookie: process.env.COOKIE,
        spotify_client_id: process.env.SPOTIFY_CLIENT_ID,
        spotify_client_secret: process.env.SPOTIFY_CLIENT_SECRET,
        admin_user_id: process.env.ADMIN_USER_ID
    },
};
