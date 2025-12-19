module.exports = async (client, player) => {
    try {
        client.channels.cache.get(player.textId)?.send({embeds:[{description:`✅ | Playback Stopped!`,color:`${client.colour}`}]});
        
        // Clear tracked now-playing message for this guild (if any)
        try {
            const np = require('../bot/nowPlaying');
            await np.clear(client, player.guildId);
        } catch (err) {
            console.error('playerDestroy: failed to clear now playing message', err);
        }

        // Clear any pending voice timeout for this guild
        if (client.voiceTimeouts && client.voiceTimeouts.has(player.guildId)) {
            clearTimeout(client.voiceTimeouts.get(player.guildId));
            client.voiceTimeouts.delete(player.guildId);
        }

    } catch (err) {
        console.error('Error in playerDestroy:', err);
        client.channels.cache.get(player.textId)?.send({embeds:[{description:`❌ | Something went wrong!`,color:`${client.colour}`}]});
    }
}