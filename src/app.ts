import express from 'express'
import puppeteer from 'puppeteer'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
// import { logInToPlex, navigateToLiveTVPage, grabAndSaveScreenItems, selectMediaType, saveLogin, retrieveLogin, retrieveRawItems, extractMediaDetails } from './controllers/rawdata'
// import { test } from './controllers/media'
import { findAllUnprocessedMedia } from './controllers/media'
import { logInToPlex, navigateToLiveTVPage, selectMediaType, extractMediaDetails, grabAllScreenItems } from './controllers/puppeter'
import { saveLogin, retrieveLogin } from './controllers/authentication'
import { testMedia } from './models/media'

// Allow pulling ENV variable from .env file
dotenv.config()

const app = express()
const port = process.env['PORT']

// TODO - Unneeded?
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded())

// parse application/json
app.use(bodyParser.json())


// app.get('/', (req: express.Request, res: express.Response) => {
// 	res.json({
// 		message: 'Hello world',
// 	})
// })


// TODO - Figure out a better way to handle this. Also try to upgrade typescript to v4.0.0 or higher.
// interface ApiError {
// 	code: number;
// 	message: string;
//   }

// const isApiError = (x: any): x is ApiError => {
// return typeof x.code === 'number';
// };

app.post('/testRoute', async (req: express.Request, res: express.Response) => {
	console.log("In testRoute")
	try {
		// Pull variables from query
		const { nothing }: {nothing: any} = req.body
		console.log("NOTHING: ", nothing)
		const response = await testMedia()
		return res.status(200).json(response)
	} catch(err) {
		return res.status(500).json(`saveLogin failed: ${err}`)
	}
})

app.post('/saveLogin', async (req: express.Request, res: express.Response) => {
	console.log("In saveLogin")
	try {
		// Pull variables from query
		const {label, email, password, pin }: {label: string, email: string, password: string, pin: string} = req.body
		const response = await saveLogin(label, email, password, pin)
		return res.status(200).json(response)
	} catch(err) {
		return res.status(500).json(`saveLogin failed: ${err}`)
	}
})

app.post('/retrieveLogin', async (req: express.Request, res: express.Response) => {
	console.log("In retrieveLogin")
	try {
		// Pull variables from query
		const {label }: {label: string} = req.body
		const response = await retrieveLogin(label)
		return res.status(200).json(response)
	} catch(err) {
		return res.status(500).json(`retrieveLogin failed: ${err}`)
	}
})

// Grabs the data from plex
app.get('/pullRawData', async (req: express.Request, res: express.Response) => {
	console.log("In pullRawData")
	let browser
	try {
		// Pull variables from query
		// TODO - object desctructing?
		const mediaType: string = req.query?.mediaType as string // TODO - use enum type
		const headless: boolean = (req.query?.headless as string) !== 'false' // TODO - use enum type
		const userLabel: string = req.query?.userLabel as string

		if (!mediaType) {
			return res.status(500).json("mediaType is a required field")
		}

		console.log(`Starting raw data pull for media: ${mediaType} in headless: ${headless} mode`)

		// Create Browser
		browser = await puppeteer.launch({
			headless,
			// args: ['--start-fullscreen'],
			args: ['--no-sandbox'] // TODO - LESS SECURE, NO SANDBOX MEANS THIS IS NOT ISOLATED. NEED TO RUN PUPPETEER WITHOUT ROOT INSTEAD
			// slowMo: 500
		})

		// Get Data
		let page = await logInToPlex(browser, userLabel)
		page = await navigateToLiveTVPage(page)
		page = await selectMediaType(page, mediaType)
		await grabAllScreenItems(page, mediaType)

		console.log("Closing browser")
		await browser.close()

		return res.json(`Successfully saved raw screen data for media type: ${mediaType}`)
	} catch(err) {
		console.log(`pullRawData failed: ${err}`)
		console.log("Closing browser")
		if (browser) 
			await browser.close().catch(() => console.log("Browser close failure. Browser was never opened."))
		return res.status(500).json(`pullRawData failed: ${err}`)
	}
	
})

