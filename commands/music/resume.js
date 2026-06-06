const { GuildMember, MessageFlags } = require("discord.js");
const { useMainPlayer } = require("discord-player");

module.exports = {
  name: "resume",
  category: "Music",
  utilisation: "/resume",

  async execute(client, interaction) {
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
      return void interaction.reply({ content: "You are not in a voice channel!", flags: MessageFlags.Ephemeral });
    }
    if (
      interaction.guild.members.me?.voice?.channelId &&
      interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId
    ) {
      return void interaction.reply({ content: "You are not in my voice channel!", flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();
    const player = useMainPlayer();
    const queue = player.nodes.get(interaction.guildId);
    if (!queue || !queue.node.isPaused()) {
      return void interaction.followUp({ content: "❌ | No music is being played!", flags: MessageFlags.Ephemeral });
    }
    try {
      const success = queue.node.setPaused(false);
      if (success) return void interaction.followUp({ content: "▶ | Resumed!" });
      return void interaction.followUp({ content: "❌ | Something went wrong!", flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error("resume error", err);
      return void interaction.followUp({ content: "❌ | Something went wrong!", flags: MessageFlags.Ephemeral });
    }
  },
};
