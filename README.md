# Jarona
An app designed to help you stay in touch with friends. You can add people, store bond strength, and generate who to reach out to each day with weighted probabilities based on closeness.

## Features

- Profile-based login with username and password
- Persistent server-side storage so your data can be shared across devices
- People list with required and optional fields
- Add and edit flows for each person
- Sort by name, bond, location, or when you met
- Daily weighted generation with cooldown rules
- Optional background auto-generation on your own computer
- Responsive layout that works on mobile Safari and Chrome

## What You Need

- A computer with Node.js 20 or newer installed
- An iPhone if you want to use it on mobile
- Both devices on the same Wi-Fi network if you want to open it on your iPhone from your computer

## First-Time Setup

1. Install Node.js if you do not already have it.
   Download it from [https://nodejs.org](https://nodejs.org).
2. Open Terminal on your computer.
3. Go into this project folder:

```bash
cd /Users/ahameed/Documents/GitHub/Jarona
```

4. Start the website:

```bash
npm start
```

5. Keep that Terminal window open.
   The website only stays running while this command is running.

## One-Click Launchers

If you want easier startup scripts, use the files in:

```text
launchers/
```

Available launchers:

- [run-jarona-mac.command](/Users/ahameed/Documents/GitHub/Jarona/launchers/run-jarona-mac.command)
- [run-jarona-mac-iphone.command](/Users/ahameed/Documents/GitHub/Jarona/launchers/run-jarona-mac-iphone.command)
- [run-jarona-linux.sh](/Users/ahameed/Documents/GitHub/Jarona/launchers/run-jarona-linux.sh)
- [run-jarona-linux-iphone.sh](/Users/ahameed/Documents/GitHub/Jarona/launchers/run-jarona-linux-iphone.sh)
- [run-jarona-windows.bat](/Users/ahameed/Documents/GitHub/Jarona/launchers/run-jarona-windows.bat)
- [run-jarona-windows-iphone.bat](/Users/ahameed/Documents/GitHub/Jarona/launchers/run-jarona-windows-iphone.bat)

Background auto-generation installers:

- [install-jarona-macos-auto-generation.command](/Users/ahameed/Documents/GitHub/Jarona/automation/install-jarona-macos-auto-generation.command)
- [install-jarona-linux-auto-generation.sh](/Users/ahameed/Documents/GitHub/Jarona/automation/install-jarona-linux-auto-generation.sh)
- [install-jarona-windows-auto-generation.bat](/Users/ahameed/Documents/GitHub/Jarona/automation/install-jarona-windows-auto-generation.bat)

What they do:

- Install dependencies if needed
- Start Jarona normally on your computer
- Or start Jarona in iPhone-friendly mode with `HOST=0.0.0.0`
- Or install a background scheduler that checks every hour and auto-generates once the profile reaches its allowed time

## How To Open It On Your Computer

1. Open Terminal.
2. Go into the project folder:

```bash
cd /Users/ahameed/Documents/GitHub/Jarona
```

3. Start the website:

```bash
npm start
```

4. Open your web browser.
5. Go to:

```text
http://127.0.0.1:3000
```

6. The Jarona website should load.

## How To Open It On A Windows PC

1. Install Node.js from [https://nodejs.org](https://nodejs.org).
2. Open `Command Prompt`.
3. Go into the Jarona project folder:

```bat
cd C:\Users\YOUR-WINDOWS-USERNAME\Documents\GitHub\Jarona
```

4. Start Jarona:

```bat
npm start
```

5. Open your browser on that Windows PC.
6. Go to:

```text
http://127.0.0.1:3000
```

If you prefer one click on Windows, double-click:

- [run-jarona-windows.bat](/Users/ahameed/Documents/GitHub/Jarona/launchers/run-jarona-windows.bat)

## How To Open It On Your iPhone

These steps let you run the website on your computer and open it from your iPhone.

### Step 1: Make Sure Both Devices Are On The Same Wi-Fi

1. Connect your computer to your Wi-Fi.
2. Connect your iPhone to that exact same Wi-Fi network.

### Step 2: Start The Website So Other Devices Can Reach It

1. Open Terminal on your computer.
2. Go into the project folder:

```bash
cd /Users/ahameed/Documents/GitHub/Jarona
```

3. Start the website with this command:

```bash
HOST=0.0.0.0 npm start
```

4. Keep Terminal open while you use the website.

### Step 3: Find Your Computer's Local IP Address

You need your computer's local network IP address so your iPhone knows where to connect.

On Mac:

1. Open `System Settings`
2. Click `Wi-Fi`
3. Click the current network
4. Look for your local IP address

It will usually look something like:

```text
192.168.1.25
```

### Step 4: Open The Website On Your iPhone

1. Open Safari or Chrome on your iPhone.
2. In the address bar, type your computer's IP address followed by `:3000`.

Example:

```text
http://192.168.1.25:3000
```

3. Press Go.
4. The Jarona website should load on your iPhone.

### If Your Main Computer Is Windows

1. On the Windows PC, start Jarona with:

```bat
cd C:\Users\YOUR-WINDOWS-USERNAME\Documents\GitHub\Jarona
launchers\run-jarona-windows-iphone.bat
```

Or double-click:

- [run-jarona-windows-iphone.bat](/Users/ahameed/Documents/GitHub/Jarona/launchers/run-jarona-windows-iphone.bat)

2. On the Windows PC, open `Command Prompt`.
3. Type:

```bat
ipconfig
```

4. Look for `IPv4 Address` under your active Wi-Fi adapter.
5. It will usually look like:

```text
192.168.1.25
```

6. On your iPhone, open Safari or Chrome.
7. Go to:

```text
http://192.168.1.25:3000
```

### If It Does Not Open On iPhone

Check these things:

1. Make sure the Terminal on your computer is still running `HOST=0.0.0.0 npm start`
2. Make sure your computer and iPhone are on the same Wi-Fi
3. Make sure you typed the IP address correctly
4. Try refreshing the page on your iPhone
5. If your Mac firewall blocks incoming connections, allow Node.js when prompted

## How To Use The Website

### Step 1: Open The Site

1. Open the site on your computer or iPhone using the steps above.

### Step 2: Create Your First Profile

1. Look at the top right of the page.
2. Press `Create Profile`.
3. Enter a username.
4. Enter a password.
5. Press the button to finish creating the profile.
6. You are now logged into that profile.

Your profile stores:

- Your people list
- Your generator settings
- Your daily generated results

### Step 3: Add A Person

1. On the left side of the page, find the `+` button near the top of the list.
2. Press it.
3. Fill in the fields:
   - `First Name / Username` is required
   - `Bond` is required
   - `Last Name` is optional
   - `Location Based In` is optional
   - `When did we meet?` is optional
4. Set the bond using the slider or by typing a number from `1` to `10`.
5. Press `Save Person`.

### Step 4: Edit A Person Later

1. Find that person in the left-side list.
2. Press the pencil icon on their card.
3. Change any values you want.
4. Press `Save Person`.

### Step 5: Sort Your People List

1. Above the people list, find the sorting controls.
2. Choose a field such as:
   - First Name
   - Last Name
   - Bond
   - Location
   - When We Met
3. Choose `Ascending` or `Descending`.
4. The list updates automatically.

### Step 6: Change Generator Settings

On the right side of the page:

1. Set `People selected each day`
   - You can drag the slider
   - Or type a number from `1` to `10`
2. Set `Day cooldown before repeat`
   - You can drag the slider
   - Or type a number from `0` to `30`
3. Press `Save Settings`

What these mean:

- `People selected each day` = how many people Jarona tries to choose today
- `Day cooldown before repeat` = how many days must pass before the same person can be chosen again

### Step 7: Generate Today's People

1. Press the `Generate` button.
2. Jarona will pick people from your list.
3. Higher bond values have higher chances of being selected.
4. The selected names appear in large text with a reminder to reach out.

### Step 8: Understand The Daily Limit

1. You can only generate once per day for each profile.
2. If you press `Generate` again on the same day, the website will tell you that today's people were already generated.
3. Come back the next day and generate again.

### Step 9: Switch Profiles

1. At the top right, use the profile dropdown to choose a profile.
2. Press `Switch`.
3. Log in with that profile's correct username and password.

### Step 10: Log Out

1. Press `Log Out` in the top right.
2. Your data stays saved on the server.
3. You can log back in later from the same device or a different device.

## How Saving Works

- Your data is stored in `data/store.json`
- That includes profiles, people, settings, and daily generation history
- This file is ignored by git by default
- If the server is running on one computer, any device that opens that same server can access the same saved data after logging in

## Sharing Profiles Across Devices

Jarona profiles are already shared across devices if all of those devices are opening the same running Jarona server.

Examples:

- If Jarona is running on your Mac, your iPhone can use the same profiles by opening your Mac's Jarona address on the same Wi-Fi
- If Jarona is running on your Windows PC, your iPhone can use the same profiles by opening your Windows PC's Jarona address on the same Wi-Fi
- If Jarona is running on one computer, a second computer on the same network can also open it in a browser and use the same profiles after logging in

Important detail:

- If you start separate copies of Jarona on different machines, they do not automatically sync with each other
- The shared data lives in that machine's `data/store.json`
- If you want to move your profiles from one computer to another, copy `data/store.json` from the old machine into the same Jarona folder on the new machine before starting Jarona there

## Important Notes

- If you close the browser tab, your saved data does not disappear
- If you stop the server, the site goes offline until you run `npm start` again
- If you install the background scheduler below, Jarona can still auto-generate daily people and update Google Calendar even when the website is not open in your browser
- The computer still must be turned on and awake for background auto-generation to run
- If you want to use this from anywhere, not just your home Wi-Fi, the next step would be deploying it to a real web host

## Background Auto-Generation On Your Own Computer

This section is for the case where you want Jarona to keep doing the daily generation and Google Calendar update even when the Jarona website is not open in your browser.

What this does:

- It runs a small background check once every hour on your own machine
- Once a profile reaches its auto-generate time, Jarona generates that day's people if it has not already done so
- If Google Calendar is connected for that profile, Jarona also creates or updates that day's Google Calendar event automatically

What this does not do:

- It does not run while your computer is off
- It does not run while your computer is asleep
- It does not replace the Jarona website server itself

### Manual Test Command First

Before you install the background scheduler, you can test the command manually.

1. Open Terminal on Mac or Linux, or Command Prompt on Windows.
2. Go to the Jarona project folder:

```bash
cd /Users/ahameed/Documents/GitHub/Jarona
```

3. Run:

```bash
npm run run-scheduled
```

4. Jarona will print one line per profile.
5. If the profile is not due yet, it will say it was skipped.
6. If the profile is due and ready, it will generate that day's people and sync Google Calendar if connected.

### Turn It On For Mac

1. Open Terminal.
2. Go to the project folder:

```bash
cd /Users/ahameed/Documents/GitHub/Jarona
```

3. Make the installer executable:

```bash
chmod +x automation/install-jarona-macos-auto-generation.command
```

4. Run the installer:

```bash
./automation/install-jarona-macos-auto-generation.command
```

5. macOS will install a LaunchAgent named `com.jarona.autogenerate`.
6. From then on, your Mac will check once every hour and also check again when you log in.
7. The log file will be written here:

```text
/Users/ahameed/Documents/GitHub/Jarona/data/jarona-scheduler.log
```

### Turn It On For Linux

1. Open Terminal.
2. Go to the project folder:

```bash
cd /Users/ahameed/Documents/GitHub/Jarona
```

3. Make the installer executable:

```bash
chmod +x automation/install-jarona-linux-auto-generation.sh
```

4. Run the installer:

```bash
./automation/install-jarona-linux-auto-generation.sh
```

5. This adds a cron job that checks Jarona once every hour.
6. The log file will be written here:

```text
/Users/ahameed/Documents/GitHub/Jarona/data/jarona-scheduler.log
```

### Turn It On For Windows

1. Open File Explorer.
2. Go to:

```text
C:\Users\ahameed\Documents\GitHub\Jarona\automation
```

3. Double-click:

```text
install-jarona-windows-auto-generation.bat
```

4. If Windows asks for permission, allow it.
5. The installer will create two Scheduled Tasks:
   - `Jarona Auto Generate Hourly`
   - `Jarona Auto Generate On Login`
6. After that, Windows will check Jarona every hour and once right after you sign in.

### How The Background Schedule Works

- Jarona checks every hour
- It only generates if the profile has reached its allowed time
- The website starts with a default auto-generate time of `12:00 PM`
- If the machine misses the exact minute, Jarona will catch up on the next hourly check after that
- The Google Calendar event uses whatever start and end times you save in Jarona's Generator settings

### How To Verify It Worked

1. Make sure your Jarona profile is logged in at least once and already has people added.
2. Make sure Google Calendar is connected if you want automatic calendar updates.
3. Run this command once:

```bash
cd /Users/ahameed/Documents/GitHub/Jarona
npm run run-scheduled
```

4. Open:

```text
data/jarona-scheduler.log
```

5. Look for lines that start with either:
   - `[generated]`
   - `[skipped]`

If you see `[generated]`, that means the background command completed a daily generation successfully.

## Google Calendar Integration

Jarona now supports a full Google OAuth + Google Calendar API integration for local use.

What it does:

- You connect your Google account once
- Jarona creates a separate calendar named `Jarona`
- When you generate people for the day, Jarona creates or updates that day's event inside that separate Jarona calendar
- You can open that calendar directly from the website

For normal personal use, this is typically free within Google's standard API quotas.

### Full Start-To-Finish Setup

### Step 1: Open Google Cloud Console

1. Open this link:

[https://console.cloud.google.com/](https://console.cloud.google.com/)

2. Sign in with the Google account you want Jarona to use.
3. At the top of the page, click the project dropdown.
4. Click `New Project`.
5. In `Project name`, type something like:

```text
Jarona Calendar
```

6. Click `Create`.
7. Wait for Google Cloud to finish creating the project.
8. Make sure that new project is selected at the top of the page.

### Step 2: Enable The Google Calendar API

1. Open this link while your new project is selected:

[https://console.cloud.google.com/apis/library/calendar-json.googleapis.com](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)

2. Click the `Enable` button.
3. Wait until the API is enabled.

### Step 3: Set Up The OAuth Consent Screen

1. Open this page:

[https://console.cloud.google.com/auth/overview](https://console.cloud.google.com/auth/overview)

2. Click `Get started` if Google shows it.
3. In `App name`, type:

```text
Jarona
```

4. In `User support email`, choose your own Gmail address.
5. Click `Next`.
6. For audience/user type, choose the external option for personal use if Google asks.
7. Click `Next`.
8. Add your email address as the developer contact email.
9. Click `Next`.
10. Review the information.
11. Click `Create`.

If Google shows a `Test users` section after that:

1. Open the `Audience` or `Test users` area.
2. Click `Add users`.
3. Add the Gmail address you want to use with Jarona.
4. Save it.

### Step 4: Create OAuth Credentials

1. Open this page:

[https://console.cloud.google.com/auth/clients](https://console.cloud.google.com/auth/clients)

2. Click `Create client`.
3. For application type, choose:

```text
Web application
```

4. In the name field, type:

```text
Jarona Local
```

### Step 5: Add The Exact Redirect URI

If you will connect Google Calendar from the computer running Jarona, use:

```text
http://127.0.0.1:3000/api/google/callback
```

If you will finish the Google login flow from your iPhone instead, use your computer's LAN address instead, for example:

```text
http://192.168.1.25:3000/api/google/callback
```

Now add it:

1. In the `Authorized redirect URIs` section, click `Add URI`.
2. Paste one of the exact values above.
3. Double-check that it matches exactly.
4. Click `Create`.

### Step 6: Copy Your Google Credentials

After the OAuth client is created:

1. Google will show your `Client ID`
2. Google will show your `Client secret`
3. Copy both of them somewhere temporarily

If the popup closes:

1. Go back to [https://console.cloud.google.com/auth/clients](https://console.cloud.google.com/auth/clients)
2. Click your new `Jarona Local` client
3. On the client details page, look for the section labeled `Client ID for Web application`
4. Copy the `Client ID`
5. In that same client details page, look for the line labeled `Client secret`
6. If Google hides it, click the reveal icon next to it
7. Copy the `Client secret`

### Step 7: Create Your Local `.env` File

Use Terminal for this so the steps are exact.

1. Open Terminal.
2. Go into the Jarona project folder:

```bash
cd /Users/ahameed/Documents/GitHub/Jarona
```

3. Copy the example file into a real `.env` file:

```bash
cp .env.example .env
```

4. Open `.env` in TextEdit:

```bash
open -a TextEdit .env
```

If `open -a TextEdit .env` does not work, use:

```bash
nano .env
```

5. Replace the placeholder values with your real Google values.

Example for normal computer-only use:

```text
GOOGLE_CLIENT_ID=your-real-client-id-here
GOOGLE_CLIENT_SECRET=your-real-client-secret-here
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/api/google/callback
```

Example for iPhone use on the same Wi-Fi:

```text
GOOGLE_CLIENT_ID=your-real-client-id-here
GOOGLE_CLIENT_SECRET=your-real-client-secret-here
GOOGLE_REDIRECT_URI=http://192.168.1.25:3000/api/google/callback
```

Use your actual IP address if you choose the iPhone version.

6. Save the file.

If you used `nano`:

1. Press `Control + O`
2. Press `Enter`
3. Press `Control + X`

### Step 8: Restart Jarona

If Jarona is already running:

1. Click the Terminal window where Jarona is running.
2. Press:

```text
Control + C
```

3. Start it again with this exact command if you are using Jarona only on your computer:

```bash
cd /Users/ahameed/Documents/GitHub/Jarona
npm start
```

4. Or start it with this exact command if you also want to open it from your iPhone on the same Wi-Fi:

```bash
cd /Users/ahameed/Documents/GitHub/Jarona
HOST=0.0.0.0 npm start
```

5. Wait until Terminal shows that Jarona is running.

### Step 9: Open Jarona In Your Browser

If you are using your computer:

1. Open your browser.
2. Go to:

```text
http://127.0.0.1:3000
```

If you are using your iPhone:

1. Open Safari or Chrome on your iPhone.
2. Go to:

```text
http://YOUR-COMPUTER-IP:3000
```

Example:

```text
http://192.168.1.25:3000
```

3. Once the site loads, log into your Jarona profile.

### Step 10: Find The Google Calendar Section

1. After logging in, look on the right side of Jarona.
2. Find the box titled:

```text
Google Calendar
```

3. You should see a button that says:

```text
Connect Google Calendar
```

If you instead see `Google Setup Needed`, then:

1. `.env` is missing
2. the values inside `.env` are wrong
3. or Jarona was not restarted after editing `.env`

### Step 11: Connect Google Calendar

1. Click `Connect Google Calendar`
2. Google will open
3. Sign in with the Google account you want Jarona to use
4. If Google asks you to choose an account, pick your personal Gmail
5. Review the requested permissions
6. Click `Allow`

After Google redirects back to Jarona:

1. Jarona should show that Google Calendar is connected
2. Jarona will create and use a separate calendar named:

```text
Jarona
```

### Step 12: Generate People And Create The Calendar Event

1. In Jarona, press `Generate`
2. Jarona will choose the people for today
3. If Google Calendar is connected, Jarona will automatically create or update today's event in the separate `Jarona` calendar
4. The Google Calendar event is created for the start and end times currently saved in Jarona's `Generator settings`.

5. Press `Open Jarona Calendar`
6. In Google Calendar, click the event for today
7. The event details should list the generated people to reach out to
8. If you turned on the background scheduler above, this same calendar event can also be created automatically later in the day even when Jarona is not open in your browser, as long as your computer is on and awake

### Step 13: If You Need To Re-Sync Today's Event

1. Stay logged into Jarona
2. Make sure today's people have already been generated
3. Press:

```text
Sync Today's Event
```

That forces Jarona to push today's event into Google Calendar again.

## Troubleshooting Google Calendar Setup

### If `Connect Google Calendar` does nothing useful

Check these:

1. Make sure `.env` exists in `/Users/ahameed/Documents/GitHub/Jarona`
2. Make sure `GOOGLE_CLIENT_ID` is filled in
3. Make sure `GOOGLE_CLIENT_SECRET` is filled in
4. Make sure `GOOGLE_REDIRECT_URI` exactly matches the one in Google Cloud
5. Restart Jarona after editing `.env`

### If Google says `redirect_uri_mismatch`

That means the redirect URI in Google Cloud and the redirect URI in `.env` do not exactly match.

They must match character for character.

### If You Open Jarona On iPhone

If you complete the Google login on your iPhone:

1. Jarona must be running with:

```bash
HOST=0.0.0.0 npm start
```

2. Your `.env` redirect URI must use your computer's LAN IP, not `127.0.0.1`
3. That same LAN redirect URI must also be entered in Google Cloud

## Deploying Online For Free With Render

As of June 29, 2026:

- Render still offers a free web service tier
- Railway is generally not the better free choice anymore

This project is now set up so Render can run it directly.

### Important Warning Before You Deploy

Right now, this app saves data in:

```text
data/store.json
```

That works well on your computer, but on a free Render web service this file should be treated as temporary.

That means:

- Your website can go online for free
- Your profiles and friend list may be lost after redeploys, restarts, or instance replacement
- This is okay for testing, but not ideal for long-term personal use

If you want truly reliable long-term saved data, the next step would be moving storage to a real database.

### Step-By-Step: How To Deploy On Render

1. Push this project to GitHub.
2. Go to [https://render.com](https://render.com).
3. Create an account or log in.
4. In Render, press `New +`.
5. Choose `Web Service`.
6. Connect your GitHub account if Render asks.
7. Select this repository.
8. Use these settings:
   - `Runtime`: `Node`
   - `Build Command`: `npm install`
   - `Start Command`: `npm start`
9. Choose the `Free` plan.
10. Press `Create Web Service`.
11. Wait for the deploy to finish.
12. Open the Render URL it gives you.

### If Render Detects Settings Automatically

That is okay too.

This repo includes:

- [render.yaml](/Users/ahameed/Documents/GitHub/Jarona/render.yaml)

So Render may auto-fill the correct setup.

### How To Use It After Deploying

1. Open the Render website URL on your computer or iPhone.
2. Create a profile.
3. Add people.
4. Save your settings.
5. Press `Generate`.

### Best Use Of The Free Render Version

The free Render deploy is best for:

- Testing the site online
- Accessing it from your phone anywhere
- Sharing the interface between devices

The free Render deploy is not best for:

- Permanent long-term storage of your friend list
- Trusting `store.json` to survive indefinitely
