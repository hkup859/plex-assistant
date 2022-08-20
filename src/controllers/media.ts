// const mongoose = require('mongoose')
const MediaModel = require('../models/media')// ({ mongoose: mongoose })

// export const test = async (): Promise<any> => {
//     console.log("TEST RUN")
//     console.log("createMedia: ", MediaModel.createMedia)
//     const testMedia = await MediaModel.createMedia({rawData: 'testData5'})
//     console.log("testMedia: ", testMedia)
//     const exampleUpdate = { error: true, mediaType: 'Movie'}
//     const updateResults = await MediaModel.updateMedia(testMedia._id, exampleUpdate)
//     console.log("updateResults: ", updateResults)
//     return "YAY"
// }

export const createMedia = async (rawData, mediaType): Promise<any> => {
    console.log("In media controller createMedia")
    return MediaModel.createMedia({ rawData, mediaType }) // Does this need await?
}

export const updateMedia = async (_id, mediaUpdateObject): Promise<any> => {
    console.log("In media controller createMedia")
    return MediaModel.updateMedia(_id, mediaUpdateObject) // Does this need await?
}

export const findMedia = async (searchCriteria) => {
    return MediaModel.findMedia(searchCriteria) // Does this need await?
}

export const findAllUnprocessedMedia = async () => {
    return MediaModel.findAllUnprocessedMedia() // Does this need await?
}
