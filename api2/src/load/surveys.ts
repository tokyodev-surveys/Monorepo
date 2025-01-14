import { SurveyConfig, Survey, Edition } from '../types/surveys'
import { RequestContext, Section } from '../types'
import { Octokit } from '@octokit/core'
import fetch from 'node-fetch'
import yaml from 'js-yaml'
import { existsSync } from 'fs'
import { readdir, readFile, lstat } from 'fs/promises'
import { logToFile } from '@devographics/helpers'
import path from 'path'
import { setCache } from '../helpers/caching'
import { appSettings } from '../helpers/settings'

let allSurveys: Survey[] = []

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

// add `apiOnly` flags to questins
const makeAPIOnly = (sections: Section[]) =>
    sections.map(s => ({
        ...s,
        questions: s.questions.map(q => ({ ...q, apiOnly: true }))
    }))

// load surveys if not yet loaded
export const loadOrGetSurveys = async (
    options: {
        forceReload?: boolean
        /** Set to true to keep the demo survey during dev */
        includeDemo?: boolean
    } = {}
) => {
    const { forceReload, includeDemo } = options

    if (forceReload || allSurveys.length === 0) {
        allSurveys = await loadSurveys()
    }
    if (includeDemo) return allSurveys
    return allSurveys.filter(s => s.id !== 'demo_survey')
}

const getRepo = () => {
    const repo = process.env.SURVEYS_REPO
    if (!repo) {
        throw new Error(`Env variable SURVEYS_REPO not defined`)
    }
    return repo
}

const options = {
    owner: 'Devographics',
    repo: getRepo()
}

const listGitHubFiles = async (ghPath: string) => {
    const contents = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        ...options,
        path: ghPath
    })
    return contents.data as any[]
}

const getGitHubYamlFile = async (url: string) => {
    const response = await fetch(url)
    const contents = await response.text()
    try {
        const yamlContents: any = yaml.load(contents)
        return yamlContents
    } catch (error) {
        console.log(`// Error loading file ${url}`)
        console.log(error)
    }
}

const skipItem = (fileName: string) => fileName.slice(0, 1) === '_'

export const loadFromGitHub = async () => {
    console.log(`-> loading surveys repo`)
    const surveys: Survey[] = []

    const repoDirContents = await listGitHubFiles('')

    // loop over repo contents and fetch raw yaml files
    for (const file of repoDirContents) {
        if (file.type === 'dir') {
            if (skipItem(file.name)) {
                continue
            }
            console.log(`// Loading survey ${file.name}…`)
            const editions: any[] = []
            let surveyConfigYaml: SurveyConfig = { id: 'default' }
            const surveyDirContents = await listGitHubFiles(file.path)

            for (const file2 of surveyDirContents) {
                if (skipItem(file2.name)) {
                    continue
                }
                if (file2.name === 'config.yml') {
                    // found config.yml for survey
                    surveyConfigYaml = await getGitHubYamlFile(file2.download_url)
                } else if (file2.type === 'dir') {
                    console.log(`    -> Edition ${file2.name}…`)
                    const editionsDirContents = await listGitHubFiles(file2.path)
                    let edition = {}
                    for (const file3 of editionsDirContents) {
                        if (file3.name === 'config.yml') {
                            // found config.yml for edition
                            const editionConfigYaml = await getGitHubYamlFile(file3.download_url)
                            edition = { ...edition, ...editionConfigYaml }
                        } else if (file3.name === 'questions.yml') {
                            // found config.yml for edition
                            const editionQuestionsYaml = await getGitHubYamlFile(file3.download_url)
                            edition = { ...edition, sections: editionQuestionsYaml }
                        } else if (file3.name === 'api.yml') {
                            // found api.yml for edition
                            const editionApiYaml = await getGitHubYamlFile(file3.download_url)
                            edition = { ...edition, apiSections: makeAPIOnly(editionApiYaml) }
                        }
                    }
                    editions.push(edition)
                }
            }
            const survey = { ...surveyConfigYaml, editions }
            surveys.push(survey)
        }
    }
    return surveys
}

const excludeDirs = ['.git', '.DS_Store']

