import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed, Intents } from "discord.js";

import Client from "./base/Client";
import configSchema from "./schemas/configSchema";
import tagSchema from "./schemas/tagSchema";
import mongo from "./utils/mongo";

const bot = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
  partials: ["MESSAGE", "USER"],
});

const commands = [
  new SlashCommandBuilder()
    .setName("snipe")
    .setDescription("Snipe the last deleted message")
    .addSubcommand((sb) =>
      sb.setName("get").setDescription("Get last deleted message")
    )
    .addSubcommand((sb) =>
      sb.setName("enable").setDescription("Enable /snipe.")
    )
    .addSubcommand((sb) =>
      sb.setName("disable").setDescription("Disable /snipe.")
    ),
  new SlashCommandBuilder()
    .setName("tag")
    .setDescription("Tag commands")
    .addSubcommand((sb) =>
      sb
        .setName("get")
        .setDescription("Get a tag")
        .addStringOption((string) =>
          string.setName("tag").setDescription("The tag name").setRequired(true)
        )
    )
    .addSubcommand((sb) =>
      sb
        .setName("create")
        .setDescription("Create a new tag")
        .addStringOption((name) =>
          name
            .setName("name")
            .setDescription("The name of the tag.")
            .setRequired(true)
        )
        .addStringOption((content) =>
          content
            .setName("content")
            .setDescription("The content of the tag.")
            .setRequired(true)
        )
    ),
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

  if (interaction.commandName == "snipe") {
    if (interaction.options.getSubcommand() == "enable") {
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
          return;
        }
      });
    }

    if (interaction.options.getSubcommand() == "disable") {
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
          return;
        }
      });
    }

    if (interaction.options.getSubcommand() == "get") {
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
  }

  if (interaction.commandName == "tag") {
    if (interaction.options.getSubcommand() == "get") {
      const name = interaction.options.getString("tag");

      await mongo().then(async (mongo) => {
        try {
          const res = await tagSchema.findOne({ _id: name });

          if (!res)
            return interaction.reply({
              content: "Couldn't find this tag.",
              ephemeral: true,
            });

          interaction.reply({
            // @ts-ignore
            content: res.tagContent,
          });
        } catch (e) {
          console.log(e);
        } finally {
          mongo.connection.close();
          return;
        }
      });
    }
  }
  if (interaction.options.getSubcommand() == "create") {
    const name = interaction.options.getString("name");
    const content = interaction.options.getString("content");

    await mongo().then(async (mongo) => {
      try {
        const alreadyExisting = await tagSchema.findOne({ _id: name });
        // @ts-ignore
        if (alreadyExisting)
          return interaction.reply({
            content: "That tag already exists.",
            ephemeral: true,
          });

        //@ts-ignore
        if (alreadyExisting == null)
          await tagSchema.findOneAndUpdate(
            { _id: name },
            { _id: name, tagContent: content },
            { upsert: true }
          );
        interaction.reply({ content: `Created tag "${name}"` });
      } catch (e) {
        console.error(e);
      } finally {
        mongo.connection.close();
        return;
      }
    });
  }
});

bot.login(`${process.env.DISCORD_TOKEN}`);
