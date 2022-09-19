import dotenv from 'dotenv'

// Allow pulling ENV variable from .env file
dotenv.config()

const pageTimeout = process.env["PAGE_TIMEOUT"]
const extractMediaDetailsLimit = process.env['EXTRACT_MEDIA_DETAILS_LIMIT'] || 25
const dvrSections = ["Episodes", "Movies", "Shows", "Sports", "News"]

import { findAuthenticationByEmail } from './authentication'
import { createMedia, findAllUnprocessedMedia, updateMedia} from './media'
import { createAirDate } from './utils'


// Takes a browser & email (plex authentication)
// Creates a new plex page and either logs in from scratch or via pin.
export const logInToPlex = async (browser: any, email: string): Promise<any> => { // TODO use page & browser types
    console.log("In logInToPlex")
    let page
    try {
      console.log("Pulling Login Credentials")
      const loginCredentials = await findAuthenticationByEmail(email)

      if (loginCredentials === 'Authentication not found') throw new Error(`Login credentials for email ${email} does not exist`)
  
      console.log("Creating new Page")
      page = await browser.newPage();
      await page.setViewport({width: 1920, height: 1080})
  
      // Load Plex
      await page.goto('https://www.plex.tv/sign-in/?forward=https://www.plex.tv/')
  
      // Wait for the page to load
      console.log("Waiting for iFrame")
      const frameName = 'fedauth-iFrame'
      let frame
      try {
        frame = await page.waitForFrame(async (frame: any) => { return frame.name() === frameName})
      } catch(err) {
        console.log("Failed to wait for iFrame. Searching existing frames now")
        const frames = await page.frames()
        try {
          frame = frames.find((frame: any) => frame.name() === frameName)
        } catch(err) {
          console.log(`Failed to wait for iFrame - second try: ${err}`)
        }
      }

      // Begin sign in process
      try {
        console.log("Waiting for sign in option")
        await frame.waitForSelector('[data-testid=signIn--email]', {timeout: pageTimeout}).catch((err: { message: any }) => console.log(`Email Sign In Option Error: ${err.message}`)) // TODO - should this be caught?
        await frame.waitForTimeout(5000) // TODO - resolved error waiting for #email by waiting just a little longer for the page to load enough to actually click the button. Need to implement this everywhere as a precaution. Alternatively could use troubleshooting/retry logic to fix it.
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
        const signInButton = '[data-uid=id-4]' // TODO - Update this to a more defined metric
        await frame.click(signInButton)
      } catch(err) {
        console.log(`Failed to enter in email & or password: ${err}`)
      }

      console.log("First Login Completed")

      // Wait for login confirmation
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
  await page.waitForSelector('.admin-icon', {timeout: pageTimeout}) // There will always be an admin profile, even if it's not the profile we will be using
  const profileOptions = await page.$$('div[class="username"]')
  const profile = await findPropertyByTextContent(profileOptions, profileUsername)
  await profile.click()
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
    for(let i = 0; i < properties.length; i++) {
      const property = properties[i]
      const propertyTextContent = await getTextContent(property)
      if (Array.isArray(searchText)) {
        if (matchAll) {
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

export const extractMediaDetails = async (page: any, pin: string): Promise<void> => {
    try {
      console.log("In extractMediaDetails")  
      if(page) {
        console.log("Page exists, retrieving raw items")
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
                const titleSpan = await titleContainer.$('span')
                title = await getTextContent(titleSpan)
                console.log("TITLE: ", title)
    
                // Grab Year
                const YearContainer = await page.$('div[data-testid="preplay-secondTitle"]')
                year = await getTextContent(YearContainer)
                console.log("YEAR: ", year)
    
                // Grab Length (EX: '1 hr 20 min')
                const lengthContainer = await page.$('div[data-testid="preplay-thirdTitle"]')
                const lengthSpan = await lengthContainer.$('span')
                length = await getTextContent(lengthSpan)
                console.log("LENGTH: ", length)
    
                // Grab Description
                const descriptionContainer = await page.$('div[class*="PrePlaySummary-summary"]')
                const descriptionDiv = await descriptionContainer.$('div[class*="Measure-container"]')
                description = await getTextContent(descriptionDiv)
                console.log("description: ", description)
    
                // Grab extra data items (genre, resolution, airtime, etc)
                // TODO - Move to a separate function?
                const detailContainers = await page.$$('div[class*="PrePlayDetailsGroupItem-groupItem"]')
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
                        // TODO? - This whole section doesn't work as expected. ValueDiv is not finding the moreButton and even though genreSpans returns it doesn't let you call getProperty because they are elementHandles instead of JSHandles
                        const buttonOptions = await valueDiv.$$('button[class*="PrePlayTagListLink-tagsListLink"]')
                        const moreButton = await findPropertyByTextContent(buttonOptions, ['And ', ' More'], true)
                        if (moreButton) {
                            await moreButton.click()
                        }
                        const rawGenres = await getTextContent(valueDiv)
                        genres = rawGenres.split(', ')
                        console.log("genres: ", genres)
                        break
                        case 'Video':
                        resolution = await getTextContent(valueDiv)
                        break
                        case 'Airs' || 'Airing':
                        const airedText = await getTextContent(valueDiv)
                        const airedNetwork = airedText.substring(airedText.indexOf('on '))
                        airData = {
                            date: createAirDate(airedText, length),
                            network: airedNetwork
                        }
                        break
                        default:
                        console.log("Unknown Detail Detected")
                        const innerHTML = await valueDiv.$eval("*", (element) => {
                            return element.innerHTML
                        })
                        extraDatas[labelValue] = innerHTML
                        break
                    }
                }
                
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
                console.log("Error Extracting Data: ", err)
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