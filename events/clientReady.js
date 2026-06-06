const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const data = require("./../bot/data");

module.exports = async (client) => {
  console.log(`Logged in as ${client.user.username} (${client.user.id}).`);
  await client.user.setActivity(client.config.discord.activity);

  // Push the latest slash command definitions to Discord so they always
  // reflect what bot/data.js declares. This runs on every startup, so
  // editing data.js + restarting the bot is enough to refresh the
  // command list — no separate `bun run reload` step required.
  const rest = new REST({ version: "10" }).setToken(client.config.discord.token);
  try {
    console.log("Refreshing application [/] commands...");
    await rest.put(Routes.applicationCommands(client.user.id), { body: data.commands });
    console.log(`Successfully registered ${data.commands.length} application [/] command(s).`);
  } catch (err) {
    console.error("Failed to refresh application commands:", err);
  }
};
