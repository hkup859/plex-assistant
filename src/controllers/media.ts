const MediaModel = require('../models/media')

export const createMedia = async (detailsLink, mediaType): Promise<any> => {
    console.log("In media controller createMedia")
    return MediaModel.createMedia({ detailsLink, mediaType })
}

export const updateMedia = async (_id, mediaUpdateObject): Promise<any> => {
    console.log("In media controller updateMedia")
    return MediaModel.updateMedia(_id, mediaUpdateObject)
}

export const findMedia = async (searchCriteria) => {
    return MediaModel.findMedia(searchCriteria)
}

export const findAllUnprocessedMedia = async () => {
    return MediaModel.findAllUnprocessedMedia()
}
