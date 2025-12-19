module.exports = async (client, player) => {
    try {
        client.channels.cache.get(player.textId).send({embeds:[{description:`✅ | No More Songs to Play! Leaving in 30 minutes if no new songs are added.`,color:`${client.colour}`}]});
        
        // Clear tracked now-playing message for this guild (if any)
        try {
            const np = require('../bot/nowPlaying');
            await np.clear(client, player.guildId);
        } catch (err) {
            console.error('playerEmpty: failed to clear now playing message', err);
        }

        // Initialize timeout storage if it doesn't exist
        if (!client.voiceTimeouts) {
            client.voiceTimeouts = new Map();
        }

        // Clear any existing timeout for this guild
        if (client.voiceTimeouts.has(player.guildId)) {
            clearTimeout(client.voiceTimeouts.get(player.guildId));
        }

        // Set 30-minute timeout to leave voice channel
        const timeout = setTimeout(() => {
            try {
                // Use Kazagumo player API when available, otherwise fall back to the provided player
                const guildPlayer = client.player?.getPlayer(player.guildId) || player;
                if (guildPlayer) {
                    // Some implementations return a promise, some return boolean; handle both
                    const result = guildPlayer.destroy && guildPlayer.destroy();
                    if (result instanceof Promise) result.catch(err => console.error('Error destroying guild player:', err));

                    client.channels.cache.get(player.textId)?.send({
                        embeds: [{
                            description: `👋 | Left voice channel due to inactivity (30 minutes).`,
                            color: client.colour
                        }]
                    });
                } else {
                    console.warn(`playerEmpty: no player found for guild ${player.guildId}`);
                }
            } catch (err) {
                console.error('Error leaving voice channel:', err);
            } finally {
                client.voiceTimeouts.delete(player.guildId);
            }
        }, 30 * 60 * 1000); // 30 minutes in milliseconds

        client.voiceTimeouts.set(player.guildId, timeout);

    } catch (err) {
        console.error('Error in playerEmpty:', err);
        client.channels.cache.get(player.textId)?.send({embeds:[{description:`❌ | Something went wrong!`,color:`${client.colour}`}]});
    }
}