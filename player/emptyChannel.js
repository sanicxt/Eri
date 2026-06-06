module.exports = async (client, queue) => {
  const meta = queue.metadata || {};
  const channel = meta.channel;
  if (!channel) return;
  try {
    await channel
      .send({
        embeds: [
          {
            description: "👋 | Left voice channel (empty for 5 minutes).",
            color: client.colour,
          },
        ],
      })
      .catch(() => {});
  } catch (err) {
    console.error("emptyChannel: send failed", err);
  }
};
