# Kikoo AI Bot — Setup Guide

Yeh project sirf **Phase 1 (FAQ Bot with RAG)** cover karta hai. Kikoo ke database se
personal data (rank/votes) wala Phase 2 abhi isme shaamil nahi hai.

## Kya-kya hai isme

```
kikoo-ai-bot/
├── frontend/          → React chat widget (UI)
├── knowledge-base/     → Kikoo ki FAQ/rules/voting info (.txt files)
├── rag/                → ingest, retrieve, search logic
├── config/             → AI model settings + API key setup
├── server.js           → chhota sa server jo API key ko safe rakhta hai
└── package.json
```

## Step 1 — API Key lena (Gemini)

1. https://aistudio.google.com/apikey pe jao
2. Google account se login karo
3. "Create API key" pe click karo
4. Key copy kar lo

## Step 2 — API Key lagana

Project ke root folder (`kikoo-ai-bot/`) mein ek naya file banao naam se **`.env`**
aur usme yeh line likho:

```
GEMINI_API_KEY=yaha-apni-asli-key-daalo
```

⚠️ Is `.env` file ko kabhi GitHub pe upload mat karna.

## Step 3 — Dependencies install karo

Terminal mein project folder ke andar jaake:

```bash
npm install
```

## Step 4 — Knowledge base ko "ingest" karo

Yeh step knowledge-base/ ke saare .txt files padh kar unhe AI ke samajhne layak
format (embeddings) mein convert karta hai. Jab bhi FAQ content change karo, yeh
dobara chalana:

```bash
npm run ingest
```

Isse ek file banegi: `rag/vector-store.json`

## Step 5 — Server chalao

```bash
npm start
```

Yeh `http://localhost:3001` pe chalega aur `/api/chat` route ready hoga.

## Step 6 — Frontend chalao

`frontend/` folder ko apne React project mein use karo (Vite ya Create React App
ke saath), ya isko kisi existing website mein component ke roop mein import karo.
Chatbot component automatically `http://localhost:3001/api/chat` ko call karega.

## Naya FAQ content add karna ho to

1. `knowledge-base/` mein naya `.txt` file banao ya existing file edit karo
2. `npm run ingest` dobara chalao
3. Server restart karo (`npm start`)

Bas — bot ko naya content mil jayega, bina kisi "training" ke.
