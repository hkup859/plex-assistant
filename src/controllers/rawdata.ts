import fs from 'fs' 

const pageTimeout = process.env["PAGE_TIMEOUT"]
const dvrSections = ["Episodes", "Movies", "Shows", "Sports", "News"]

const crypto = require('crypto');
const algorithm = 'aes-256-cbc'; //Using AES encryption
const secretKey = process.env['ENCRYPTION_SECRET_KEY']

//Encrypt Data
export function encrypt(text) {
  let cipher = crypto.createCipher(algorithm, secretKey);
  let encryptedString = cipher.update(text, 'utf8', 'hex')
  encryptedString += cipher.final('hex');
  return encryptedString
}

// Decrypt Data
export function decrypt(text) {
  let decipher = crypto.createDecipher(algorithm, secretKey);
  let decryptedString = decipher.update(text, 'hex', 'utf8')
  decryptedString += decipher.final('utf8');
  return decryptedString
}

// Access Logins
export const saveLogin = async (label, email, password, pin) => {
  console.log("In saveLogin")
  try {
    const encryptedLogin = {
      email: encrypt(email),
      password: encrypt(password),
      pin: pin ? encrypt(pin) : undefined
    }

    // TODO - check for file first and provide error or something
    // const savePath = `../../data/logins/${label}.json` // Should work, why is fs starting at root project level?????
    const savePath = `./data/logins/${label}.json` // THIS SHOULDN'T WORK!!!????
    fs.writeFileSync(savePath, JSON.stringify(encryptedLogin))
    return `Successfully saved ${label} login`
  } catch(err) {
    console.log("Failed to save login")
    throw new Error(`Failed to save login: ${label}`)
  }
  
}

export const retrieveLogin = async (label) => { // Add authentication to retrieve data. Maybe with a quick password saved alongside the data? Or just general api authentication.
  console.log("In retrieveLogin")
  try {
    // const savePath = `../../data/logins/${label}.json` // Should work, why is fs starting at root project level?????
    const savePath = `./data/logins/${label}.json` // THIS SHOULDN'T WORK!!!????
    const encryptedLogin = fs.readFileSync(savePath)
    const parsedLogin = JSON.parse(encryptedLogin.toString())
    const decryptedLogin = {
      email: decrypt(parsedLogin.email),
      password: decrypt(parsedLogin.password),
      pin: parsedLogin.pin ? decrypt(parsedLogin.pin) : undefined
    }
    return decryptedLogin
  } catch(err) {
    console.log("Failed to retrieve login. It may not exist")
    throw new Error(`Failed to retrieve login. It may not exist. Raw Error: ${err}`)
  }
}

