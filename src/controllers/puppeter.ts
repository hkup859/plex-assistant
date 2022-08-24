import dotenv from 'dotenv'

// Allow pulling ENV variable from .env file
dotenv.config()

const pageTimeout = process.env["PAGE_TIMEOUT"]
const extractMediaDetailsLimit = process.env['EXTRACT_MEDIA_DETAILS_LIMIT'] || 25
const dvrSections = ["Episodes", "Movies", "Shows", "Sports", "News"]
const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', "Saturday"]
const weekDaysAbbreviations = weekDays.map(x => x.substring(0, 3))

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
      
      // Complete second login screen
      await authenticatePlexUser(page, loginCredentials.profileUsername, loginCredentials.pin)

      // TODO - Add a wait for selector here. Something that identifies we are on the next page. Maybe a waitForNavigation?
      
      return { page, pin: loginCredentials.pin }
    } catch (err) {
      console.log(`Failed to login: ${err}`)
      if (page) {
        return page
      } else {
        throw err
      }
    }
    
}


const authenticatePlexUser = async (page: any, profileUsername: string, pin?: string) => {
  console.log("Selecting User Profile")
  // <div class="caption"> <div class="username">bo8778</div> <div class="managed-title hidden"></div> <div class="managed-title-community hidden"></div> </div>
  await page.waitForSelector('.admin-icon', {timeout: pageTimeout}) // There will always be an admin profile
  const profileOptions = await page.$$('div[class="username"]')
  console.log("profileOptions: ", profileOptions)
  const profile = await findPropertyByTextContent(profileOptions, profileUsername)
  await profile.click()
  // await page.click('.admin-icon')
  // await page.waitForSelector('.pin-digit-container') // Is this redundant?
  // TODO - Any additional checks we could do to see if we are on this page? We are now using this logic when we encounter an extraction error and it would be good to KNOW that we are on this page.
  if (pin) {
    await page.waitForSelector('.pin-digit,current', {timeout: pageTimeout}).catch((err: { message: any }) => console.log(`Pin Selector Error: ${err.message}`)) // TODO - should this be caught?
    await page.type('.pin-digit,current', pin.substr(0, 1)) // TODO convert these to substring. substr is deprecated.
    await page.waitForTimeout(1000)
    await page.type('.pin-digit,current', pin.substr(1, 1))
    await page.waitForTimeout(1000)
    await page.type('.pin-digit,current', pin.substr(2, 1))
    await page.waitForTimeout(1000)
    await page.type('.pin-digit,current', pin.substr(3, 1))
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
// Saturday at 12:00PM on 65.5 WLJCDT5 (This TV) 2 hr 30 min
// Sun, Jul 3 at 12:00AM on 9.4 WBONLD4 (Retro Television Network)
// TODO - Dates appear to work, but are stored in timezone specific format. This conflicts with mongo which only uses UTC. Therefore we need to convert all dates to UTC.
const createAirDate = (airedText: string, mediaLength: string): Date => {
    console.log("In createAirDate: ", airedText, mediaLength)
    let airedDate = new Date()
    console.log("airedDate 1: ", airedDate)
  
    const relativeDateIndex = weekDays.findIndex(weekDay => weekDay === airedText.substring(0, weekDay.length))
    console.log("relativeDateIndex: ", relativeDateIndex)
    const isRelativeDate = relativeDateIndex !== -1
    const isFullDate = !isRelativeDate && weekDaysAbbreviations.includes(airedText.substring(0, 3)) && !isNaN(parseInt(airedText.substring(9, 11)))
    // const isFullDate = weekDaysAbbreviation.includes(airedText.substring(0, 3)) && !isNaN(parseInt(airedText.substring(5,7)))  // airedText.substring(3, 4) === ',' // TODO Not all full dates have a comma... Check if the first 3 characters made a day, then the substring(5,7) characters are a date just to be safe

    console.log("isFullDate: ", isFullDate)
    console.log("!isRelativeDate: ", !isRelativeDate)
    console.log("weekDaysAbbreviations.includes(airedText.substring(0, 3)): ", weekDaysAbbreviations.includes(airedText.substring(0, 3)))
    // console.log("airedText.substring(5,7): ", airedText.substring(5,7))
    // console.log("parseInt(airedText.substring(5,7)): ", parseInt(airedText.substring(5,7)))
    // console.log("!isNaN(parseInt(airedText.substring(5,7)): ", !isNaN(parseInt(airedText.substring(5,7))))
  
    // Set Date Day
    if (airedText.startsWith('Tomorrow')) {
      airedDate.setDate(airedDate.getDate()+1)
      console.log("airedDate 2: ", airedDate)
    } else if (isRelativeDate) {
        // Convert Day ("Saturday") into Date (3 days in the future, so add 3 to airedDate)
        console.log("BEFOREHAND: ", airedText, airedDate, airedDate.getDay(), relativeDateIndex)
        const thisDay = airedDate.getDay()
        const addDays = (relativeDateIndex > thisDay) ? (relativeDateIndex - thisDay) : (7 - (relativeDateIndex - thisDay))
        airedDate.setDate(airedDate.getDate() + addDays)
        console.log("AFTER: ", airedDate)
    } else if (isFullDate) { // Example: Jul, 12 2022 || Jul 3 2022
      airedDate = new Date(`${airedText.substring(5, 11)} ${airedDate.getFullYear()}`)
      console.log("airedDate 3: ", airedDate)
      // console.log("airedDate 3b: ", airedDate.getHours())
      // console.log("airedDate 3c: ", airedDate.setHours(0))
      // console.log("airedDate 3d: ", airedDate.getHours())
      // const testDate = new Date(new Date().toUTCString().substring(0, 25))
      // console.log("testDate 1: ", testDate)
      // testDate.setHours(20)
      // console.log("testDate 2: ", testDate)
    }
  
    let timeHours = 0
    let timeMinutes = 0

    console.log("timeHours 1: ", timeHours)
    console.log("timeMinutes 1: ", timeMinutes)
  
    // TODO - move this check to a variable and find a good name for it
    if (isFullDate || isRelativeDate || airedText.startsWith('Tonight') || airedText.startsWith('Tomorrow')) {
        console.log("airedText: ", airedText)
        // airedText Options:
            // Tonight at 6:30PM on 65.5 WLJCDT5 (This TV)
            // Tomorrow at 12:00AM on 9.4 WBONLD4 (Retro Television Network)
        const timeText = airedText.substring(airedText.indexOf('at ') + 'at '.length, airedText.indexOf(' on'))
        const timeSplitIndex = timeText.indexOf(':')
        
        const timeHoursText = timeText.substring(0, timeSplitIndex)
        console.log("timeHoursText: ", timeHoursText)
        timeHours = (timeHoursText === '12' ? 0 : parseInt(timeHoursText)) + (timeText.substring(timeText.length - 2) === 'PM' ? 12 : 0)
        console.log("timeHours 2: ", timeHours)
        console.log("timeMinutes 2: ", timeMinutes, timeText.substring(timeSplitIndex+1, timeSplitIndex+3))
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
        console.log("timeHours 3: ", timeHours)
        console.log("timeMinutes 3: ", timeMinutes)
      } else {
        const mediaLengthMinutes = parseInt(mediaLength.substring(mediaLength.indexOf('hr ') + 'hr '.length, mediaLength.indexOf('min')))
        const mediaLengthHours = parseInt(mediaLength.substring(0, mediaLength.indexOf(' hr')))
        
        console.log("airedDate.getMinutes(): ", airedDate.getMinutes())
        console.log("mediaLengthMinutes: ", mediaLengthMinutes)
        console.log("relativeTimeMinutes: ", relativeTimeMinutes)
        timeMinutes = airedDate.getMinutes() - (mediaLengthMinutes - relativeTimeMinutes)
        timeHours = airedDate.getHours() - (mediaLengthHours - relativeTimeHours)
        console.log("timeHours 4: ", timeHours)
        console.log("timeMinutes 4: ", timeMinutes)
      }
    }
    console.log("airedDate 4: ", airedDate)
    console.log("timeHours Final: ", timeHours)
    console.log("timeMinutes Final: ", timeMinutes)
    airedDate.setHours(timeHours)
    console.log("airedDate 5: ", airedDate)
    airedDate.setMinutes(timeMinutes)
    console.log("airedDate 6: ", airedDate)
    airedDate.setSeconds(0)
    console.log("airedDate 7: ", airedDate)
    airedDate.setMilliseconds(0)
    console.log("airedDate 8: ", airedDate)
    // TODO - IF invalid date then just error instead of causing mongo error
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
      const { foundNewItem, finalItemList } = await grabCurrentScreenItems(page, allItems, mediaType)
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
      
      // Grab detailed page href
      const hrefBeginIndex = outHTMLText.indexOf('#!/server')
      const hrefPartial = outHTMLText.substring(hrefBeginIndex)
      const hrefEndIndex = hrefBeginIndex + hrefPartial.indexOf(`\" role=\"link`)
      const detailsHref = outHTMLText.substring(hrefBeginIndex, hrefEndIndex)
      const detailsLink = `https://app.plex.tv/desktop/${detailsHref}` // TODO - Consider saving just the detailsHref or even removing the word server. This saves a small amount of storage in the DB since the beginning of the value is identical. Is this worth doing?
      const matchingIndex = allItems.indexOf(detailsLink)
      if(matchingIndex === -1) {
        console.log("Link Details: ", detailsLink)
        finalItemList.push(detailsLink)
        foundNewItem = true
        // Save Item
        // TODO - Maybe convert to a promise all? These don't need done in sequential order.
        // TODO - This will fail a lot, MOST items will already exist? Perhaps only print error when it's not a duplicate error?
        await createMedia(detailsLink, mediaType).catch(err => console.log(`Error creating media in grabCurrentScreenItems: ${err}`))
      } 
    }
    return { foundNewItem, finalItemList }
}

