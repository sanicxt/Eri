const {  ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
module.exports = {
     pause() {
        const r = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('voldownbtn')
                .setLabel('Volume Down')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('pause/resumebtn')
                .setLabel('Pause')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('skipbtn')
                .setLabel('Skip')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('stopbtn')
                .setLabel('Stop')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('volupbtn')
                .setLabel('Volume Up')
                .setStyle(ButtonStyle.Primary),
        );
        return r
    },
     resume() {
        const r = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('voldownbtn')
                .setLabel('Volume Down')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('pause/resumebtn')
                .setLabel('Resume')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('skipbtn')
                .setLabel('Skip')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('stopbtn')
                .setLabel('Stop')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('volupbtn')
                .setLabel('Volume Up')
                .setStyle(ButtonStyle.Primary),
        );
        return r
    },
    queue() {
        // Separate row with single 'Queue' button so we don't exceed 5 components per row
        const r = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('queuebtn')
                .setLabel('Queue')
                .setStyle(ButtonStyle.Secondary),
        );
        return r
    },
    queuePageButtons(userId, page, totalPages) {
        const prev = new ButtonBuilder()
            .setCustomId(`queue_prev:${userId}:${Math.max(0, page - 1)}`)
            .setLabel('◀ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0);

        const close = new ButtonBuilder()
            .setCustomId(`queue_close:${userId}`)
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger);

        const next = new ButtonBuilder()
            .setCustomId(`queue_next:${userId}:${Math.min(totalPages - 1, page + 1)}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1);

        const r = new ActionRowBuilder().addComponents(prev, close, next);
        return r;
    }
}