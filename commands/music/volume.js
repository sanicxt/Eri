const { GuildMember, MessageFlags } = require("discord.js");
module.exports = {
    name: 'volume',
    category: 'Music',
    utilisation: '/volume',

   async execute(client, interaction) {
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
        return void interaction.reply({ content: "You are not in a voice channel!", flags: MessageFlags.Ephemeral });
    }

    if (interaction.guild.me?.voice?.channelId && interaction.member?.voice?.channelId !== interaction.guild.me?.voice?.channelId) {
        return void interaction.reply({ content: "You are not in my voice channel!", flags: MessageFlags.Ephemeral });
    }
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const Player = client.player.getPlayer(interaction.guildId);
            if (!Player || !Player.playing) return void interaction.followUp({ content: "❌ | No music is being played!" });
            const vol = interaction.options.get("amount");
            if (!vol) return void interaction.followUp({ content: `🎧 | Current volume is **${Player.volume * 100}%**!` });
            if ((vol.value) < 0 || (vol.value) > 100) return void interaction.followUp({ content: "❌ | Volume range must be 0-100" });
            const success = Player.setVolume(vol.value);
            return void interaction.followUp({
                content: success ? `✅ | Volume set to **${vol.value}%**!` : "❌ | Something went wrong!"
            });
        }
    }