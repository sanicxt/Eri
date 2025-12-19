const { GuildMember, MessageFlags } = require("discord.js");
module.exports = {
    name: 'play',
    category: 'Music',
    utilisation: '/play [name/URL]',

   async execute(client, interaction) {
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
        return void interaction.reply({ content: "You are not in a voice channel!", flags: MessageFlags.Ephemeral });
    }

    if (interaction.guild.me?.voice?.channelId && interaction.member?.voice?.channelId !== interaction.guild.me?.voice?.channelId) {
        return void interaction.reply({ content: "You are not in my voice channel!", flags: MessageFlags.Ephemeral });
    }
        await interaction.deferReply()
        const query = interaction.options.get("query").value;
        let player = client.player.getPlayer(interaction.guildId)

        if(!player) {
           try {
               player = await client.player.createPlayer({
                   guildId:  interaction.guildId,
                   textId:  interaction.channel.id,
                   voiceId:  interaction.member.voice.channel.id,
                   deaf: true,
                   volume: 40
               });
           } catch (err) {
               console.error('play: createPlayer failed', err);
               return void interaction.followUp({ content: '❌ | No available nodes to play music right now. Please try again later.', flags: MessageFlags.Ephemeral });
           }
        }

        let result = await client.player.search(query, {
            requestedBy: interaction.user
        }).catch(err => { console.error('play: search error', err); return null; });
        if (!result || !result.tracks || !result.tracks.length) return void interaction.followUp({ content: "❌ | No results were found!", flags: MessageFlags.Ephemeral });

        if (result.type === "PLAYLIST") { 
            for (let track of result.tracks) player.queue.add(track)
            interaction.followUp({embeds:[{description:`🎶 | Added [${result.playlistName}](${query}) in **${interaction.member.voice.channel.name}** (${result.tracks.length} songs)`,color:`${client.colour}`}]});
        }
        else {
            player.queue.add(result.tracks[0])
            player.queue.length ? interaction.followUp({embeds:[{description:`[${result.tracks[0].title}](${result.tracks[0].realUri}) Queued`,color:`${client.colour}`}]}) : interaction.deleteReply()
        };
        if (!player.playing && !player.paused){
            player.play()
        }
        if(client.timeout){
            clearTimeout(client.timeout)
            client.timeout = false
        }
    }
}