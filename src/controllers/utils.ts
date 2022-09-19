const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', "Saturday"]
const weekDaysAbbreviations = weekDays.map(x => x.substring(0, 3))

// 70 min left
// Starting in 24 min on 9.1 WBONLD (AMG TV)
// Tonight at 6:30PM on 65.5 WLJCDT5 (This TV)
// Tomorrow at 12:00AM on 9.4 WBONLD4 (Retro Television Network)
// Saturday at 12:00PM on 65.5 WLJCDT5 (This TV) 2 hr 30 min
// Sun, Jul 3 at 12:00AM on 9.4 WBONLD4 (Retro Television Network)
// TODO - Dates appear to work, but are stored in timezone specific format. This conflicts with mongo which only uses UTC. Therefore we need to convert all dates to UTC.
// NOTE: This function has bugs for certain dates and is under active development. It is expected to fail and thus we provide a default date set far in the future to identify those failures, but allow processing to continue.
export const createAirDate = (airedText: string, mediaLength: string): Date => {
    try {
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
        return !isNaN(airedDate.getTime()) ? airedDate : new Date("2200")
    } catch (err) {
        console.log("createAiredDate failed: ", airedText, mediaLength, err)
        return new Date("2200")
    }
  }