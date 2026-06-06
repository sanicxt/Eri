const { MessageFlags } = require("discord.js");

module.exports = {
  name: "uptime",
  category: "info",
  utilisation: "/uptime",

  async execute(client, interaction) {
    const ms = client.uptime || 0;
    const s = Math.floor(ms / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    const parts = [];
    if (days) parts.push(`${days} days`);
    if (hours) parts.push(`${hours} hrs`);
    if (mins) parts.push(`${mins} mins`);
    parts.push(`${secs} secs`);
    return void interaction.reply({
      embeds: [
        {
          color: client.colour,
          description: `__Uptime:__\n\n${parts.join(", ")}`,
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};
