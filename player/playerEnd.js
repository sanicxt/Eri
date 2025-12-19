module.exports = async (client, player) => {
    try {
        // Prefer the file-backed nowPlaying store for deterministic cleanup
        try {
            const np = require('../bot/nowPlaying');
            const cleared = await np.clear(client, player.guildId);
            if (cleared) {
                // Only log when debugging to avoid noisy repeated messages
                if (process.env.DEBUG || client.config?.debug) console.debug(`playerEnd: cleared now-playing message for guild ${player.guildId}`);
            } else {
                // Quiet by default; optionally show debug info when DEBUG is enabled
                if (process.env.DEBUG || client.config?.debug) console.debug(`playerEnd: no now-playing entry to clear for guild ${player.guildId}`);
            }
        } catch (err) {
            console.error('playerEnd: failed to clear now playing message', err);
        }

    } catch (err) {
        console.error('Error in playerEnd:', err);
        client.channels.cache.get(player.textId)?.send({embeds:[{description:`❌ | Something went wrong!`,color:`${client.colour}`}]});
    }
};