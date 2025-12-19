module.exports = async (client, player, stuck) => {
    console.log(`Error emitted from the queue: ${stuck}`);
    try {
        // Notify the text channel (await so we can be sure it's sent or fail)
        await client.channels.cache.get(player.textId)?.send({embeds:[{description:`❌ | I Crashed HELP!!!!!`,color:`${client.colour}`}]});

        try {
            const np = require('../bot/nowPlaying');
            await np.clear(client, player.guildId);
        } catch (err) {
            console.error('playerStuck: failed to clear now playing message', err);
        }
    } catch (err) {
        console.error('playerStuck: unexpected error', err);
        // Best-effort notify
        client.channels.cache.get(player.textId)?.send({embeds:[{description:`❌ | I Crashed HELP!!!!!`,color:`${client.colour}`}]});
    }
}