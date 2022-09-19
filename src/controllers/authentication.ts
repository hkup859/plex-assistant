import dotenv from 'dotenv'
const AuthenticationModel = require('../models/authentication')

// Allow pulling ENV variable from .env file
dotenv.config()

//Checking the crypto module
const crypto = require('crypto');
const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = crypto.scryptSync(process.env['ENCRYPTION_SECRET_KEY'], process.env['ENCRYPTION_KEY_SALT'], 32)
const iv = crypto.scryptSync(process.env['ENCRYPTION_IV'], process.env['ENCRYPTION_IV_SALT'], 16)

//Encrypting text
// TODO - Perhaps save IV once instead of for each object. We really only need the encryptedData
const encrypt = (text: string): any => {
   let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv)
   let encrypted = cipher.update(text)
   encrypted = Buffer.concat([encrypted, cipher.final()])
   return JSON.stringify({ iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') })
}

// Decrypting text
const decrypt = (encryptedData: string): string => {
  const encryptedDataObject = JSON.parse(encryptedData)
   let iv = Buffer.from(encryptedDataObject.iv, 'hex')
   let encryptedText = Buffer.from(encryptedDataObject.encryptedData, 'hex')
   let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv)
   let decrypted = decipher.update(encryptedText)
   decrypted = Buffer.concat([decrypted, decipher.final()])
   return decrypted.toString()
}

export const createAuthentication = async (email: string, password: string, pin?: string, profileUsername?: string): Promise<any> => {
  console.log("In authentication controller createAuthentication")
  const encryptedLogin = {
    email: encrypt(email),
    password: encrypt(password),
    pin: pin ? encrypt(pin) : undefined,
    profileUsername: profileUsername ? encrypt(profileUsername) : undefined,
  }
  return AuthenticationModel.createAuthentication(encryptedLogin)
}

export const updateAuthentication = async (email: string, authenticationUpdateObject: any): Promise<any> => {
  console.log("In authentication controller updateAuthentication")
  return AuthenticationModel.updateAuthentication(encrypt(email), authenticationUpdateObject)
}

export const findAuthenticationByEmail = async (email: string) => {
  const encryptedAuthentication = await AuthenticationModel.findAuthenticationByEmail(encrypt(email))
  if (encryptedAuthentication) {
    return {
      email,
      password: decrypt(encryptedAuthentication.password),
      pin: decrypt(encryptedAuthentication.pin),
      profileUsername: decrypt(encryptedAuthentication.profileUsername)
    }
  } else {
    return "Authentication not found"
  }
  
}