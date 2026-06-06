const { GuildMember, MessageFlags } = require("discord.js");
const { useMainPlayer } = require("discord-player");

module.exports = {
  name: "play",
  category: "Music",
  utilisation: "/play [name/URL]",

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

    const query = interaction.options.getString("query");
    if (!query) return void interaction.followUp({ content: "❌ | Please provide a query.", flags: MessageFlags.Ephemeral });

    const player = useMainPlayer();
    const voiceChannel = interaction.member.voice.channel;

    try {
      const result = await player.play(voiceChannel, query, {
        nodeOptions: {
          metadata: { client, channel: interaction.channel, guildId: interaction.guildId },
          volume: 40,
          selfDeaf: true,
          // Use discord-player's internal 30-minute inactivity cooldowns. The
          // defaults are 0ms which causes the bot to disconnect immediately
          // when the voice channel becomes briefly empty.
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 30 * 60 * 1000, // 30 minutes
          leaveOnEnd: true,
          leaveOnEndCooldown: 30 * 60 * 1000,   // 30 minutes
          leaveOnStop: false,                     // /stop should be immediate
        },
        requestedBy: interaction.user,
      });

      if (result?.playlist) {
        return void interaction.followUp({
          embeds: [
            {
              description: `🎶 | Added [${result.playlist.title}](${query}) in **${voiceChannel.name}** (${result.tracks.length} songs)`,
              color: client.colour,
            },
          ],
        });
      }

      const track = result?.track;
      if (!track) return void interaction.followUp({ content: "❌ | No results were found!", flags: MessageFlags.Ephemeral });

      return void interaction.followUp({
        embeds: [
          {
            description: `[${track.title}](${track.url}) Queued`,
            color: client.colour,
          },
        ],
      });
    } catch (err) {
      console.error("play: error", err);
      const msg = err?.message || String(err);
      const isSignInError = /must be signed in|sign.in.required|accounts\.google\.com|No results found/i.test(msg);
      const hint = isSignInError
        ? "\n\n💡 YouTube cookies are missing or expired. Re-export `youtube.cookies.txt` from a signed-in YouTube session and restart the bot."
        : "";
      return void interaction.followUp({
        content: `❌ | Something went wrong: ${msg.slice(0, 500)}${hint}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
