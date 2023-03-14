import fs from "node:fs"
import path from "node:path"
import dotenv from "dotenv"
import { data, execute } from "./commands/ping.js"

import {
  Client,
  GatewayIntentBits,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  Events,
  Collection,
  Routes,
  REST,
} from "discord.js"

dotenv.config()

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
})

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})
const commands = []
const commandsPath = path.join("commands")
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"))

for (const file of commandFiles) {
  const command = `./commands/${file}`
  commands.push(JSON.stringify(command.data))
}
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN)
;(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    )

    // The put method is used to fully refresh all commands in all the guild
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      {
        body: commands,
      }
    )

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    )
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error)
  }
})()
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file)
  const command = await import(filePath)
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ("data" in command && "execute" in command) {
    client.commands.set(data.name, { data, execute })
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    )
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  const command = interaction.client.commands.get(interaction.commandName)

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`)
    return
  }

  try {
    await command.execute(interaction)
  } catch (error) {
    console.error(error)
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      })
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      })
    }
  }
})

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error)
})
client.login(process.env.DISCORD_TOKEN)
