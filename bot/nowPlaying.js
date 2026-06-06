// Per-guild serialized now-playing message tracker.
// All mutating operations on a given guildId are chained through a per-guild
// promise queue so that "delete old + write new" and "read + delete" cannot
// interleave across playerStart / playerEnd / playerEmpty / playerDestroy.
const chains = new Map();

function withLock(guildId, fn) {
  const prev = chains.get(guildId) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  chains.set(guildId, next);
  next.finally(() => {
    if (chains.get(guildId) === next) chains.delete(guildId);
  });
  return next;
}

function ensure(client) {
  if (!client.nowPlaying) client.nowPlaying = new Map();
}

async function deletePrev(client, guildId) {
  const prev = client.nowPlaying.get(guildId);
  if (!prev) return;
  try {
    const ch = await client.channels.fetch(prev.channelId).catch(() => null);
    if (ch) await ch.messages.delete(prev.messageId).catch(() => null);
  } catch (err) {
    console.error("nowPlaying: failed to delete previous message", err);
  }
}

module.exports = {
  set(client, guildId, message) {
    return withLock(guildId, async () => {
      ensure(client);
      await deletePrev(client, guildId);
      client.nowPlaying.set(guildId, {
        channelId: message.channel.id,
        messageId: message.id,
      });
    });
  },

  clear(client, guildId) {
    return withLock(guildId, async () => {
      ensure(client);
      const prev = client.nowPlaying.get(guildId);
      if (!prev) return false;
      await deletePrev(client, guildId);
      client.nowPlaying.delete(guildId);
      return true;
    });
  },

  get(client, guildId) {
    ensure(client);
    return client.nowPlaying.get(guildId) || null;
  },
};
