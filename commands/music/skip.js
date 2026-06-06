const { GuildMember, MessageFlags } = require("discord.js");
const { useMainPlayer } = require("discord-player");

module.exports = {
  name: "skip",
  category: "Music",
  utilisation: "/skip",

  async execute(client, interaction) {
    // ACK the button immediately to avoid Discord's 3-second interaction timeout.
    // The interaction may come from a button press routed through
    // player.context.provide(), which can add latency. Defer right away
    // and do the rest after.
    try {
      if (typeof interaction.deferUpdate === "function") {
        await interaction.deferUpdate().catch(() => {});
      } else if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply().catch(() => {});
      }
    } catch (_) {
      // token may already be expired; fall through to safe error path
    }

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
    if (!queue || (!queue.isPlaying() && !queue.node.isPaused())) {
      return void interaction.followUp({ content: "❌ | No music is being played!", flags: MessageFlags.Ephemeral }).catch(() => {});
    }
    const current = queue.currentTrack;
    const tracks = queue.tracks?.data || [];
    if (!tracks.length) {
      return void interaction.followUp({ content: "❌ | There's nothing in the queue to skip.", flags: MessageFlags.Ephemeral }).catch(() => {});
    }
    try {
      queue.node.skip();
      return void interaction.channel.send({
        embeds: [{ description: `✅ | Skipped **${current?.title || "the current track"}**!`, color: client.colour }],
      }).catch(() => {});
    } catch (err) {
      console.error("skip error", err);
      return void interaction.followUp({ content: "❌ | Something went wrong!", flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  },
};
