const { GuildMember, MessageFlags } = require("discord.js");
const { useMainPlayer } = require("discord-player");

module.exports = {
  name: "volume",
  category: "Music",
  utilisation: "/volume",

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

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const player = useMainPlayer();
    const queue = player.nodes.get(interaction.guildId);
    if (!queue || !queue.isPlaying()) {
      return void interaction.followUp({ content: "❌ | No music is being played!", flags: MessageFlags.Ephemeral });
    }

    const amount = interaction.options.getInteger("amount");
    const currentVol = queue.node.volume;
    if (amount == null) {
      return void interaction.followUp({ content: `🎧 | Current volume is **${currentVol}%**!` });
    }
    if (amount < 0 || amount > 100) {
      return void interaction.followUp({ content: "❌ | Volume range must be 0-100", flags: MessageFlags.Ephemeral });
    }
    try {
      const success = queue.node.setVolume(amount);
      if (success) return void interaction.followUp({ content: `✅ | Volume set to **${amount}%**!` });
      return void interaction.followUp({ content: "❌ | Something went wrong!", flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error("volume error", err);
      return void interaction.followUp({ content: "❌ | Something went wrong!", flags: MessageFlags.Ephemeral });
    }
  },
};
