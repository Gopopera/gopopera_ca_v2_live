<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1FvByUEDrVNxxsJIFMmAoprlGMz0OzOAc

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
   
   The app will start on port 3000 (http://localhost:3000)

## Access via ngrok (for mobile testing)

1. Start the dev server:
   `npm run dev`
   
2. In a separate terminal, start ngrok:
   `ngrok http 3000`
   
3. Use the ngrok URL provided (e.g., `https://florance-interneural-dispiteously.ngrok-free.dev`) to access the app on your phone