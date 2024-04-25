import axios from 'axios'
import { load } from 'cheerio'
import { writeFile, readFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { URL, fileURLToPath } from 'url'

const BASE_URL = 'https://liquipedia.net'
const furiaUrl = 'https://liquipedia.net/counterstrike/FURIA_Esports'
const path = new URL(furiaUrl).pathname

const __dirname = dirname(fileURLToPath(import.meta.url))
const FILE_PATH = resolve(__dirname, '../cached')

const options = {
    Headers: {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36',
    },
}

const converterParaHorarioBrasilia = (data) => {
    // Converter a data para o horário de Brasília (UTC-3)
    var dataBrasilia = new Date(data)
    dataBrasilia.setUTCHours(dataBrasilia.getUTCHours() - 3)
    return dataBrasilia
}

const slug = (texto) => {
    return texto
        .toString()
        .toLowerCase()
        .trim() // transforma texto para caixa baixa e remove espaços nas extremidades do texto
        .replace(/\s+/g, '-') // substitui espaços por hífen
        .replace(/[áàäâã]/g, 'a') // substitui caracteres especiais á à ä â ã por a
        .replace(/[éèëê]/g, 'e') // substitui caracteres especiais é è ë ê  por e
        .replace(/[íìîï]/g, 'i') // substitui caracteres especiais í ì î ï por i
        .replace(/[óòöôõ]/g, 'o') // substitui caracteres especiais ó ò ö ô õ por o
        .replace(/[úùüû]/g, 'u') // substitui caracteres especiais ú ù ü û por u
        .replace(/ñ/g, 'n') // substitui caracteres especiais ñ por n
        .replace(/ç/g, 'c') // substitui caracteres especiais ç por c
        .replace(/[^\a-z0-9\-]+/g, '') // exclui caracteres que não seja alfanumérico
        .replace(/\-\-+/g, '-') // substitui mutiplos hífens por hífen simples
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

getHtmlFromLiquipedia(furiaUrl, `${FILE_PATH}/${slug(`${path}`)}.html`)

const getDataOfNextMatch = async (url, filePath) => {
    try {
        let content = await readCachedFile(filePath)

        if (!content) {
            content = await request(url)
            await writeCachedFile(filePath, content)
        }

        const $ = load(content)
        const getPatentNode = $('[aria-label="FURIA Esports"]').parent()
        let dataWithOutOffSet =
            getPatentNode.children()[3].children[2].children[0].children[0]
                .children[0].children[0].data

        if (dataWithOutOffSet) {
            dataWithOutOffSet = String(dataWithOutOffSet).replace('-', '')

            const dateWithoutOffSet = new Date(dataWithOutOffSet)
            const newDate = dateWithoutOffSet.setUTCHours(
                dateWithoutOffSet.getUTCHours() - 2
            )

            const dataBrasilia = converterParaHorarioBrasilia(newDate)

            return (
                'Data e hora em Brasília: ' +
                dataBrasilia.toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                })
            )
        }
    } catch (error) {
        console.error(error)
    }
}

const nextTornamentLink = await getNextTornament(
    furiaUrl,
    `${FILE_PATH}/${slug(`${path}`)}.html`
)

const getDate = await getDataOfNextMatch(
    `${BASE_URL}${nextTornamentLink}`,
    `${FILE_PATH}/${slug(`${nextTornamentLink}`)}.html`
)

console.log(getDate)