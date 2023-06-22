import template from 'lodash/template'

export const getAxisString = (section: string, field: string) => `${section}__${field}`

export const getAxisSegments = (facet: string) => {
    const [sectionId, questionId] = facet.split('__')
    return { sectionId, questionId }
}

export const getSizeInKB = (obj: any) => {
    const str = JSON.stringify(obj)
    // Get the length of the Uint8Array
    const bytes = new TextEncoder().encode(str).length
    return Math.round(bytes / 1000)
}

interface QueryVariables {
    surveyType: string
    axis1: string
    axis2: string
    currentYear: number
}

export const runQuery = async (
    url: string,
    query: string,
    queryName: string,
    variables: any = {}
): Promise<any> => {
    const startAt = new Date()
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            variables
        })
    })
    const text = await response.text()
    const endAt = new Date()
    try {
        const json = JSON.parse(text) // Try to parse it as JSON
        if (json.errors) {
            throw new Error(json.errors[0].message)
        }
        console.log(
            `🕚 Ran query ${queryName} in ${endAt.getTime() - startAt.getTime()}ms (${getSizeInKB(
                json
            )}kb) | ${url}`
        )

        return json.data
    } catch (error) {
        console.log(`// runQuery error (API_URL: ${url})`)
        console.log(text)
        throw new Error(error)
    }
}