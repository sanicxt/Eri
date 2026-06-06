const { GuildMember, MessageFlags } = require("discord.js");
const { useMainPlayer } = require("discord-player");

// 25 essential audio filter presets (Discord caps slash command choices at 25).
// These cover the most useful effects for music playback. To see the full
// 35-preset list, run `node -e "console.log(Object.keys(require('discord-player').AudioFilters.filters).join('\n'))"`.
const PRESETS = [
  "8D",
  "bassboost",
  "bassboost_high",
  "bassboost_low",
  "chorus",
  "chorus2d",
  "compressor",
  "earrape",
  "expander",
  "fadein",
  "flanger",
  "gate",
  "karaoke",
  "lofi",
  "mcompand",
  "mono",
  "nightcore",
  "normalizer",
  "phaser",
  "softlimiter",
  "subboost",
  "tremolo",
  "vaporwave",
  "vibrato",
  "treble",
];

module.exports = {
  name: "filters",
  category: "Music",
  utilisation: "/filters [preset|off]",
  PRESETS,

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

    const effect = interaction.options.getString("effect");

    // No argument: show active filters + available presets
    if (effect == null) {
      const active = queue.filters.ffmpeg.getFiltersEnabled();
      return void interaction.followUp({
        embeds: [
          {
            title: "🎚 Filters",
            fields: [
              {
                name: "Active",
                value: active.length ? active.map((f) => `\`${f}\``).join(", ") : "None",
              },
              {
                name: "Available presets",
                value: `\`${PRESETS.join("`, `")}\``,
              },
              {
                name: "Usage",
                value: "`/filters bassboost` to apply, `/filters off` to clear",
              },
            ],
            color: client.colour,
          },
        ],
      });
    }

    // "off" / "clear" → clear all filters
    if (/^(off|clear|reset|none)$/i.test(effect)) {
      const active = queue.filters.ffmpeg.getFiltersEnabled();
      for (const f of active) queue.filters.ffmpeg.toggle([f]);
      return void interaction.followUp({ content: `🎵 | Cleared ${active.length} active filter(s).` });
    }

    const preset = effect.toLowerCase().trim();
    if (!PRESETS.includes(preset)) {
      return void interaction.followUp({
        content: `❌ | Unknown preset \`${effect}\`. Use \`/filters\` without args to see the list.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const alreadyOn = queue.filters.ffmpeg.isEnabled(preset);
      queue.filters.ffmpeg.toggle([preset]);
      return void interaction.followUp({
        content: alreadyOn
          ? `🎵 | Removed filter **${preset}**`
          : `🎵 | Applied filter **${preset}**`,
      });
    } catch (err) {
      console.error("filters error", err);
      return void interaction.followUp({ content: "❌ | Could not toggle filter.", flags: MessageFlags.Ephemeral });
    }
  },
};
