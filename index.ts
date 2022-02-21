import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed, Intents } from "discord.js";

import Client from "./base/Client";
import configSchema from "./schemas/configSchema";
import mongo from "./utils/mongo";

const bot = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
  partials: ["MESSAGE", "USER"],
});

const commands = [
  new SlashCommandBuilder()
    .setName("snipe")
    .setDescription("Snipe the last deleted message"),
  new SlashCommandBuilder()
    .setName("enable-snipe")
    .setDescription("Enable the snipe command"),
  new SlashCommandBuilder()
    .setName("disable-snipe")
    .setDescription("Disable the snipe command"),
].map((cmd) => cmd.toJSON());

bot.registerCommands(commands);

let snipes = {};

bot.on("messageDelete", async (message) => {
  if (!message) return;

  // @ts-ignore
  snipes[message.channelId] = {
    author: message.author,
    text: message.content,
  };
});

bot.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  // These are better done with subcommands.
  if (interaction.commandName == "enable-snipe") {
    await mongo().then(async (mongo) => {
      try {
        await configSchema.findOneAndUpdate(
          { _id: interaction.guildId },
          {
            _id: interaction.guildId,
            snipe: true,
          },
          { upsert: true }
        );
        interaction.reply({
          content: "Enabled `/snipe`!",
          ephemeral: true,
        });
      } catch (e) {
        console.log(e);
      } finally {
        mongo.connection.close();
      }
    });
  }

  if (interaction.commandName == "disable-snipe") {
    await mongo().then(async (mongo) => {
      try {
        await configSchema.findOneAndUpdate(
          { _id: interaction.guildId },
          {
            _id: interaction.guildId,
            snipe: false,
          },
          { upsert: true }
        );
        interaction.reply({
          content: "Disabled `/snipe`!",
          ephemeral: true,
        });
      } catch (e) {
        console.log(e);
      } finally {
        mongo.connection.close();
      }
    });
  }

  if (interaction.commandName == "snipe") {
    const valueCache: any = {};

    let configData: any = valueCache[interaction.guildId!];
    if (!configData) {
      await mongo().then(async (mongo) => {
        try {
          const res = await configSchema.findOne({
            _id: interaction.guildId,
          });

          if (!res) return;

          // @ts-ignore
          valueCache[interaction.guildId] = configData = [res.id, res.snipe];
        } finally {
          mongo.connection.close();
        }
      });
    }

    if (configData == null || configData[1] == null || configData[1] == false)
      return interaction.reply({
        content: "`/snipe` is not enabled.",
        ephemeral: true,
      });

    // @ts-ignore
    const snipe = snipes[interaction.channelId];
    if (!snipe)
      return interaction.reply({
        content: "There's nothing to snipe.",
        ephemeral: true,
      });
    const embed = new MessageEmbed()
      .setAuthor({
        name: snipe.author.tag,
        iconURL: snipe.author.avatarURL(),
      })
      .setDescription(`${snipe.text}`);

    return interaction.reply({ embeds: [embed] });
  }
});

bot.login(`${process.env.DISCORD_TOKEN}`);
