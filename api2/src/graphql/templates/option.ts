import { Option } from '../../types'
import { graphqlize } from '../../generate/helpers'
import { QuestionApiObject } from '../../types/surveys'

/*

Sample output:

type DisabilityStatusOption {
    id: DisabilityStatusID
    editions: [StateOfJsEditionID]
}

Note: when option are numeric, we use the Float type because enums items
can't be numbers.

*/

export const generateOptionType = ({ question }: { question: QuestionApiObject }) => {
    const { optionTypeName, enumTypeName, surveyId, options, optionsAreNumeric } = question
    if (!optionTypeName) return
    const optionsHaveAverage = options?.some((o: Option) => typeof o.average !== 'undefined')
    return {
        typeName: optionTypeName,
        typeType: 'option',
        typeDef: `type ${optionTypeName} {
    id: ${optionsAreNumeric ? 'Float' : enumTypeName}
    label: String
    entity: Entity
    editions: [${graphqlize(surveyId)}EditionID]${optionsHaveAverage ? '\n    average: Float' : ''}
}`
    }
}
