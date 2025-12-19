module.exports = {
    name: 'ping',
    category: 'info',
    utilisation: '/ping',

    async execute(client, interaction) {
        const { MessageFlags } = require('discord.js');
        interaction.reply({ content: 'Pong! '+client.ws.ping+" ms", flags: MessageFlags.Ephemeral })
    }
}