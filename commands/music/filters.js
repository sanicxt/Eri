const { GuildMember, MessageFlags } = require("discord.js");
module.exports = {
    name: 'filters',
    category: 'Music',
    utilisation: '/filters',

   async execute(client, interaction) {
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
        return void interaction.reply({ content: "You are not in a voice channel!", flags: MessageFlags.Ephemeral });
    }

    if (interaction.guild.me?.voice?.channelId && interaction.member?.voice?.channelId !== interaction.guild.me?.voice?.channelId) {
        return void interaction.reply({ content: "You are not in my voice channel!", flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply();
    const player = client.player.getPlayer(interaction.guildId);
    const choices = [
        "clear",
        "eightD",
        "soft",
        "speed",
        "karaoke",
        "nightcore",
        "pop",
        "vaporwave",
        "bass",
        "party",
        "earrape",
        "equalizer",
        "electronic",
        "radio",
        "tremolo",
        "treblebass",
        "vibrato",
        "china",
        "chimpunk",
        "darthvader",
        "daycore",
        "doubletime",
        "pitch",
        "rate",
        "slow"
    ];
    
    if (!player || !player.playing) return void interaction.followUp({ content: "❌ | No music is being played!", flags: MessageFlags.Ephemeral });
    const filter = interaction.options.get("effect") || null;
    const success = !filter ? await player.shoukaku.setFilters({}) : await player.filter(choices[filter.value]);
    return void interaction.followUp({ content: `🎵 |  ${!success ? `Applied ${choices[filter.value]}` : "Removed every"} filter to the current song!` });
    }
}