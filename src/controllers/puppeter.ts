import dotenv from 'dotenv'

// Allow pulling ENV variable from .env file
dotenv.config()

const pageTimeout = process.env["PAGE_TIMEOUT"]
const dvrSections = ["Episodes", "Movies", "Shows", "Sports", "News"]

import { retrieveLogin } from './authentication'
import { createMedia, findAllUnprocessedMedia, updateMedia} from './media'


// Takes a browser & userLabel (plex authentication)
// Creates a new plex page and either logs in from scratch or via pin.
export const logInToPlex = async (browser: any, userLabel: string): Promise<any> => { // TODO use page & browser types
    console.log("In logInToPlex")
    let page
    try {
      console.log("Pulling Login Credentials")
      const loginCredentials = await retrieveLogin(userLabel)
  
      console.log("Creating new Page")
      page = await browser.newPage();
      await page.setViewport({width: 1920, height: 1080})
  
      // Load Plex
      // await page.goto('https://app.plex.tv/desktop/#!/')
      await page.goto('https://www.plex.tv/sign-in/?forward=https://www.plex.tv/')
      
      // // Close streaming popup if it exists
      // try {
      //   console.log("Closing streaming popup if it exists")
      //   await page.waitForSelector('[aria-label="Close Streaming Services modal"]', {timeout: pageTimeout})
      //   await page.click('[aria-label="Close Streaming Services modal"]')
      // } catch (err) {
      //   console.log("Caught Streaming Popup Error: ", err.message)
      // }
  
      // // Click sign in button on main page
      // console.log("Locating Sign In")
      // await page.waitForSelector('[data-testid=signInButton]', {timeout: pageTimeout}).catch((err: { message: any }) => console.log(`Sign In Button Error: ${err.message}`)) // TODO - should this be caught?
      // await page.click('[data-testid=signInButton]').catch((err: { message: any }) => console.log("Sign In Button Error 2: ", err.message)) // TODO - should this be caught?
      
      // Complete first login button
      console.log("Entering Credentials")
      console.log("Waiting for iFrame")
      // const frameName = 'iFrameResizer0'
      const frameName = 'fedauth-iFrame'
      let frame
      try {
        frame = await page.waitForFrame(async (frame: any) => { return frame.name() === frameName})
      } catch(err) {
        console.log("Failed to wait for iFrame. Searching existing frames now")
        const frames = await page.frames()
        // console.log("FRAMES: ", frames)
        console.log("FRAMES: ", frames.length)
        try {
          frame = frames.find((frame: any) => frame.name() === frameName) // .catch didn't work
        } catch(err) {
          console.log(`Failed to wait for iFrame - second try: ${err}`)
        }
      }

      try {
        console.log("Waiting for sign in option")
        await frame.waitForSelector('[data-testid=signIn--email]', {timeout: pageTimeout}).catch((err: { message: any }) => console.log(`Email Sign In Option Error: ${err.message}`)) // TODO - should this be caught?
        await frame.waitForTimeout(5000) // TODO - resolved error waiting for #email by waiting just a little longer for the page to load enough to actually click the button. Need to implement this everywhere as a precaution. Alternatively the troubleshooting/retry logic could fix it.
        await frame.click('[data-testid=signIn--email]')
      } catch(err) {
        console.log(`sign in frame steps failed: ${err}`)
      }

      try {
        console.log("Waiting for email textbox")
        await frame.waitForSelector('#email')
        await frame.type('#email', loginCredentials.email)
        await frame.type('#password', loginCredentials.password)
        console.log("Submitting Credentials")
        // const signInButton = '[data-uid=id-7]'
        const signInButton = '[data-uid=id-4]'
        await frame.click(signInButton) // TODO - Update this to a more defined metric
      } catch(err) {
        console.log(`typing frame steps failed: ${err}`)
      }

      console.log("First Login Completed")
      await page.waitForNavigation().catch(err => console.log(`Waiting for navigation failed: ${err}`)) // TODO - wait for navigation and then check the URL.
      const newUrl = await page.url()
      console.log("Redirected URL: ", newUrl)
      await page.goto('https://app.plex.tv/desktop/#!/')
      await page.waitForTimeout(1000) // TODO - Wait for navigation and then check a item on the screen to ensure the right page is up.
      
      // Complete second login screen - TODO split this to own function. Opening new pages will require pin but not full login.
      console.log("Selecting User Profile")
      await page.waitForSelector('.admin-icon', {timeout: pageTimeout})
      await page.click('.admin-icon')
      
      if (loginCredentials.pin) {
        console.log("PIN Detected. Entering PIN Data.")
        // await page.waitForSelector('.pin-digit-container') // Is this redundant?
        await page.waitForSelector('.pin-digit,current', {timeout: pageTimeout}).catch((err: { message: any }) => console.log(`Pin Selector Error: ${err.message}`)) // TODO - should this be caught?
        await page.type('.pin-digit,current', loginCredentials.pin.substr(0, 1))
        await page.waitForTimeout(1000)
        await page.type('.pin-digit,current', loginCredentials.pin.substr(1, 1))
        await page.waitForTimeout(1000)
        await page.type('.pin-digit,current', loginCredentials.pin.substr(2, 1))
        await page.waitForTimeout(1000)
        await page.type('.pin-digit,current', loginCredentials.pin.substr(3, 1))
      }
  
      // TODO - Add a wait for selector here. Something that identifies we are on the next page. Maybe a waitForNavigation?
      
      return page
    } catch (err) {
      console.log(`Failed to login: ${err}`)
      if (page) {
        return page
      } else {
        throw err
      }
    }
    
}

