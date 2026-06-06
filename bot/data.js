const PRESET_LIST = [
  "8D", "bassboost", "bassboost_high", "bassboost_low", "chorus", "chorus2d",
  "compressor", "earrape", "expander", "fadein", "flanger", "gate",
  "karaoke", "lofi", "mcompand", "mono", "nightcore", "normalizer",
  "phaser", "softlimiter", "subboost", "treble", "tremolo", "vaporwave", "vibrato",
];

module.exports = {
  commands: [
    {
      name: "ping",
      description: "Shows The Ping of the bot",
    },
    {
      name: "play",
      description: "Plays a song",
      options: [
        {
          name: "query",
          type: 3,
          description: "The song you want to play",
          required: true,
        },
      ],
    },
    {
      name: "volume",
      description: "Sets music volume",
      options: [
        {
          name: "amount",
          type: 4,
          description: "The volume amount to set (0-100)",
          required: false,
        },
      ],
    },
    {
      name: "loop",
      description: "Sets loop mode",
      options: [
        {
          name: "mode",
          type: 4,
          description: "Loop type",
          required: true,
          choices: [
            { name: "Off", value: 0 },
            { name: "Track", value: 1 },
            { name: "Queue", value: 2 },
          ],
        },
      ],
    },
    {
      name: "filters",
      description: "Apply audio filters to the track",
      options: [
        {
          name: "effect",
          description:
            "Preset name to apply (e.g. bassboost, nightcore, karaoke, vaporwave). Pass 'off' to clear.",
          type: 3, // STRING
          required: false,
        },
      ],
    },
    {
      name: "shuffle",
      description: "Shuffles The Queue",
    },
    {
      name: "skip",
      description: "Skip to the current song",
    },
    {
      name: "queue",
      description: "See the queue",
    },
    {
      name: "pause",
      description: "Pause the current song",
    },
    {
      name: "uptime",
      description: "Shows The Bot Uptime",
    },
    {
      name: "resume",
      description: "Resume the current song",
    },
    {
      name: "stop",
      description: "Stop the player",
    },
  ],
  PRESET_LIST,
};
