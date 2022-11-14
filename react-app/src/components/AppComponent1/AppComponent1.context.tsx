import React, { useState, useCallback, createContext, useEffect } from 'react' // useMemo
type airData = {
    date: Date,
    network: string
}
type mediaArray = {
    mediaType?: string,
    error?: boolean,
    createdAt?: string,
    updatedAt?: string,
    title?: string,
    year?: string,
    length?: string,
    genres?: [string],
    resolution?: string,
    airData?: airData,
    detailsLink?: string
}

const defaultContextValue: {action: string, actionInProgress: boolean, lastAction: string, lastActionResponse: string, callExtractMediaDetails: any, callPullRawData: any, testButtonClick: any, stateVariable: string, media: any, lastUpdated: any} = {
    action: '',
    actionInProgress: false,
    lastAction: '',
    lastActionResponse: '',
    testButtonClick: () => {},
    callExtractMediaDetails: () => {},
    callPullRawData: () => {},
    stateVariable: '',
    media: [],
    lastUpdated: ''
}

import { extractMediaDetails, findMedia, pullRawData } from '../../apis/plex-assistant'

const AppContentContext = createContext(defaultContextValue)

const AppContentProvider = ({ children }: {children: any}) => {
    const [stateVariable, setStateVariable] = useState('default')
    const [media, setMedia] = useState([])
    const [lastUpdated, setLastUpdated] = useState([])
    const testButtonClick = useCallback(async () => {
        console.log("testButtonClick!")
        console.log("CURRENT STATE VARIABLE: ", stateVariable)
        setStateVariable(stateVariable+'E')
    }, [stateVariable, media])
    const [action, setAction] = useState('')
    const [lastAction, setLastAction] = useState('')
    const [lastActionResponse, setLastActionResponse] = useState('')
    const [actionInProgress, setActionInProgress] = useState(false)

    const getMedia = useCallback(async () => {
        const mediaResults = await findMedia({})
        let lastUpdatedResult
        for (let i = 0; i < mediaResults.length; i++) {
            if(!lastUpdatedResult) lastUpdatedResult = mediaResults[i].updatedAt
            if(lastUpdatedResult < mediaResults[i].updatedAt) lastUpdatedResult = mediaResults[i].updatedAt
        }
        setLastUpdated(lastUpdatedResult)
        setMedia(mediaResults)
    }, [media])

    const callExtractMediaDetails = useCallback(async () => {
        setActionInProgress(true)
        setAction('Extracting Media Details...')
        const responseStatus = await extractMediaDetails()
        setAction('')
        setLastAction('Extract Media Details')
        setLastActionResponse(`${responseStatus}`)
        setActionInProgress(false)
    }, [action, lastAction, lastActionResponse, setActionInProgress])

    const callPullRawData = useCallback(async () => {
        setActionInProgress(true)
        setAction('Pulling Raw Data...')
        const responseStatus = await pullRawData()
        setAction('')
        setLastAction('Pull Raw Data')
        setLastActionResponse(`${responseStatus}`)
        setActionInProgress(false)
    }, [action, lastAction, lastActionResponse, setActionInProgress])

    useEffect(() => {
        getMedia()
    }, [])

    return (
        <AppContentContext.Provider
        value={{
            action,
            actionInProgress,
            lastAction,
            lastActionResponse,
            callExtractMediaDetails,
            callPullRawData,
            lastUpdated,
            media,
            stateVariable,
            testButtonClick,
        }}
        >
            <>
                {children}
            </>
        </AppContentContext.Provider>
    )
}

export { AppContentContext, AppContentProvider }