const { GuildMember, MessageFlags } = require("discord.js");
const { useMainPlayer, QueueRepeatMode } = require("discord-player");

module.exports = {
  name: "loop",
  category: "Music",
  utilisation: "/loop [loopType]",

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
    if (!queue || !queue.isPlaying()) {
      return void interaction.followUp({ content: "❌ | No music is being played!", flags: MessageFlags.Ephemeral });
    }

    const modeIndex = interaction.options.getInteger("mode");
    const modes = [QueueRepeatMode.OFF, QueueRepeatMode.TRACK, QueueRepeatMode.QUEUE];
    const labels = ["Off", "Track", "Queue"];
    const mode = modes[modeIndex];
    try {
      queue.setRepeatMode(mode);
      return void interaction.followUp({ content: `🔁 | Loop mode: **${labels[modeIndex]}**!` });
    } catch (err) {
      console.error("loop error", err);
      return void interaction.followUp({ content: "❌ | Could not update loop mode!", flags: MessageFlags.Ephemeral });
    }
  },
};