export const navigateToLiveTVPage = async (page: any): Promise<any> => { // TODO use page type
    console.log("In navigateToLiveTVPage")
    
    // Select Live TV Page (From sidebar or directly)
    try {
      console.log("Finding Live TV Option")
      await page.waitForSelector('[title="Live TV"]', {timeout: pageTimeout})
      await page.click('[title="Live TV"]')
    } catch (err) {
      console.log("Live TV Option Error: ", err.message)
      await page.waitForSelector('[data-testid=sidebarMore]')
      await page.click('[data-testid=sidebarMore]')
      await page.waitForSelector('[title="Live TV"]')
      await page.screenshot({ path: 'step7.png' });
      await page.click('[title="Live TV"]')
    }
  
    // Select Browse Section
    console.log("Navigating to DVR Browse")
    await page.waitForSelector('a[href*="dvr.browse"]')
    await page.click('a[href*="dvr.browse"]')
    return page
  }

export const selectMediaType = async (page: any, mediaType: string): Promise<any> => { // TODO - use page type, mediaType should be enum of dvrSections
    console.log("In selectMediaType")
    
    // Select Movies if not already selected // TODO - make this dynamic
    console.log("Finding List Dropdown")
    await page.waitForSelector('button[class*="DirectoryListToolbar"]') 
    const listOptions = await page.$$('button[class*="DirectoryListToolbar"]')
    const listButton = await findPropertyByTextContent(listOptions, dvrSections)
    await listButton.click()
  
    console.log(`Selecting ${mediaType} dropdown`)
    await page.waitForSelector('[data-testid="dropdownItem"]')
    const dropdownOptions = await page.$$('[data-testid="dropdownItem"]')
    const mediaDropdown = await findPropertyByTextContent(dropdownOptions, mediaType)
    await mediaDropdown.click()
    await page.waitForSelector('[data-testid=cellItem]')
    return page
}

// TODO - Is this really a puppeteer function or should it be moved to another controller?
const getTextContent = async (property: any): Promise<string> => { // TODO - use property type
    return await (await property.getProperty('textContent')).jsonValue()
}

// TODO - Is this really a puppeteer function or should it be moved to another controller?
const findPropertyByTextContent = async (properties: any, searchText: any, matchAll = false): Promise<any>  => { // TODO - use properties & searchText types
    // for await (property of properties) {
    for(let i = 0; i < properties.length; i++) {
      const property = properties[i]
      const propertyTextContent = await getTextContent(property)
      if (Array.isArray(searchText)) {
        if (matchAll) {
          console.log("searchText: ", searchText)
          console.log("propertyTextContent: ", propertyTextContent)
          let fullMatch = true
          for (let k = 0; k < searchText.length; k++) {
            if (!propertyTextContent.includes(searchText[k])) {
              fullMatch = false
              break
            }
          }
          if (fullMatch) {
            return property
          }
        } else if (searchText.includes(propertyTextContent)) {
          return property
        }
      } else {
        if (searchText === propertyTextContent) {
          return property
        }
      }
    }
}

