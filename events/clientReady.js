const data = require("./../bot/data")
module.exports = async (client) => {
    console.log(`Logged in as ${client.user.username}.`);
    await client.user.setActivity(client.config.discord.activity);
};
