module.exports = async (client, player) => {
    client.channels.cache.get(player.textId).send({embeds:[{description:`❌ | I was disconnected from the voice channel`,color:`${client.colour}`}]});
    try{
        const np = require('../bot/nowPlaying');
        await np.clear(client, player.guildId);
    }
    catch (err) {
        console.error('playerClosed: failed to clear now playing message', err);
        client.channels.cache.get(player.textId).send({embeds:[{description:`❌ | Something went wrong!`,color:`${client.colour}`}]});
    }
}