// TODO - Is this really a puppeteer function or should it be moved to another controller?
// 70 min left
// Starting in 24 min on 9.1 WBONLD (AMG TV)
// Tonight at 6:30PM on 65.5 WLJCDT5 (This TV)
// Tomorrow at 12:00AM on 9.4 WBONLD4 (Retro Television Network)
// Sun, Jul 3 at 12:00AM on 9.4 WBONLD4 (Retro Television Network)
const createAirDate = (airedText: string, mediaLength: string): Date => {
    let airedDate = new Date()
  
    const isFullDate = airedText.substring(3, 4) === ','
  
    // Set Date Day
    if (airedText.startsWith('Tomorrow')) {
      airedDate.setDate(airedDate.getDate()+1)
    } else if (isFullDate) { //Example: Jul, 12 2022
      airedDate = new Date((airedText.substring(5, 11)) + airedDate.getFullYear())
    }
  
    let timeHours = 0
    let timeMinutes = 0
  
    if (isFullDate || airedText.startsWith('Tonight') || airedText.startsWith('Tomorrow')) {
      const timeText = airedText.substring(airedText.indexOf('at '), airedText.indexOf(' on'))
      const timeSplitIndex = timeText.indexOf(':')
      
      const timeHoursText = timeText.substring(0, timeSplitIndex)
      timeHours = (timeHoursText === '12' ? 0 : parseInt(timeHoursText)) + (timeText.substring(timeText.length - 2) === 'PM' ? 12 : 0)
      timeMinutes = parseInt(timeText.substring(timeSplitIndex+1, timeSplitIndex+3))
    } else { // We are dealing with text that is either "Starting in" or "left" (upcoming media or currently playing media)
      // Left Example: 70 min left || 2 hr left || 1 hr 57 min left
      // Starting Example:  Starting in 24 min on 9.1 WBONLD (AMG TV)
      const startingIndex = airedText.indexOf('Starting in ')
      const substringStartingIndex = startingIndex + 'Starting in '.length
  
      const relativeTimeMinutes = parseInt(airedText.substring(substringStartingIndex, airedText.indexOf(' min')))  
      const relativeTimeHours = airedText.indexOf('hr') !== -1 ? parseInt(airedText.substring(substringStartingIndex, airedText.indexOf(' hr'))) : 0 // There should not be hrs in this type of airdate, but the check is left in just in case based on how it would likely be formatted.
  
      if(startingIndex === 0) {
        timeMinutes = airedDate.getMinutes() + relativeTimeMinutes
        timeHours = airedDate.getHours() + relativeTimeHours
      } else {
        const mediaLengthMinutes = parseInt(mediaLength.substring(mediaLength.indexOf('hr ') + 'hr '.length, mediaLength.indexOf('min')))
        const mediaLengthHours = parseInt(mediaLength.substring(0, mediaLength.indexOf(' hr')))
        
        timeMinutes = airedDate.getMinutes() - (mediaLengthMinutes - relativeTimeMinutes)
        timeHours = airedDate.getHours() - (mediaLengthHours - relativeTimeHours)
      }
    }
    airedDate.setHours(timeHours)
    airedDate.setMinutes(timeMinutes)
    airedDate.setSeconds(0)
    airedDate.setMilliseconds(0)
    return airedDate
  }

// TODO - Perhaps rename? Something like processAllScreenItems, saveAllScreenItems, or processAllItems?
export const grabAllScreenItems = async (page: any, mediaType: string): Promise<any[]> => { // TODO - use page type
    let noNewItemsCount = 0
    let allItems: any[] = []
  
    // Align mouse & focus on page
    const mouse = await page.mouse
    const [mouseX, mouseY] = [300, 540]
    await mouse.click(mouseX, mouseY)
  
    while (noNewItemsCount < 10) {
      await page.waitForTimeout(1000)
      const { foundNewItem, finalItemList }= await grabCurrentScreenItems(page, allItems, mediaType)
      allItems = allItems.concat(finalItemList)
  
      // Increment if needed
      if(!foundNewItem) {
        noNewItemsCount++
      } else {
        noNewItemsCount = 0
      }
  
      // Page down for new items
      await page.keyboard.press("PageDown");
    }
    return allItems
}

// TODO - Convert to save each item as we go?
const grabCurrentScreenItems = async (page: any, allItems: any[], mediaType: string): Promise<any> => { // TODO - use page & allItems types
    const finalItemList: any[] = []
    const currentItems = await page.$$('[data-testid=cellItem]')
    let foundNewItem = false
    
    // for await (item of currentItems) {
    for(let i = 0; i < currentItems.length; i++) {
      const item = currentItems[i]
      const outerHTMLElement = await item.getProperty('outerHTML')
      const outHTMLText = await (outerHTMLElement).jsonValue()
      const matchingIndex = allItems.indexOf(outHTMLText)
      if(matchingIndex === -1) {
        finalItemList.push(outHTMLText)
        foundNewItem = true
        // Save Item - TODO -> should this be awaited? If so, what about a promise all?
        // TODO - This will fail a lot, MOST items will already exist? Perhaps only print error when it's not a duplicate error?
        await createMedia(outHTMLText, mediaType).catch(err => console.log(`Error creating media in grabCurrentScreenItems: ${err}`))
      } 
    }
    return { foundNewItem, finalItemList }
}

