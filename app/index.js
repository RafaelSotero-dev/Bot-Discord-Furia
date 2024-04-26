import axios from 'axios'
import { load } from 'cheerio'
import { writeFile, readFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { URL, fileURLToPath } from 'url'
import { slug } from './utils/slug.js'
import { converterParaHorarioBrasilia } from './utils/brasiliaDateConvert.js'
import discordClient from './discord/config.js'

const BASE_URL = 'https://liquipedia.net'
const furiaUrl = 'https://liquipedia.net/counterstrike/FURIA_Esports'
const path = new URL(furiaUrl).pathname

const __dirname = dirname(fileURLToPath(import.meta.url))
const FILE_PATH = resolve(__dirname, '../cached')

const TodayDate = new Date().toLocaleDateString().toLocaleString('pt-BR', {
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
        const nextTornamentLink = $(
            '#mw-content-text > div > div.fo-nttax-infobox-wrapper.infobox-cs2 > div.fo-nttax-infobox.panel > table > tbody > tr:nth-child(2) > td > span > div > div'
        )
            .children()
            .attr('href')

        return nextTornamentLink
    } catch (error) {
        console.log(error)
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

        const matchs = $('[aria-label="FURIA Esports"]')
        const len = matchs.parent().length
        const lastMatch = matchs.parent()[len - 1]

        let dataWithOutOffSet =
            lastMatch.children[3].children[2].children[0].children[0]
                .children[0].children[0].data

        if (dataWithOutOffSet) {
            dataWithOutOffSet = String(dataWithOutOffSet).replace('-', '')

            const dateWithoutOffSet = new Date(dataWithOutOffSet)
            const newDate = dateWithoutOffSet.setUTCHours(
                dateWithoutOffSet.getUTCHours() - 2
            )

            const dateBrasilia = converterParaHorarioBrasilia(newDate)
            const dateBrasiliaToLocate = dateBrasilia
                .toLocaleDateString()
                .toLocaleString('pt-BR', {
                    timeZone: 'America/São Paulo',
                })

            if (TodayDate > dateBrasiliaToLocate) {
                return 'No match is available'
            }

            return {
                date:
                    'Data e hora em Brasília: ' +
                    dateBrasilia.toLocaleString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                    }),
                teams: [
                    lastMatch.children[0].attribs['aria-label'],
                    lastMatch.children[1].attribs['aria-label'],
                ],
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
            `${FILE_PATH}/${slug(`${nextTornamentLink}`)}.html`
        )

        console.log(getDate)
    } catch (error) {}
}

discordClient.on('ready', async () => {
    console.log(`Logged in as ${discordClient.user.tag}!`)
    main()
})
