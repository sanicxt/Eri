const { GuildMember, MessageFlags } = require("discord.js");
module.exports = {
    name: 'shuffle',
    category: 'Music',
    utilisation: '/shuffle',

   async execute(client, interaction) {
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
      return void interaction.reply({ content: "You are not in a voice channel!", flags: MessageFlags.Ephemeral });
  }

  if (interaction.guild.me?.voice?.channelId && interaction.member?.voice?.channelId !== interaction.guild.me?.voice?.channelId) {
    return void interaction.reply({ content: "You are not in my voice channel!", flags: MessageFlags.Ephemeral });
} 
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const Player = client.player.getPlayer(interaction.guildId);
        if (!Player || !Player.playing) return void interaction.followUp({ content: "❌ | No music is being played!" });
        const success = Player.queue.shuffle();
        return void interaction.followUp({
            content: success ? `✅ | Shuffled The Player` : "❌ | Something went wrong!"
    });
  }
}