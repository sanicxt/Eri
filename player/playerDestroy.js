module.exports = async (client, player) => {
    try {
        client.channels.cache.get(player.textId)?.send({embeds:[{description:`✅ | Playback Stopped!`,color:`${client.colour}`}]});
        
        let x = client.config.discord.ne.find(e => e.guildId == player.guildId);
        if (x) { 
            x.delete();
            let y = client.config.discord.ne.indexOf(x);
            client.config.discord.ne.splice(y, 1);
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