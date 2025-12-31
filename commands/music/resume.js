const { GuildMember, MessageFlags } = require("discord.js");
module.exports = {
    name: 'resume',
    category: 'Music',
    utilisation: '/resume',

    async execute(client, interaction) {
        if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
            return void interaction.reply({ content: "You are not in a voice channel!", flags: MessageFlags.Ephemeral });
        }

        if (interaction.guild.me?.voice?.channelId && interaction.member?.voice?.channelId !== interaction.guild.me?.voice?.channelId) {
            return void interaction.reply({ content: "You are not in my voice channel!", flags: MessageFlags.Ephemeral });
        }
        await interaction.deferReply();
        const player = client.player.getPlayer(interaction.guildId)
        if (!player || (!player.paused && !player.queue?.current)) return void interaction.followUp({ content: "❌ | No music is being played!", flags: MessageFlags.Ephemeral });
        const success = player.pause(false);
        if (success) return void interaction.followUp({ content: "▶ | Resumed!" });
        return void interaction.followUp({ content: "❌ | Something went wrong!", flags: MessageFlags.Ephemeral });
    }
}