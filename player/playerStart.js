const { MessageActionRow, MessageButton } = require('discord.js');
const pause = require('../bot/buttons').pause();
module.exports = (client, player, track) => {
    // Cancel any pending voice timeout when a new track starts
    if (client.voiceTimeouts && client.voiceTimeouts.has(player.guildId)) {
        clearTimeout(client.voiceTimeouts.get(player.guildId));
        client.voiceTimeouts.delete(player.guildId);
    }

    const row = pause;
    client.channels.cache.get(player.textId)?.send({embeds:[{title:`🎶 | Now Playing`,description:`[${track.title}](${track.realUri}) in **${client.channels.cache.get(player.voiceId).name}**!`,color:`${client.colour}`,thumbnail:{url:track.thumbnail}}],components: [row]}).then(mes => {
        client.config.discord.ne.push(mes);
    })
}