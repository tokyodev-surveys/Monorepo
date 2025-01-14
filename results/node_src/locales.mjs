import { getLocalesQuery } from './queries.mjs'
import { logToFile } from './log_to_file.mjs'
import { createClient } from 'redis'

export const getLocalesGraphQL = async ({ localeIds, graphql, contexts, editionId }) => {
    const localesQuery = getLocalesQuery(localeIds, contexts)
    logToFile('localesQuery.graphql', localesQuery, {
        mode: 'overwrite',
        editionId
    })

    const localesResults = await graphql(
        `
            ${localesQuery}
        `
    )
    logToFile('localesResults.json', localesResults, {
        mode: 'overwrite',
        editionId
    })
    const locales = localesResults.data.internalAPI.locales

    return locales
}

export const getLocalesRedis = async ({ localeIds, contexts, editionId }) => {
    const redisClient = createClient({
        url: process.env.REDIS_URL
    })

    redisClient.on('error', err => console.log('Redis Client Error', err))

    await redisClient.connect()

    const localesRaw = await redisClient.get('locale_all_locales_metadata')
    let locales = JSON.parse(localesRaw)

    if (localeIds && localeIds.length > 0) {
        locales = locales.filter(({ id }) => localeIds.includes(id))
    }

    logToFile('localesMetadataRedis.json', locales, {
        mode: 'overwrite',
        editionId
    })

    for (const locale of locales) {
        let localeStrings = []

        for (const context of contexts) {
            const key = `locale_${locale.id}_${context}_parsed`
            const dataRaw = await redisClient.get(key)
            const data = JSON.parse(dataRaw)
            const strings = data.strings
            localeStrings = [...localeStrings, ...strings]
        }
        locale.strings = localeStrings
    }

    logToFile('localesResultsRedis.json', locales, {
        mode: 'overwrite',
        editionId
    })

    return locales
}
