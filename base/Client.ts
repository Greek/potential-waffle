require("dotenv").config();
import Discord from "discord.js";
import { Routes } from "discord-api-types/v9"; // version has to be specified :(
import { REST } from "@discordjs/rest";

export default class Client extends Discord.Client {
  // I am over-engineering this but let's have some fun!
  constructor(options: Discord.ClientOptions) {
    super(options);
  }

  registerCommands(cmds: Array<unknown>) {
    const commands = cmds;
    const rest = new REST({ version: "9" }).setToken(
      `${process.env.DISCORD_TOKEN}`
    );

    rest
      .put(
        Routes.applicationGuildCommands(
          `${process.env.DISCORD_CLIENTID}`,
          `${process.env.DISCORD_GUILDID}`
        ),
        { body: commands }
      )
      .then((r) => {
        console.log("Registered slash commands to guild");
      });
  }
}
