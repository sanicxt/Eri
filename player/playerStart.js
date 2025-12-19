const buttons = require('../bot/buttons');
module.exports = (client, player, track) => {
    // Cancel any pending voice timeout when a new track starts
    if (client.voiceTimeouts && client.voiceTimeouts.has(player.guildId)) {
        clearTimeout(client.voiceTimeouts.get(player.guildId));
        client.voiceTimeouts.delete(player.guildId);
    }

    const row = buttons.pause();
    const queueRow = buttons.queue();
    client.channels.cache.get(player.textId)?.send({
        embeds:[{
            title:`🎶 | Now Playing`,
            description:`[${track.title}](${track.realUri}) in **${client.channels.cache.get(player.voiceId).name}**!`,
            color:`${client.colour}`,
            thumbnail:{url:track.thumbnail}
        }],
        components: [row, queueRow]
    }).then(async mes => {
        // Use nowPlaying manager to atomically track and clean up old messages
        const np = require('../bot/nowPlaying');
        try {
            await np.set(client, player.guildId, mes);
        } catch (err) {
            console.error('playerStart: failed to set now playing message', err);
        }
    })
}