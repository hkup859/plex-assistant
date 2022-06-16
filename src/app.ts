import express from 'express'
import puppeteer from 'puppeteer'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import { logInToPlex, navigateToLiveTVPage, grabAndSaveScreenItems, selectMediaType, saveLogin, retrieveLogin, encrypt, decrypt } from './controllers/rawdata'

// Allow pulling ENV variable from .env file
dotenv.config()

const app = express()
const port = process.env['PORT']

// TODO - Unneeded?
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded())

// parse application/json
app.use(bodyParser.json())


app.get('/', (req: express.Request, res: express.Response) => {
	res.json({
		message: 'Hello world',
	})
})

app.post('/saveLogin', async (req: express.Request, res: express.Response) => {
	console.log("In saveLogin")
	try {
		// Pull variables from query
		const {label, email, password, pin }: {label: string, email: string, password: string, pin: string} = req.body
		const response = await saveLogin(label, email, password, pin)
		return res.status(200).json(response)
	} catch(err) {
		return res.status(500).json(err.message)
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
		return res.status(500).json(err.message)
	}
})

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
			// slowMo: 500
		})

		// Get Data
		let page = await logInToPlex(browser, userLabel)
		page = await navigateToLiveTVPage(page)
		page = await selectMediaType(page, mediaType)
		await grabAndSaveScreenItems(page, mediaType)

		console.log("Closing browser")
		await browser.close()

		return res.json(`Successfully saved raw screen data for media type: ${mediaType}`)
	} catch(err) {
		console.log(`pullRawData failed: ${err.message}`)
		console.log("Closing browser")
		await browser.close().catch(err => console.log("Browser close failure. Browser was never opened."))
		return res.status(500).json(`pullRawData failed: ${err}`)
	}
	
})

app.listen(port, () => console.log(`plex-assistant server listening on port ${port}!`))
