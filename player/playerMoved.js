module.exports = (client, player, state, channels) => {
    switch (state) {
        case "UNKNOWN":
            // No-op
            break;
        case "JOINED":
            // Handled by playerStart
            break;
        case "LEFT":
            // Bot truly left the voice channel - do full cleanup
            client.channels.cache.get(player.textId)?.send({
                embeds: [{
                    description: `❌ | I was disconnected from the voice channel`,
                    color: `${client.colour}`
                }]
            });
            try {
                const np = require('../bot/nowPlaying');
                np.clear(client, player.guildId);
            } catch (err) {
                console.error('playerMoved LEFT: failed to clear now playing message', err);
            }
            break;
        case "MOVED":
            // Ensure player is updated in the map so interactions can find it
            // (Kazagumo might remove it on 'closed' before we can act, so we set it back)
            if (client.player && client.player.players) {
                if (channels.newChannelId) player.voiceId = channels.newChannelId; // Update internal voiceId
                client.player.players.set(player.guildId, player);
            }

            const oldChannelName = client.channels.cache.get(channels.oldChannelId)?.name || 'Unknown';
            const newChannelName = client.channels.cache.get(channels.newChannelId)?.name || 'Unknown';

            client.channels.cache.get(player.textId)?.send({
                embeds: [{
                    description: `Moved to **${oldChannelName}** -> **${newChannelName}**`,
                    color: `${client.colour}`
                }]
            });
            break;
    }
}