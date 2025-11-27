# 🌙 YukiChat — AI Powered Telegram Bot Panel

YukiChat ek fully–customizable AI Telegram bot panel hai jisme:

✔ Gemini multi–API key rotation  
✔ Owner / Bot identity control  
✔ Gender + Personality modes  
✔ Group smart–reply system  
✔ Conversation memory  
✔ Typing animation  
✔ Group logging  
✔ Webhook setup button  
✔ Clean Next.js + MongoDB architecture  

---

## 📁 Folder Structure

```
YukiChat/
│
├── jsconfig.json
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── README.md
│
├── lib/
│   ├── db.js
│   └── gemini.js
│
├── models/
│   ├── ApiKey.js
│   ├── BotConfig.js
│   ├── BotSettings.js
│   ├── Group.js
│   └── Memory.js
│
├── pages/
│   ├── _app.js
│   ├── _document.js
│   ├── index.js
│   └── api/
│       ├── chat.js
│       ├── keys.js
│       ├── bot-config.js
│       ├── bot-settings.js
│       ├── groups.js
│       └── telegram-webhook.js
│
├── public/
│   ├── favicon.svg
│   ├── icon.svg
│   └── logo.svg
│
└── styles/
    └── globals.css
```

---

## ⚙️ Installation

### 1️⃣ Project Install

```bash
npm install
```

### 2️⃣ Environment Variables (Vercel ya local)

```
MONGODB_URI=your-mongodb-connection
```

Bas itna hi!

---

## 🚀 Development Start

```bash
npm run dev
```

Default URL:

```
http://localhost:3000
```

---

## 🌐 Deployment (Vercel)

1. Project import karo  
2. Environment variable add karo:

```
MONGODB_URI=xxx
```

3. Deploy → Panel ready

---

## 🤖 Telegram Bot Setup

1. BotFather se token lo  
2. Panel me **Bot Token** paste karo  
3. **Save Token**  
4. **Set Webhook** button press  

Webhook URL:

```
https://your-domain/api/telegram-webhook
```

---

## 🧠 Features Explained

### 🔹 Multi Gemini API Keys
- Multiple keys add  
- Enable/disable  
- Auto fallback  
- Key block detection  
- Auto disable blocked keys  

### 🔹 Full Bot Personalization
Panel se change ho sakta hai:

- Bot name  
- Bot username  
- Gender (male/female)  
- Personality (normal/flirty/professional)  
- Owner name  
- Group link  

### 🔹 Memory System
Har user ka alag chat memory hota hai  
(last 10 messages stored).

### 🔹 Group Smart Reply
Bot group me tabhi reply karta hai jab:

- Usko mention kare  
- Reply kare  
- Bot ka naam le  

Random baate me beech me nahi ghusta.

### 🔹 Conversation Tone Control
Persona dynamically change hota hai:

- Friendly  
- Flirty  
- Professional  

### 🔹 Typing Animation
Bot reply se pehle “typing…” show karta hai.

---

## 🛡 Error Protection

Bot engine protected from:

- Rate limits  
- Invalid keys  
- Webhook spam  
- Empty messages  
- JSON parse issues  

---

## ❤️ Credits

**Developer:** You  
**AI System:** Gemini Pro  
**Framework:** Next.js  
**Database:** MongoDB  
**Style:** TailwindCSS

---

## 🧩 Support

Agar tum bot ko upgrade karna chaho:

- Auto NSFW filter  
- Image reply  
- Voice message  
- Memory wipe command  
- Admin mode  

Main add karke de dunga.