export const logInToPlex = async (browser: any, userLabel: string): Promise<any> => { // TODO use page & browser types
    console.log("In logInToPlex")

    console.log("Pulling Login Credentials")
    const loginCredentials = await retrieveLogin(userLabel)

    console.log("Creating new Page")
    const page = await browser.newPage();
    await page.setViewport({width: 1920, height: 1080})

    // Load Plex
    await page.goto('https://app.plex.tv/desktop/#!/')

    // Close streaming popup if it exists
    try {
      console.log("Closing streaming popup if it exists")
      await page.waitForSelector('[aria-label="Close Streaming Services modal"]', {timeout: pageTimeout})
      await page.click('[aria-label="Close Streaming Services modal"]')
    } catch (err) {
      console.log("Caught Streaming Popup Error: ", err.message)
    }

    // Click sign in button on main page
    console.log("Locating Sign In")
    await page.waitForSelector('[data-testid=signInButton]', {timeout: pageTimeout}).catch(err => console.log(`Sign In Button Error: ${err.message}`)) // TODO - should this be caught?
    // Uneeded? - // await page.waitForFrame(async (frame) => { return frame.name() === 'iFrameResizer0'}, {timeout: 30000}).catch(err => console.log(`iFrame Error:: ${err.message}`))
    await page.click('[data-testid=signInButton]').catch(err => console.log("Sign In Button Error 2: ", err.message)) // TODO - should this be caught?

    // Complete first login button
    console.log("Entering Credentials")
    console.log("Waiting for iFrame")
    const frame = await page.waitForFrame(async (frame) => { return frame.name() === 'iFrameResizer0'})
    console.log("Waiting for sign in option")
    await frame.waitForSelector('[data-testid=signIn--email]', {timeout: pageTimeout}).catch(err => console.log(`Email Sign In Option Error: ${err.message}`)) // TODO - should this be caught?
    await frame.click('[data-testid=signIn--email]')
    console.log("Waiting for email textbox")
    await frame.waitForSelector('#email')
    await frame.type('#email', loginCredentials.email)
    await frame.type('#password', loginCredentials.password)
    console.log("Submitting Credentials")
    await frame.click('[data-uid=id-7]') // TODO - Update this to a more defined metric

    // Complete second login screen
    console.log("Selecting User Profile")
    await page.waitForSelector('.admin-icon')
    await page.click('.admin-icon')
    
    if (loginCredentials.pin) {
      console.log("PIN Detected. Entering PIN Data.")
      // await page.waitForSelector('.pin-digit-container') // Is this redundant?
      await page.waitForSelector('.pin-digit,current', {timeout: pageTimeout}).catch(err => console.log(`Pin Selector Error: ${err.message}`)) // TODO - should this be caught?
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

const getTextContent = async (property: any) => { // TODO - use property type
  return await (await property.getProperty('textContent')).jsonValue()
}

// TODO - rename? recordScreenItems?
export const grabAndSaveScreenItems = async (page: any, mediaType: string): Promise<void> => { // TODO - use page type, mediaType should be enum of dvrSections
  console.log("In grabAndSaveScreenItems")
  const screenItems = await grabAllScreenItems(page)
  
  console.log("Saving grabbed items")
  await saveRawItems(screenItems, mediaType)
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

const findPropertyByTextContent = async (properties: any, searchText: any): Promise<any>  => { // TODO - use properties & searchText types
  // for await (property of properties) {
  for(let i = 0; i < properties.length; i++) {
    const property = properties[i]
    const propertyTextContent = await getTextContent(property)
    if (Array.isArray(searchText)) {
      if (searchText.includes(propertyTextContent)) {
        return property
      }
    } else {
      if (searchText === propertyTextContent) {
        return property
      }
    }
  }
}

const grabAllScreenItems = async (page): Promise<any[]> => { // TODO - use page type
  let noNewItemsCount = 0
  let allItems = []

  // Align mouse & focus on page
  const mouse = await page.mouse
  const [mouseX, mouseY] = [300, 540]
  await mouse.click(mouseX, mouseY)

  while (noNewItemsCount < 10) {
    await page.waitForTimeout(1000)
    const { foundNewItem, finalItemList }= await grabCurrentScreenItems(page, allItems)
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

const grabCurrentScreenItems = async (page, allItems): Promise<any> => { // TODO - use page & allItems types
  const finalItemList = []
  const currentItems = await page.$$('[data-testid=cellItem]')
  let foundNewItem = false

  // Example of forEach that fails to execute fully before moving on. It's due to using await within the for each. Couldn't find a way to fix it.
  // currentItems.forEach(async function(item) {
  //   const outerHTMLElement = await item.getProperty('outerHTML')
  //   const outHTMLText = await (outerHTMLElement).jsonValue()
  //   const matchingIndex = allItems.indexOf(outHTMLText)
  //   if(matchingIndex === -1) {
  //     console.log("Found NEW")
  //     // allItems.push(outHTMLText)
  //     finalItemList.push(outHTMLText)
  //     foundNewItem = true
  //   } 
  //   // else {
  //   //   console.log("Duplicate Found")
  //   // }
    
  // })
  
  // for await (item of currentItems) {
  for(let i = 0; i < currentItems.length; i++) {
    const item = currentItems[i]
    const outerHTMLElement = await item.getProperty('outerHTML')
    const outHTMLText = await (outerHTMLElement).jsonValue()
    const matchingIndex = allItems.indexOf(outHTMLText)
    if(matchingIndex === -1) {
      finalItemList.push(outHTMLText)
      foundNewItem = true
    } 
  }
  return { foundNewItem, finalItemList }
}

// FS CRUD
const saveRawItems = async (items, type): Promise<void> => { // TODO - use items & type types
  console.log("Saving Raw Items")
  const savePath = `../../data/rawdata/${type}.json`
  
  // If this rawdata type exists, add non-duplicate items to file
  try {
    const rawDataFileBuffer = fs.readFileSync(savePath)
    // Grab file records
    const rawDataFile = JSON.parse(rawDataFileBuffer.toString())
    const rawDataRecords = rawDataFile.data
    const updatedRawDataRecords = JSON.parse(JSON.stringify(rawDataRecords))

    // Add non-duplicate items to list
    for(let i = 0; i < items.length; i++) {
      if(!rawDataRecords.includes(items[i])) {
        updatedRawDataRecords.push(items[i])
      }
    }

    // Save updated list
    const fullUpdatedFile = {
      type,
      data: updatedRawDataRecords,
      updatedAt: new Date()
    }
    fs.writeFileSync(savePath, JSON.stringify(fullUpdatedFile))
  } catch (err) {
    console.log("Error Saving Data: ", err.message)
    
    // Save list
    const fullFile = {
      type,
      data: items,
      updatedAt: new Date()
    }
    fs.writeFileSync(savePath, JSON.stringify(fullFile))
  }
}
