import fs from 'fs'  
import dotenv from 'dotenv'

// Allow pulling ENV variable from .env file
dotenv.config()

//Checking the crypto module
const crypto = require('crypto');
const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = crypto.scryptSync(process.env['ENCRYPTION_SECRET_KEY'], process.env['ENCRYPTION_KEY_SALT'], 32)
const iv = crypto.scryptSync(process.env['ENCRYPTION_IV'], process.env['ENCRYPTION_IV_SALT'], 16)

//Encrypting text
const encrypt = (text: string): any => {
   let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv); // Does key need to be buffer?
   let encrypted = cipher.update(text);
   encrypted = Buffer.concat([encrypted, cipher.final()]);
   return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

// Decrypting text
const decrypt = (encryptedData: any): string => {
   let iv = Buffer.from(encryptedData.iv, 'hex');
   let encryptedText = Buffer.from(encryptedData.encryptedData, 'hex');
   let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv); // Does key need to be buffer?
   let decrypted = decipher.update(encryptedText);
   decrypted = Buffer.concat([decrypted, decipher.final()]);
   return decrypted.toString();
}

// Access Logins
export const saveLogin = async (label: string, email: string, password: string, pin: string): Promise<string> => {
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

export const retrieveLogin = async (label: string): Promise<any> => { // Add authentication to retrieve data. Maybe with a quick password saved alongside the data? Or just general api authentication.
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