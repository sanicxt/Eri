module.exports = async (client, player) => {
    try {
        client.channels.cache.get(player.textId).send({embeds:[{description:`✅ | No More Songs to Play! Leaving in 30 minutes if no new songs are added.`,color:`${client.colour}`}]});
        
        let x = client.config.discord.ne.find(e => e.guildId == player.guildId);
        if (x) { 
            x.delete();
            let y = client.config.discord.ne.indexOf(x);
            client.config.discord.ne.splice(y, 1);
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
                const guildPlayer = client.manager.players.get(player.guildId);
                if (guildPlayer) {
                    guildPlayer.destroy();
                    client.channels.cache.get(player.textId)?.send({
                        embeds: [{
                            description: `👋 | Left voice channel due to inactivity (30 minutes).`,
                            color: client.colour
                        }]
                    });
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