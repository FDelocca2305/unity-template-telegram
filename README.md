# Unity Telegram Game - Backend

> For complete overview of the project, please visit the [Unity package GitHub repository](https://github.com/asynkr/unity-telegram-game).

This is a Node.js app that serves two purposes:
1. Run a Telegram bot
2. Serve a game (actually, an `index.html` file)

Note that this repo is essentially only that. So it isn't mandatory to be used with a Unity game.
Actually, the project from which this project has been forked implements a [fully js T-Rex game](https://github.com/fercarcedo/T-Rex-Telegram-game).

This project contains a very simple Unity Game, which uses the [unity-telegram-game](https://github.com/asynkr/unity-telegram-game) package.

## Create a Telegram bot

The first step is to create a Telegram bot. Talk to the [BotFather]([t.me/botfather](https://t.me/botfather)) and store the token it will give you.

In this app, we will only do two things related to the bot:
* Listen for commands and serve the game when asked with `/game`
* Listen for inline queries (this enables you to type "@YourNameBot" in any chat and get prompted with the game)

## Installation

* Deploy a Node.js app. This documentation will not cover this part (this is because it is out of the scope of the project, not at all because I already forgot how I did it). However, here are some steps to deploy it on a VPS (something like [that](https://blog.tericcabrel.com/deploy-a-node-js-application-with-pm2-and-nginx/)) :
  * Install Node and yarn
  * Install pm2 and use it to start the Node app
  * Configure a nginx server (pay attention to how you're declaring the `public` folder in the config)
  * Don't forget to cry because your nginx config is not working
  * Pay attention to which ports are used and need to be opened: don't forget you have two services running, the express server and the telegram bot.
  * Add a SSL certificate
* Upload your WebGL game in the `public` folder
* Add a `.env` file with the following content:
  ```
  BOT_TOKEN=<your-telegram-bot-token>
  SCORE_TOKEN = "<your-score-token-1>;<your-score-token-2>;..."
  ```
  The score tokens are the numbers you will use to obfuscate the score. They must be also set in the Unity game.
* You're good to go.
