import { Client, GatewayIntentBits } from 'discord.js'
import { schedule } from 'node-cron'

const discordClient = new Client({
    intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds],
})

discordClient.login(process.env.BOT_TOKEN)

export default discordClient
