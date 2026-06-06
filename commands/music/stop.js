const { GuildMember, MessageFlags } = require("discord.js");
const { useMainPlayer } = require("discord-player");

module.exports = {
  name: "stop",
  category: "Music",
  utilisation: "/stop",

  async execute(client, interaction) {
    // ACK the button immediately to avoid Discord's 3-second interaction timeout.
    try {
      if (typeof interaction.deferUpdate === "function") {
        await interaction.deferUpdate().catch(() => {});
      } else if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply().catch(() => {});
      }
    } catch (_) {}

    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
      return void interaction.followUp({ content: "You are not in a voice channel!", flags: MessageFlags.Ephemeral }).catch(() => {});
    }
    if (
      interaction.guild.members.me?.voice?.channelId &&
      interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId
    ) {
      return void interaction.followUp({ content: "You are not in my voice channel!", flags: MessageFlags.Ephemeral }).catch(() => {});
    }

    const player = useMainPlayer();
    const queue = player.nodes.get(interaction.guildId);
    if (!queue || !queue.isPlaying()) {
      return void interaction.followUp({ content: "❌ | No music is being played!", flags: MessageFlags.Ephemeral }).catch(() => {});
    }
    try {
      queue.delete();
      // The interaction is already deferred/updated; no further reply needed.
      // queueDelete event handler will post the "Playback Stopped!" message.
    } catch (err) {
      console.error("stop error", err);
      return void interaction.followUp({ content: "❌ | Something went wrong!", flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  },
};
