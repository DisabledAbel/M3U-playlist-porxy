# 🎧 M3U Playlist Proxy

A lightweight proxy server for streaming and modifying M3U playlists on the fly. Perfect for IPTV users who want to filter, clean, or host their playlists with ease.

---

## 🚀 Features

- 🌐 Serve M3U playlists via HTTP
- 🧹 Filter or modify channels (rename, remove, or reorder)
- 🔄 Auto-refresh support for remote playlists
- 🔒 Optional IP whitelisting or token auth
- 📦 Lightweight and easy to deploy

---

## 🛠️ Customization

- Modify channel names
- Filter groups
- Inject custom headers
- Add EPG links

---

# 📥 Installation
✨ What You’ll Need

Before we start, make sure you have:

A GitHub account (free) → Create one
A Vercel account (free) → Create one
Node.js installed → Download here
(This helps run the app on your computer)
💻 Set It Up on Your Computer (PC or Mac)

1. Get the App Code
Open Terminal (Mac) or Command Prompt (Windows)
Copy-paste this and hit enter:

git clone https://github.com/your-username/your-repo-name.git
Then go inside the folder:

cd your-repo-name
2. Install Everything the App Needs
Just run this:

npm install
It will take a minute to set up.

3. Start the App!
Run:

npm run dev
Now open http://localhost:3000 in your web browser — your app is live on your computer! 🎉

📱 See the App on Your Phone

Want to check how it looks on your phone?

Make sure your phone and computer are on the same Wi-Fi
In Terminal / Command Prompt, find your computer’s IP address:
Mac / Linux:
ifconfig
Windows:
ipconfig
Look for an IP like 192.168.x.x

Run this to make the app visible to your phone:
npm run dev -- --host
On your phone’s browser, type:
http://your-ip-address:3000
Example: http://192.168.1.15:3000

🚀 If you want to update the live app (Vercel website)
Whenever you make changes, here’s how to put them online:

Save your changes locally
Push them to GitHub:
git add .
git commit -m "Describe your update here"
git push
Vercel will automatically detect the update and redeploy your site ✨

✅ Your live site will refresh in a few seconds
✅ No extra steps on Vercel needed!




## 📚 What is M3U?

[M3U](https://en.wikipedia.org/wiki/M3U) is a file format for multimedia playlists. It's often used for IPTV to list TV channels via URLs.

---

## 🧪 To-Do

- [ ] Web interface for managing playlists
- [ ] Caching support
- [ ] EPG auto-merging
---

## 🧑‍💻 Contributing

Pull requests and suggestions are welcome! Please open an issue first if you have a feature request.

——
Have questions, need help, or want to share your setup?Join our Discord community here:👉 https://discord.gg/QwegeeJ8Mc

—-


## 📄 License

MIT License. See [LICENSE](LICENSE)