export const extractMediaDetails = async (page: any): Promise<void> => {
    try {
      console.log("In extractMediaDetails")
      // Verify login - login fully if not already logged in
  
      if(page) {
        console.log("Page exists, retrieving raw items")
        // const rawItems = await retrieveRawItems(mediaType)
        // TODO - Test this and confirm it is an array and not an object with an array on it.
        const rawItemRecords = await findAllUnprocessedMedia()
        console.log("rawItemRecords: ", rawItemRecords[0])
        
        console.log("Looping through items")
        const maxItems = rawItemRecords?.length <= 25 ? rawItemRecords?.length : 25
        for(let i = 0; i < maxItems; i++) {
            let title = ''
            let year = ''
            let length = ''
            let description = ''
            let genres = [], resolution = '', airData = {}, extraDatas = {}

            const currentItem = rawItemRecords[i]
            const currentRawData = currentItem.rawData
            
            // Grab detailed page href
            const hrefBeginIndex = currentRawData.indexOf('#!/server')
            const hrefPartial = currentRawData.substring(hrefBeginIndex)
            const hrefEndIndex = hrefBeginIndex + hrefPartial.indexOf(`\" role=\"link`)
            const detailsHref = currentRawData.substring(hrefBeginIndex, hrefEndIndex) //  // Grabs
            console.log("Loading Details: ", `https://app.plex.tv/desktop/${detailsHref}`)
            await page.goto(`https://app.plex.tv/desktop/${detailsHref}`)
            try {
                await page.waitForSelector('div[data-testid="preplay-mainTitle"]', { timeout: pageTimeout })
                // Grab Title
                const titleContainer = await page.$('div[data-testid="preplay-mainTitle"]')
                // const titleSpan = await titleContainer.$('span[title]')
                const titleSpan = await titleContainer.$('span')
                title = await getTextContent(titleSpan)
                console.log("TITLE: ", title)
    
                // Grab Year
                const YearContainer = await page.$('div[data-testid="preplay-secondTitle"]')
                year = await getTextContent(YearContainer)
                console.log("YEAR: ", year)
    
                // Grab Length (EX: '1 hr 20 min')
                const lengthContainer = await page.$('div[data-testid="preplay-thirdTitle"]')
                // const lengthSpan = await titleContainer.$('span[title]')
                const lengthSpan = await lengthContainer.$('span')
                length = await getTextContent(lengthSpan)
                console.log("LENGTH: ", length)
    
                // Grab Description
                // <div class="PrePlaySummary-summary-uEsl6j"><div style="overflow: hidden; max-height: 78px;"><div class="Measure-container-_70qZ9">In a case of mistaken identity, George is swapped with a royal monkey with a totally different personality. While the fun-loving George brings some much needed joy to a stuffy kingdom ruled by a stern king, Ted is puzzled by the snooty look-a-like.<div class="Measure-scrollContainer-8hW9vB"><div class="Measure-expandContent-asSKSW"></div></div><div class="Measure-scrollContainer-8hW9vB"><div class="Measure-shrinkContent-phwzLN Measure-expandContent-asSKSW"></div></div></div></div><button aria-haspopup="true" data-uid="id-207" role="button" class="CollapsibleText-readMore-wteMHG DisclosureArrowButton-disclosureArrowButton-x_5Y9W Link-link-SxPFpG DisclosureArrowButton-medium-OfMgTz Link-link-SxPFpG Link-default-BXtKLo" type="button">Read More<span class="CollapsibleText-readMoreArrow-X9_6sn DisclosureArrowButton-disclosureArrow-iPIByG DisclosureArrow-disclosureArrow-NTDkGd DisclosureArrowButton-down-s8HHHA DisclosureArrowButton-medium-OfMgTz DisclosureArrow-down-eIFuNm DisclosureArrow-up-rO9WLr DisclosureArrow-default-IjziOV DisclosureArrow-medium-fXE_g9"></span></button></div>
                // // <button aria-haspopup="true" data-uid="id-207" role="button" class="CollapsibleText-readMore-wteMHG DisclosureArrowButton-disclosureArrowButton-x_5Y9W Link-link-SxPFpG DisclosureArrowButton-medium-OfMgTz Link-link-SxPFpG Link-default-BXtKLo" type="button">Read More<span class="CollapsibleText-readMoreArrow-X9_6sn DisclosureArrowButton-disclosureArrow-iPIByG DisclosureArrow-disclosureArrow-NTDkGd DisclosureArrowButton-down-s8HHHA DisclosureArrowButton-medium-OfMgTz DisclosureArrow-down-eIFuNm DisclosureArrow-up-rO9WLr DisclosureArrow-default-IjziOV DisclosureArrow-medium-fXE_g9"></span></button>
                // class=Measure-container-_70qZ9
                const descriptionContainer = await page.$('div[class*="PrePlaySummary-summary"]')
                // const lengthSpan = await titleContainer.$('span[title]')
                const descriptionDiv = await descriptionContainer.$('div[class*="Measure-container"]')
                description = await getTextContent(descriptionDiv)
                console.log("description: ", description)
    
                // Grab extra data items (genre, resolution, airtime, etc)
                // TODO - Move to a separate function?
                const detailContainers = await page.$$('div[class*="PrePlayDetailsGroupItem-groupItem"]')
                // let { genres, resolution, airData, extraDatas }
                // let genres = [], resolution = '', airData = {}, extraDatas = {}
                for(let i = 0; i < detailContainers.length; i++) {
                console.log("Detail 1")
                const currentContainer = detailContainers[i]
                // Determine item type
                const labelDiv = await currentContainer.$('div[class*="PrePlayDetailsGroupItem-label"')
                const labelValue = await getTextContent(labelDiv)
                const valueDiv = await currentContainer.$('div[class*="PrePlayDetailsGroupItem-content"')
                console.log("Detail 2")
                switch(labelValue) {
                    case 'Genre':
                    // TODO - Code
                    // <button type="button" role="button" class="PrePlayTagListLink-tagsListLink-EXpbI2 Link-link-vSsQW1 Link-default-bdWb1S">and 2 more</button>
                    console.log("Detail 3")
                    // TODO - This whole section doesn't work as expected. ValueDiv is not finding the moreButton and even though genreSpans returns it doesn't let you call getProperty because they are elementHandles instead of JSHandles
                    const buttonOptions = await valueDiv.$$('button[class*="PrePlayTagListLink-tagsListLink"]')
                    const moreButton = await findPropertyByTextContent(buttonOptions, ['And ', ' More'], true)
                    if (moreButton) {
                        console.log("YES MORE BUTTON")
                        await moreButton.click()
                    }
                    const genreSpans = await valueDiv.$$('span[class*="PrePlayTagList-tagItem"')
                    console.log("Detail 4")
                    console.log("genreSpans: ", genreSpans.length)
                    const rawGenres = await getTextContent(valueDiv)
                    console.log("rawGenres: ", rawGenres.split(', '))
                    // genres = rawGenres.split(', ')
                    throw new Error("FORCE FAIL")
                    console.log("Detail 5")
                    break
                    case 'Video':
                    console.log("Detail 6")
                    resolution = await getTextContent(valueDiv)
                    console.log("Detail 7")
                    break
                    case 'Airs' || 'Airing':
                    console.log("Detail 8")
                    const airedText = await getTextContent(valueDiv)
                    const airedNetwork = airedText.substring(airedText.indexOf('on '))
                    console.log("Detail 9")
    
                    airData = {
                        date: createAirDate(airedText, length),
                        network: airedNetwork
                    }
                    break
                    default:
                    console.log("Detail 10")
                    // TODO - Code - unknown fields, save raw html
                    const innerHTML = await valueDiv.$eval("*", (element) => {
                        return element.innerHTML
                    })
                    console.log("Detail 12")
                    extraDatas[labelValue] = innerHTML
                    break
                }
                }
    
                console.log("READY!")
                
                // TODO - Grab poster image
    
                // Save Record
                await updateMedia(currentItem._id, {
                    title,
                    year,
                    length,
                    description,
                    genres,
                    resolution,
                    airData,
                    extraDatas,
                    // posterImage,
                })
            } catch (err) {
                console.log("GOT ERROR: ", err)
                const emptyPageConfirmation = await page.$('div[class*="EmptyPageContent-title"]')
                if (emptyPageConfirmation) {
                    console.log("Skipping this record, an error loading occured")
                    // Save Record
                    await updateMedia(currentItem._id, {
                        error: true
                    })
                } else {
                    // TODO - Real Error -> Add ability to save error message
                    await updateMedia(currentItem._id, {
                        error: true,
                        title,
                        year,
                        length,
                        description,
                        genres,
                        resolution,
                        airData,
                        extraDatas,
                    })   
                }
            }
            console.log("----------------------------")
        }
      }
    } catch(err) {
      console.log(`extractMediaDetails Failed: ${err}`)
      throw new Error(`extractMediaDetails Failed: ${err}`)
    }
    
  
  }