// ERROR for Invalid date is still happening and we are NOT saving error value in mongo as a result
export const extractMediaDetails = async (page: any, pin: string): Promise<void> => {
    try {
      console.log("In extractMediaDetails")
      // Verify login - login fully if not already logged in
  
      if(page) {
        console.log("Page exists, retrieving raw items")
        // const rawItems = await retrieveRawItems(mediaType)
        // TODO - Test this and confirm it is an array and not an object with an array on it.
        const rawItemRecords = await findAllUnprocessedMedia()
        
        console.log("Looping through items")
        const maxItems = rawItemRecords?.length <= extractMediaDetailsLimit ? rawItemRecords?.length : extractMediaDetailsLimit
        for(let i = 0; i < maxItems; i++) {
            // Maybe Mark as undefined and declare a type? Mongo gets set with these empty string values, which is not great
            let title: string | undefined = undefined
            let year: string | undefined = undefined
            let length: string | undefined = undefined
            let description: string | undefined = undefined
            let genres: string[] | undefined = undefined, resolution: string | undefined = undefined, airData: any | undefined = undefined, extraDatas: any | undefined = undefined

            const currentItem = rawItemRecords[i]
            const currentDetailsLink = currentItem.detailsLink
            console.log("Loading Details: ", currentDetailsLink)
            // if (`https://app.plex.tv/desktop/${detailsHref}` == 'https://app.plex.tv/desktop/#!/server/208c0b35cc182ee6422cf4bec739bb416aeab26b/provider/tv.plex.providers.epg.cloud%3A4/details?key=%2Ftv.plex.providers.epg.cloud%3A4%2Fmetadata%2Fplex%253A%252F%252Fmovie%252F5fc68b591a65df002dd21794')
            // {
            //   console.log("**********************************")
            //   console.log("THIS HAD PREVIOUSLY FAILED")
            //   console.log("**********************************")
            // }
            await page.goto(currentDetailsLink)
            try {
                // TODO - are nested try catch blocks bad code? We have 3 here
                try {
                  await page.waitForSelector('div[data-testid="preplay-mainTitle"]', { timeout: pageTimeout })
                } catch (err) {
                  console.log("Details page didn't load")
                  await authenticatePlexUser(page, pin).catch(() => console.log("Failed entering PIN"))
                  await page.waitForSelector('div[data-testid="preplay-mainTitle"]', { timeout: pageTimeout })
                }
                
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
                        // const genreSpans = await valueDiv.$$('span[class*="PrePlayTagList-tagItem"')
                        console.log("Detail 4")
                        const rawGenres = await getTextContent(valueDiv)
                        genres = rawGenres.split(', ')
                        console.log("genres: ", genres)
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
                    console.log("**********************************")
                    console.log("ENCOUNTERED AN UNEXPECTED ERROR!!!")
                    console.log("**********************************")
                    // PIN page can appear on new tabs
                    
                    // throw new Error("STOP THINGS")
                    // TODO - Real Error -> Add ability to save error message
                    // await updateMedia(currentItem._id, {
                    //     error: true,
                    //     title,
                    //     year,
                    //     length,
                    //     description,
                    //     genres,
                    //     resolution,
                    //     airData,
                    //     extraDatas,
                    // })   
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

  // TODO - Getting errors when there is no problem, aka the page loads fine.