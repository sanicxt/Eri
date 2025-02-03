const skip = require("../commands/music/skip");
const stop = require("../commands/music/stop");
const pp = require('../bot/buttons');
const { GuildMember } = require('discord.js');

// Constants for button IDs
const BUTTON_IDS = {
    PAUSE_RESUME: 'pause/resumebtn',
    SKIP: 'skipbtn',
    STOP: 'stopbtn',
    VOL_DOWN: 'voldownbtn',
    VOL_UP: 'volupbtn'
};

// Helper function to check voice permissions
const checkVoicePermissions = (interaction) => {
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
        throw new Error("You are not in a voice channel!");
    }

    if (interaction.guild.me?.voice?.channelId && 
        interaction.member?.voice?.channelId !== interaction.guild.me?.voice?.channelId) {
        throw new Error("You are not in my voice channel!");
    }
};

// Helper function to check if music is playing
const checkMusicPlaying = (query) => {
    if (!query || !query.playing) {
        throw new Error("❌ | No music is being played!");
    }
};

// Helper function to handle volume changes
const handleVolumeChange = (query, delta) => {
    //if vol is less than 0 or greater than 100, set it to 0 or 100 respectively
    const newVolume = Math.max(0, Math.min(100, query.volume + delta));
    query.setVolume(newVolume);
};

module.exports = async (client, interaction) => {
    try {
        // Handle non-button and non-command interactions
        if (!interaction.isButton() && !interaction.isCommand()) return;
        
        const query = client.player.getPlayer(interaction.guildId);

        // Handle button interactions
        if (interaction.isButton()) {
            switch (interaction.customId) {
                case BUTTON_IDS.PAUSE_RESUME:
                    await handlePauseResume(interaction, query);
                    break;
                case BUTTON_IDS.SKIP:
                    await skip.execute(client, interaction);
                    break;
                case BUTTON_IDS.STOP:
                    await stop.execute(client, interaction);
                    break;
                case BUTTON_IDS.VOL_DOWN:
                    await handleVolumeButton(interaction, query, -10);
                    break;
                case BUTTON_IDS.VOL_UP:
                    await handleVolumeButton(interaction, query, 10);
                    break;
            }
            return;
        }

        // Handle commands
        if (!interaction.guildId) return;
        
        const command = client.commands.get(interaction.commandName);
        if (command) await command.execute(client, interaction);

    } catch (error) {
        console.error('Error in interaction:', error);
        const reply = { 
            content: error.message || "An error occurred!", 
            ephemeral: true 
        };
        
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
};

// Helper functions for handling specific button actions
async function handlePauseResume(interaction, query) {
    checkVoicePermissions(interaction);
    checkMusicPlaying(query);

    const isPaused = query.paused;
    query.pause(!isPaused);
    
    await interaction.update({
        components: [isPaused ? pp.pause() : pp.resume()]
    });
}

async function handleVolumeButton(interaction, query, delta) {
    checkVoicePermissions(interaction);
    checkMusicPlaying(query);
    
    handleVolumeChange(query, delta);
    await interaction.update({ components: [pp.pause()] });
}