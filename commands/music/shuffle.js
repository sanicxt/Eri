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
    if (!Player || (!Player.playing && !Player.paused && !Player.queue?.current)) return void interaction.followUp({ content: "❌ | No music is being played!", flags: MessageFlags.Ephemeral });
    const success = Player.queue.shuffle();
    if (success) return void interaction.followUp({ content: `✅ | Shuffled The Player` });
    return void interaction.followUp({ content: "❌ | Something went wrong!", flags: MessageFlags.Ephemeral });
  }
}