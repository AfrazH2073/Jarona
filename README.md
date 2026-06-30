# Jarona
An app designed to help you stay in touch with friends. You can add people, store bond strength, and generate who to reach out to each day with weighted probabilities based on closeness.

## Features

- Profile-based login with username and password
- Persistent server-side storage so your data can be shared across devices
- People list with required and optional fields
- Add and edit flows for each person
- Sort by name, bond, location, or when you met
- Daily weighted generation with cooldown rules
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

## Important Notes

- If you close the browser tab, your saved data does not disappear
- If you stop the server, the site goes offline until you run `npm start` again
- If you want to use this from anywhere, not just your home Wi-Fi, the next step would be deploying it to a real web host

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
