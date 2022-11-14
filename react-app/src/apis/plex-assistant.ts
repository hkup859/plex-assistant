import axios from 'axios'

// const THE_URL = 'https://localhost:4000/findMedia' // SSL Failure
// const THE_URL = 'http://localhost:4000/findMedia' // CORS failure -> Access to XMLHttpRequest at 'http://localhost:4000/findMedia' from origin 'http://localhost:3000' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
// const THE_URL = 'http://127.0.0.1:4000/findMedia' // CORS failure -> Access to XMLHttpRequest at 'http://localhost:4000/findMedia' from origin 'http://localhost:3000' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
// const plex_assistant_url = 'http://192.168.1.169:4000' // This doesn't work on different computers on the network (duh). Need to identify a static location and provide it via env
// const plex_assistant_url = 'http://192.168.0.233:4000'
const plex_assistant_url = 'http://localhost:4000' // Figure out a safe CORS policy, probably need authentication on API anyways
export const findMedia = async (searchCriteria: any) => {
    try {
        console.log("searchCriteria: ", searchCriteria)
        const response = await axios.post(`${plex_assistant_url}/findMedia`, { searchCriteria }) // 3rd arguement is headers
        console.log('response  ', response)
        return response.data;
    } catch (err) {
        console.log("Error calling findMedia api: ", err)
        throw err
    }
}
// pullRawData?mediaType=Movies&email=bot@davisfamily2.com
// extractMediaDetails?mediaType=Movies&email=bot@davisfamily2.com
export const extractMediaDetails = async () => {
    try {
        console.log("In extractMediaDetails")
        const response = await axios.get(`${plex_assistant_url}/extractMediaDetails?mediaType=Movies&email=bot@davisfamily2.com`)
        console.log('response  ', response)
        return response.status;
    } catch (err) {
        console.log("Error calling extractMediaDetails api: ", err)
        throw err
    }
}

export const pullRawData = async () => {
    try {
        console.log("In pullRawData")
        const response = await axios.get(`${plex_assistant_url}/pullRawData?mediaType=Movies&email=bot@davisfamily2.com`)
        console.log('response  ', response)
        return response.status;
    } catch (err) {
        console.log("Error calling pullRawData api: ", err)
        throw err
    }
}
