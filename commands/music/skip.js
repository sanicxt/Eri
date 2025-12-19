const { GuildMember, MessageFlags } = require("discord.js");
module.exports = {
    name: 'skip',
    category: 'Music',
    utilisation: '/skip',

   async execute(client, interaction) {
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
        return void interaction.reply({ content: "You are not in a voice channel!", flags: MessageFlags.Ephemeral });
    }

    if (interaction.guild.me?.voice?.channelId && interaction.member?.voice?.channelId !== interaction.guild.me?.voice?.channelId) {
        return void interaction.reply({ content: "You are not in my voice channel!", flags: MessageFlags.Ephemeral });
    }
            await interaction.deferUpdate();
            const Player = client.player.getPlayer(interaction.guildId);
            // Allow control when a player exists and is playing or paused
            if (!Player || (!Player.playing && !Player.paused)) return void interaction.followUp({ content: "❌ | No music is being played!", flags: MessageFlags.Ephemeral });
            const queued = (Player.queue?.length) || 0;
            if (queued === 0) return void interaction.followUp({ content: "❌ | There's nothing in the queue to skip.", flags: MessageFlags.Ephemeral });
            const currentTrack = Player.queue.current;
            const success = Player.skip();
            return void interaction.channel.send({embeds: success ? [{description:`✅ | Skipped **${currentTrack.title}**!`,color:`${client.colour}`}] : [{description:`❌ | Something went wrong!`,color:`${client.colour}`}]
        });
    }
}