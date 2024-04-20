require('dotenv').config()
module.exports = {
    discord: {
        activity:"Music Discovery",
        token: process.env.TOKEN,
        cookie: process.env.COOKIE,
        spotifyclientId: process.env.SPOTIFY_CLIENT_ID,
        spotifyclientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        ne:[]
    },
};
