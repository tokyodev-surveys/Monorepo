import fs from 'fs'
import yaml from 'js-yaml'

export type LogOptions = {
    mode?: 'append' | 'overwrite'
    timestamp?: boolean
    dirPath?: string
    subDir?: string
}

export const logToFile = async (fileName: string, object: any, options: LogOptions = {}) => {
    if (process.env.NODE_ENV === 'development') {
        const { mode = 'append', timestamp = false, dirPath, subDir } = options
        const envLogsDirPath = process.env.LOGS_DIRECTORY

        if (!envLogsDirPath) {
            console.warn('Please define LOGS_DIRECTORY in your .env file to enable logging')
            return
        }
        const logsDirPath = dirPath ?? (subDir ? `${envLogsDirPath}/${subDir}` : envLogsDirPath)

        if (!fs.existsSync(logsDirPath)) {
            fs.mkdirSync(logsDirPath, { recursive: true })
        }
        const fullPath = `${logsDirPath}/${fileName}`
        let contents
        if (typeof object === 'string') {
            contents = object
        } else {
            if (fileName.includes('.yml') || fileName.includes('.yaml')) {
                contents = yaml.dump(object, { noRefs: true, skipInvalid: true })
            } else {
                contents = JSON.stringify(object, null, 2)
            }
        }
        const now = new Date()
        const text = timestamp ? now.toString() + '\n---\n' + contents : contents
        if (mode === 'append') {
            const stream = fs.createWriteStream(fullPath, { flags: 'a' })
            stream.write(text + '\n')
            stream.end()
        } else {
            fs.readFile(fullPath, (error, data) => {
                let shouldWrite = false
                if (error && error.code === 'ENOENT') {
                    // the file just does not exist, ok to write
                    shouldWrite = true
                } else if (error) {
                    // maybe EACCESS or something wrong with the disk
                    throw error
                } else {
                    const fileContent = data.toString()
                    if (fileContent !== text) {
                        shouldWrite = true
                    }
                }

                if (shouldWrite) {
                    fs.writeFile(fullPath, text, error => {
                        // throws an error, you could also catch it here
                        if (error) throw error

                        // eslint-disable-next-line no-console
                        console.log(`Log saved to ${fullPath}`)
                    })
                }
            })
        }
    }
}
