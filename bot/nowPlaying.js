// In-memory manager for tracking now-playing messages per guild (fast, non-persistent)
// Use this for speed; note: this does NOT persist across process restarts or across multiple Node processes.
module.exports = {
    init(client) {
        if (!client.nowPlaying) client.nowPlaying = new Map();
    },

    async set(client, guildId, message) {
        this.init(client);
        const prev = client.nowPlaying.get(guildId);
        // Delete previous message if present
        if (prev) {
            try {
                const ch = await client.channels.fetch(prev.channelId).catch(() => null);
                if (ch) await ch.messages.delete(prev.messageId).catch(() => null);
            } catch (err) {
                console.error('nowPlaying.set: failed to delete previous message', err);
            }
        }

        // Store new entry in memory
        client.nowPlaying.set(guildId, { channelId: message.channel.id, messageId: message.id });
    },

    async clear(client, guildId) {
        this.init(client);
        const prev = client.nowPlaying.get(guildId);
        if (!prev) return false;
        try {
            const ch = await client.channels.fetch(prev.channelId).catch(() => null);
            if (ch) await ch.messages.delete(prev.messageId).catch(() => null);
        } catch (err) {
            console.error('nowPlaying.clear: failed to delete message', err);
        }
        client.nowPlaying.delete(guildId);
        return true;
    },

    get(client, guildId) {
        this.init(client);
        return client.nowPlaying.get(guildId) || null;
    }
};