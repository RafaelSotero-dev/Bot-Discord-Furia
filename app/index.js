import axios from 'axios'
import { load } from 'cheerio'
import { writeFile, readFile, rm } from 'fs/promises'
import { resolve, dirname } from 'path'
import { URL, fileURLToPath } from 'url'
import { slug } from './utils/slug.js'
import { converterParaHorarioBrasilia } from './utils/brasiliaDateConvert.js'
import { schedule } from 'node-cron'
import discordClient from './discord/config.js'

let lastSavedPageFileName

const team = 'FURIA_Esports'
const BASE_URL = 'https://liquipedia.net'
const furiaUrl = `https://liquipedia.net/counterstrike/${team}`
const path = new URL(furiaUrl).pathname

const __dirname = dirname(fileURLToPath(import.meta.url))
const FILE_PATH = resolve(__dirname, '../cached')

const todayDate = new Date().toLocaleDateString().toLocaleString('pt-BR', {
    timeZone: 'America/São Paulo',
})

const options = {
    Headers: {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36',
    },
}

const request = async (url) => {
    const { data } = await axios.get(url, {
        ...options,
    })

    return data
}

const readCachedFile = async (filePath) => {
    try {
        const result = await readFile(filePath, { encoding: 'utf8', mode: 'r' })

        if (!result) return null

        return result
    } catch (error) {}
}

const writeCachedFile = async (filePath, data) => {
    try {
        return await writeFile(filePath, data, { encoding: 'utf8' })
    } catch (error) {}
}

const createCachedPage = async (filePath, data) => {
    try {
        const cached = await readCachedFile(filePath)
        if (!cached) {
            return await writeCachedFile(filePath, data)
        }

        return cached
    } catch (error) {
        console.error(error)
    }
}

const getHtmlFromLiquipedia = async (url, filePath) => {
    try {
        const html = await request(url)

        await createCachedPage(filePath, html)
    } catch (error) {
        console.error(error)
    }
}

const getNextTornament = async (url, filePath) => {
    try {
        let content = await readCachedFile(filePath)

        if (!content) {
            content = await request(url)
            await writeCachedFile(filePath, content)
        }

        const $ = load(content)

        let upcomingMatchesLink = $(
            `#mw-content-text > div > div.fo-nttax-infobox-wrapper.infobox-cs2 > div.fo-nttax-infobox.panel > table > tbody > tr:nth-child(2) > td > span > div > div`
        )
            .children()
            .attr('href')

        if (!upcomingMatchesLink) {
            upcomingMatchesLink = $(
                '#mw-content-text > div > div.fo-nttax-infobox-wrapper.infobox-cs2 > div.fo-nttax-infobox.wiki-bordercolor-light.noincludereddit > table:nth-child(2) > tbody > tr:nth-child(1) > td > a'
            ).attr('href')
        }

        lastSavedPageFileName = `${slug(`${upcomingMatchesLink}`)}.html`
        return upcomingMatchesLink
    } catch (error) {
        console.error(error)
    }
}

const getDataOfNextMatch = async (url, filePath) => {
    try {
        let content = await readCachedFile(filePath)
        if (!content) {
            content = await request(url)
            await writeCachedFile(filePath, content)
        }

        const $ = load(content)
        const teamName = team.replace('_', ' ')

        const matchs = $(`[aria-label="${teamName}"]`)

        if (matchs.length) {
            const len = matchs.parent().length
            const lastMatch = matchs.parent()[len - 1]

            const lastChildren = lastMatch.children.length - 1

            let dataWithOutOffSet =
                lastMatch.children[lastChildren].children[2].children[0]
                    .children[0].children[0].children[0].data

            dataWithOutOffSet = String(dataWithOutOffSet).replace('-', '')

            const offSet = Number(
                String(
                    lastMatch.children[lastChildren].children[2].children[0]
                        .children[0].children[0].children[0].next.attribs[
                        'data-tz'
                    ]
                )
                    .replace('+', '')
                    .replace(':', '.')
            ).toFixed(0)

            const dateWithoutOffSet = new Date(dataWithOutOffSet)
            const newDate = dateWithoutOffSet.setUTCHours(
                dateWithoutOffSet.getUTCHours() - offSet
            )
            const dateBrasilia = converterParaHorarioBrasilia(newDate)

            const dateBrasiliaToLocate = dateBrasilia
                .toLocaleDateString()
                .toLocaleString('pt-BR', {
                    timeZone: 'America/São Paulo',
                })

            if (todayDate > dateBrasiliaToLocate) {
                return 'No match is available'
            }

            const teams = lastMatch.children.find((ele) => {
                if (
                    ele.attribs['aria-label'] !== teamName &&
                    ele.attribs['aria-label'] !== undefined
                ) {
                    return ele.attribs['aria-label']
                }
            })

            return {
                date: dateBrasilia.toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                }),
                teams: [team, teams.attribs['aria-label']],
            }
        }

        return 'No match is available'
    } catch (error) {
        console.error(error)
    }
}

const main = async () => {
    try {
        await getHtmlFromLiquipedia(
            furiaUrl,
            `${FILE_PATH}/${slug(`${path}`)}.html`
        )

        const nextTornamentLink = await getNextTornament(
            furiaUrl,
            `${FILE_PATH}/${slug(`${path}`)}.html`
        )

        const getDate = await getDataOfNextMatch(
            `${BASE_URL}${nextTornamentLink}`,
            `${FILE_PATH}/${lastSavedPageFileName}`
        )

        if (typeof getDate !== 'string') {
            const partMessage = String(getDate.date).split(',')
            const message = `${getDate.teams[0]} vs ${getDate.teams[1]}\n${partMessage[0]} as${partMessage[1]}\n`

            const channel = discordClient.channels.cache.get(
                '1233588684884807791'
            )

            return channel.send(message)
        }

        console.log(getDate)
        return channel.send(getDate)
    } catch (error) {}
}

discordClient.on('ready', async () => {
    console.log(`Logged in as ${discordClient.user.tag}!`)
    main()
    schedule('* * 1 * *', main, { timezone: 'America/Sao_Paulo' })
    schedule(
        '0 0 */36 * * *',
        () => {
            rm(`cached/${lastSavedPageFileName}`)
        },
        { timezone: 'America/Sao_Paulo' }
    )
})
