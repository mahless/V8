export const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwFfRhRgYTeI-5214YHFGqe-5xN4s6kqu6Sh1yF0f2UTfv_gLu1Ho99_3c8Op0N84A/exec';

export async function fetchAllData() {
  try {
    const url = new URL(GOOGLE_SHEETS_API_URL);
    url.searchParams.append('t', Date.now().toString());

    const response = await fetch(url.toString(), {
      redirect: "follow",
      cache: "no-store",
    });
    if (!response.ok) throw new Error('Network response was not ok');
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    throw error;
  }
}

export async function sendAction(action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC_PROCESS_SALE' | 'RPC_CANCEL_SALE', payload: any) {
  try {
    const response = await fetch(GOOGLE_SHEETS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Google Apps script requires text/plain for CORS
      },
      body: JSON.stringify({
        action,
        ...payload
      }),
      redirect: 'follow',
    });

    if (!response.ok) throw new Error('Network response was not ok');
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Unknown error from Sheets API');
    }
    return result;
  } catch (error) {
    console.error(`Error executing ${action} on Google Sheets:`, error);
    throw error;
  }
}