// when developing locally, load from local files
export const loadLocally = async () => {
    const surveys: Survey[] = []

    const surveysDirPath = path.resolve(`../../${appSettings.surveysDir}/`)

    console.log(`-> loading surveys locally (${surveysDirPath})`)

    const surveysDirs = await readdir(surveysDirPath)

    // loop over dir contents and fetch raw yaml files
    for (const surveyDirName of surveysDirs) {
        if (skipItem(surveyDirName)) {
            continue
        }
        const editions = []
        const surveyDirPath = surveysDirPath + '/' + surveyDirName
        const stat = await lstat(surveyDirPath)
        if (!excludeDirs.includes(surveyDirName) && stat.isDirectory()) {
            console.log(`// Loading survey ${surveyDirName}…`)

            const surveyConfigContents = await readFile(surveyDirPath + '/config.yml', 'utf8')
            const surveyConfigYaml: any = yaml.load(surveyConfigContents)
            const editionsDirs = await readdir(surveyDirPath)

            for (const editionDirName of editionsDirs) {
                if (skipItem(editionDirName)) {
                    console.log(`    -> Skipping ${editionDirName}…`)
                    continue
                }
                const editionDirPath = `${surveyDirPath}/${editionDirName}`
                const stat = await lstat(editionDirPath)
                if (!excludeDirs.includes(editionDirName) && stat.isDirectory()) {
                    console.log(`    -> Edition ${editionDirName}…`)
                    let edition
                    try {
                        const editionConfigContents = await readFile(
                            editionDirPath + '/config.yml',
                            'utf8'
                        )
                        const editionConfigYaml: any = yaml.load(editionConfigContents)
                        edition = editionConfigYaml
                    } catch (error) { }
                    const questionsPath = editionDirPath + '/questions.yml'
                    if (existsSync(questionsPath)) {
                        try {
                            const editionQuestionsContents = await readFile(questionsPath, 'utf8')
                            const editionQuestionsYaml: any = yaml.load(editionQuestionsContents)
                            edition.sections = editionQuestionsYaml
                        } catch (error) {
                            console.log(`YAML parsing error for edition ${editionDirName}`)
                            console.log(error)
                        }
                    }

                    try {
                        const editionApiContents = await readFile(
                            editionDirPath + '/api.yml',
                            'utf8'
                        )
                        const editionApiYaml: any = yaml.load(editionApiContents)
                        edition.apiSections = makeAPIOnly(editionApiYaml)
                    } catch (error) { }
                    editions.push(edition)
                }
            }

            const survey = { ...surveyConfigYaml, editions }
            surveys.push(survey)
        }
    }
    return surveys
}

// load locales contents through GitHub API or locally
export const loadSurveys = async () => {
    console.log('// loading surveys')

    const surveys: Survey[] =
        process.env.LOAD_DATA === 'local' ? await loadLocally() : await loadFromGitHub()
    console.log(`// done loading ${surveys.length} surveys`)

    return surveys
}

export const initSurveys = async () => {
    console.log('// initializing surveys')
    const isDevOrTest = !!(
        process.env.NODE_ENV && ['test', 'development'].includes(process.env.NODE_ENV)
    )
    const surveys = await loadOrGetSurveys({ forceReload: true, includeDemo: isDevOrTest })
    logToFile('surveys.json', surveys, { mode: 'overwrite' })
    return surveys
}

export const getSurveys = async () => {
    return allSurveys
}

// Look up entities by id, name, or aliases (case-insensitive)
// export const getEntity = async ({ id }: { id: string | number }) => {
//     const entities = await loadOrGetSurveys()

//     if (!id || typeof id !== 'string') {
//         return
//     }

//     const lowerCaseId = id.toLowerCase()
//     // some entities are only for normalization and should not be made available through API
//     const entity = entities
//         .filter(e => !e.normalizationOnly)
//         .find(e => {
//             return (
//                 (e.id && e.id.toLowerCase() === lowerCaseId) ||
//                 (e.id && e.id.toLowerCase().replace(/\-/g, '_') === lowerCaseId) ||
//                 (e.name && e.name.toLowerCase() === lowerCaseId) ||
//                 (e.aliases && e.aliases.find((a: string) => a.toLowerCase() === lowerCaseId))
//             )
//         })

//     return entity
// }

export const cacheSurveys = async ({
    surveys,
    // entities,
    context
}: {
    surveys: Survey[]
    // entities: Entity[]
    context: RequestContext
}) => {
    console.log(`// Initializing surveys cache (Redis)…`)

    setCache(getAllSurveysCacheKey(), surveys, context)

    const surveysWithoutOutlines = surveys.map(({ editions, ...surveyRest }) => {
        const editionsWithoutOutlines = editions.map(({ sections, ...editionRest }) => editionRest)
        return { ...surveyRest, editions: editionsWithoutOutlines }
    })
    setCache(getAllSurveysMetadataCacheKey(), surveysWithoutOutlines, context)

    for (const survey of surveys) {
        const { editions, ...rest } = survey
        for (const edition of editions) {
            const item = { ...edition, survey: rest }
            setCache(getEditionCacheKey({ edition }), item, context)
        }
    }
    console.log(`-> Cached ${surveys.length} surveys (${surveys.map(s => s.id).join()})`)
}

export const getAllSurveysCacheKey = () => `surveys_all`

export const getAllSurveysMetadataCacheKey = () => `surveys_all_metadata`

export const getEditionCacheKey = ({ edition }: { edition: Edition }) => `surveys_${edition.id}`

export default allSurveys
