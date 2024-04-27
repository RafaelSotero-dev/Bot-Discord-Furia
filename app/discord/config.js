import { Client, GatewayIntentBits } from 'discord.js'
import { config } from 'dotenv'
config()
const discordClient = new Client({
    intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds],
})

discordClient.login(process.env.BOT_TOKEN)

export default discordClient