// Grabs records with only rawData
app.get('/retrieveUnprocessedMedia', async (req: express.Request, res: express.Response) => {
	console.log("In retrieveRawData")
	try {
		// Pull variables from query
		// TODO - object desctructing?
		const mediaType: string = req.query?.mediaType as string // TODO - use enum type

		if (!mediaType) {
			return res.status(500).json("mediaType is a required field")
		}

		const rawItems = await findAllUnprocessedMedia()
		return res.json(rawItems)
	} catch(err) {
		return res.status(500).json(`retrieveRawData failed: ${err}`)
	}
})

// Processes all records with only rawData
app.get('/extractMediaDetails', async (req: express.Request, res: express.Response) => {
	console.log("In extractMediaDetails")
	let browser
	try {
		const headless: boolean = (req.query?.headless as string) !== 'false' // TODO - use enum type
		const userLabel: string = req.query?.userLabel as string
		browser = await puppeteer.launch({
			headless,
			// args: ['--start-fullscreen'],
			args: ['--no-sandbox']
			// slowMo: 500
		})
		
		const page = await logInToPlex(browser, userLabel)
		const response = await extractMediaDetails(page)
		console.log("Closing browser")
		if (browser) 
			await browser.close().catch(() => console.log("Browser close failure. Browser was never opened."))
		
		// const response = await saveLogin(label, email, password, pin)
		return res.status(200).json(response)
	} catch(err) {
		console.log("Closing browser")
		if (browser) 
			await browser.close().catch(() => console.log("Browser close failure. Browser was never opened."))
		return res.status(500).json(`saveLogin failed: ${err}`)
	}
})

//Get Mongo/Mongoose Connected
// process.env[
	// "mongo": {
    //     "uri": "mongodb://localhost:27017/freds",
    //     "options": {
    //         "auto_reconnect": false,
    //         "keepAlive": 1,
    //         "connectTimeoutMS": 30000,
    //         "useNewUrlParser": true,
    //         "useUnifiedTopology": true
    //     }
    // }
var mongoose = require('mongoose');
var mongoUri = 'mongodb://localhost:27017/plex-assistant' // config.get('mongo.uri');
var mongoOptions = {
	// "auto_reconnect": false,
	"keepAlive": 1,
	"connectTimeoutMS": 30000,
	"useNewUrlParser": true,
	"useUnifiedTopology": true
}

var initMongo = (callback) => {
	mongoose.connection.on('connecting', function () {
		console.log('Mongo connecting');
	});

	mongoose.connection.on('error', function (error) {
		console.log('Error in MongoDb connection: ' + error);
		mongoose.disconnect();
	});

	mongoose.connection.on('connected', function () {
		console.log('Mongo connected!');
	});

	mongoose.connection.once('open', function () {
		console.log('Mongo connection open');
		callback();
	});

	mongoose.connection.on('reconnected', function () {
		console.log('Mongo reconnected');
	});

	mongoose.connection.on('disconnected', function () {
		console.log('Mongo disconnected');
		console.log('mongoUri is: ' + mongoUri);
		setTimeout(function () {
			mongoose.connect(mongoUri, mongoOptions);
		}, 500);
	});

	mongoose.connect(mongoUri, mongoOptions);
};

// var server = app.listen(port, function() {
// 	initMongo(function () {
// 		var host = server.address().address;
// 		var port = server.address().port;
// 		logger.info("We are listening on http://%s:%s", host, port);
// 	})
// });

app.listen(port, () => {
	initMongo(() => {
		console.log("Mongo Callback Finished")
		console.log(`plex-assistant server listening on port ${port}!`)
	})
	// console.log(`plex-assistant server listening on port ${port}!`)
	}
)
// 
