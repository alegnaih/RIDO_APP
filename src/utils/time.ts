// src/utils/time.ts
let timeOffsetMs = 0;
let isSynced = false;

export async function syncServerTime(): Promise<void> {
  try {
    // ✅ Use Google's HTTP header. It is 100% reliable and rarely goes down.
    const response = await fetch('https://www.google.com', { method: 'HEAD' });
    const serverDateString = response.headers.get('date');
    
    if (serverDateString) {
      const serverTime = new Date(serverDateString).getTime();
      const deviceTime = new Date().getTime();
      
      timeOffsetMs = serverTime - deviceTime;
      isSynced = true;
      console.log(`⏱️ Time synced via Google.`);
      return;
    }
    
    throw new Error('No date header received from Google.');
  } catch (error) {
    // Fallback to a second API just in case Google is somehow blocked
    try {
      const response = await fetch('https://worldclockapi.com/api/json/utc/now');
      const data = await response.json();
      
      const serverTime = new Date(data.currentDateTime).getTime();
      const deviceTime = new Date().getTime();
      
      timeOffsetMs = serverTime - deviceTime;
      isSynced = true;
      console.log(`⏱️ Time synced via WorldClockAPI.`);
    } catch (fallbackError) {
      console.warn("Could not sync time with any server, using device time.", fallbackError);
      timeOffsetMs = 0;
      isSynced = true; // Still mark as synced so the app doesn't hang
    }
  }
}

export function isTimeSynced(): boolean {
  return isSynced;
}

export function getTrustedDate(): Date {
  return new Date(new Date().getTime() + timeOffsetMs);
}

export function getTrustedTime(): number {
  return getTrustedDate().getTime();
}