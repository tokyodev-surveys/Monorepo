import React, { useState, useEffect } from 'react'
import { usePageContext } from 'core/helpers/pageContext'
import { CHART_MODE_GROUPED } from '../constants'
import { AllQuestionData, BucketUnits } from '@devographics/types'
import { DynamicDataLoaderProps } from './DynamicDataLoader'
import { fetchSeriesData } from '../helpers'
import { DataSeries } from 'core/filters/types'
import styled from 'styled-components'
import Loading from 'core/explorer/Loading'
// import { spacing, mq, fontSize } from 'core/theme'

interface CombinedDataLoaderProps extends DynamicDataLoaderProps {
    defaultSeries: DataSeries<AllQuestionData>
}

const CombinedDataLoader = ({
    block,
    defaultSeries,
    setUnits,
    chartFilters,
    children
}: CombinedDataLoaderProps) => {
    const pageContext = usePageContext()
    const year = pageContext.currentEdition.year

    const [isLoading, setIsLoading] = useState(false)
    const [series, setSeries] = useState([defaultSeries])

    useEffect(() => {
        const getData = async () => {
            setIsLoading(true)

            const seriesData = await fetchSeriesData({
                block,
                pageContext,
                chartFilters,
                year
            })

            // percentageQuestion is the only unit that lets us
            // meaningfully compare values across series
            if (setUnits) {
                setUnits(BucketUnits.PERCENTAGE_QUESTION)
            }
            const combinedSeries = [defaultSeries, ...seriesData]
            setSeries(combinedSeries)
            setIsLoading(false)
        }

        if (chartFilters?.filters?.length > 0) {
            getData()
        }
    }, [chartFilters])

    return (
        <Wrapper_>
            <Contents_>
                {React.cloneElement(children, {
                    series,
                    chartDisplayMode: CHART_MODE_GROUPED,
                    showDefaultSeries: chartFilters.options.showDefaultSeries
                })}
            </Contents_>
            {isLoading && <Loading />}
        </Wrapper_>
    )
}

const Wrapper_ = styled.div`
    position: relative;
`

const Contents_ = styled.div`
    flex: 1;
`

export default CombinedDataLoader
