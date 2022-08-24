const PriorityModel = require('../models/priority')

export const createPriority = async (title: string, mediaType: string, shouldRecord: boolean, year?: string, lastAired?: Date): Promise<any> => {
    console.log("In priority controller createPriority")
    return PriorityModel.createPriority({ title, mediaType, shouldRecord, year, lastAired })
}

export const updatePriority = async (_id, priorityUpdateObject): Promise<any> => {
    console.log("In priority controller updatePriority")
    return PriorityModel.updatePriority(_id, priorityUpdateObject)
}

export const findPriorityByTitleAndMediaType = async (title, mediaType) => {
    return PriorityModel.findPriorityByTitleAndMediaType(title, mediaType)
}