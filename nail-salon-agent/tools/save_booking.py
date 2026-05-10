import gspread
from oauth2client.service_account import ServiceAccountCredentials

def save_booking(date, time, name, service, phone, source):
    scope = ["https://spreadsheets.google.com/feeds",
             "https://www.googleapis.com/auth/drive"]

    creds = ServiceAccountCredentials.from_json_keyfile_name(
        "google-credentials.json", scope
    )
    client = gspread.authorize(creds)

    sheet = client.open("NailBookings").sheet1
    sheet.append_row([date, time, name, service, phone, source])
    print("Booking saved to Google Sheets")