require("dotenv").config();
const express = require("express");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

const gameName = "Pocunitytelegram";
const webURL = "gusty-checkered-knee.glitch.me";

const server = express();
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const port = process.env.PORT || 5000;

const SCORE_TOKEN = process.env.SCORE_TOKEN.split(";").map((t) => BigInt(t));

const queries = {};

function addAllNumbers(number) {
  const strNumber = number.toString();

  if (strNumber.length === 1) return number;

  const numbers = strNumber.split("");
  var sum = 0;
  for (var i = 0; i < numbers.length; i++) {
    sum += parseInt(numbers[i], 10);
  }
  return addAllNumbers(sum);
}

mongoose.connect("mongodb+srv://francodelocca:cSGOaaxpwa15qAtV@cluster0.6wimg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  chatId: String,
  score: { type: Number, default: 0 },
  invitedBy: String, // chatId del usuario que lo invitó
  invites: { type: Number, default: 0 }, // Número de usuarios que ha invitado
});

const User = mongoose.model("User", userSchema);

bot.onText(/\/help/, (msg) =>
  bot.sendMessage(
    msg.from.id,
    "This bot implements a simple game. Say /game if you want to play."
  )
);
bot.onText(/\/start|\/game/, (msg) => bot.sendGame(msg.from.id, gameName));

bot.onText(/\/start(?:\s+(\S+))?/, async (msg, match) => {
  const chatId = msg.chat.id.toString();
  const referralCode = match[1]; // Código de referencia (userId del invitador)

  // Verificar si el usuario ya está registrado
  let user = await User.findOne({ chatId });

  if (!user) {
    // Registrar al nuevo usuario
    user = new User({
      chatId: chatId,
      invitedBy: referralCode || null,
    });
    await user.save();

    // Si fue invitado por alguien, otorgar puntos al invitador
    if (referralCode) {
      const inviter = await User.findOne({ chatId: referralCode });
      if (inviter) {
        inviter.score += 10; // Otorgar 10 puntos al invitador
        inviter.invites += 1; // Incrementar el contador de invitaciones
        await inviter.save();

        bot.sendMessage(
          inviter.chatId,
          "¡Un nuevo usuario ha aceptado tu invitación! Has ganado 10 puntos."
        );
      }
    }
  }

  bot.sendMessage(
    chatId,
    "¡Bienvenido al juego! Usa /score para ver tu puntuación."
  );
});

bot.onText(/\/score/, async (msg) => {
  const chatId = msg.chat.id.toString();
  const user = await User.findOne({ chatId });

  if (user) {
    bot.sendMessage(
      chatId,
      `Tu puntuación actual es: ${user.score} puntos.\nHas invitado a ${user.invites} amigos.`
    );
  } else {
    bot.sendMessage(
      chatId,
      "No se encontró información de tu usuario. Usa /start para comenzar."
    );
  }
});

bot.on("callback_query", function (query) {
  if (query.game_short_name !== gameName) {
    bot.answerCallbackQuery(
      query.id,
      "Sorry, '" + query.game_short_name + "' is not available."
    );
  } else {
    queries[query.id] = query;
    const gameurl = `https://${webURL}/index.html?id=${query.id}`;
    bot.answerCallbackQuery(query.id, { url: gameurl });
  }
});

bot.on("inline_query", function (iq) {
  bot.answerInlineQuery(iq.id, [
    { type: "game", id: "0", game_short_name: gameName },
  ]);
});

server.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: function (res, path) {
      if (path.endsWith(".br")) {
        res.setHeader("Content-Encoding", "br");
      } else if (path.endsWith(".gz")) {
        res.setHeader("Content-Encoding", "gzip");
      }
    },
  })
);

server.get("/highscore/:score", function (req, res, next) {
  if (!Object.hasOwnProperty.call(queries, req.query.id)) return next();

  const token = SCORE_TOKEN[addAllNumbers(BigInt(req.query.id)) - 1];

  let query = queries[req.query.id];

  let options;
  if (query.message) {
    options = {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
    };
  } else {
    options = {
      inline_message_id: query.inline_message_id,
    };
  }

  // ===== Obfuscation decoding starts =====
  // Change this part if you want to use your own obfuscation method
  const obfuscatedScore = BigInt(req.params.score);

  const realScore = Math.round(Number(obfuscatedScore / token));

  // If the score is valid
  if (BigInt(realScore) * token == obfuscatedScore) {
    // ===== Obfuscation decoding ends =====
    bot
      .setGameScore(query.from.id, realScore, options)
      .then((b) => {
        return res.status(200).send("Score added successfully");
      })
      .catch((err) => {
        if (
          err.response.body.description ===
          "Bad Request: BOT_SCORE_NOT_MODIFIED"
        ) {
          return res
            .status(204)
            .send("New score is inferior to user's previous one");
        } else {
          return res.status(500);
        }
      });
    return;
  } else {
    return res.status(400).send("Are you cheating ?");
  }
});

// Endpoint para generar el enlace de invitación
server.get("/generateInviteLink", (req, res) => {
  const userId = req.query.userId; // ID único del usuario (por ejemplo, chatId de Telegram)

  // Validar que se proporcionó un userId
  if (!userId) {
    return res.status(400).json({ error: "Se requiere un userId" });
  }

  // Generar el enlace profundo de Telegram con el código de referencia
  const botUsername = "Pocunitytelegram"; // Reemplaza con el nombre de usuario de tu bot
  const inviteLink = `https://t.me/${botUsername}?start=${userId}`;

  // Devolver el enlace al cliente
  res.json({ inviteLink });
});

server.get("/getUserScore", async (req, res) => {
  const userId = req.query.userId;

  // Validar que se proporcionó un userId
  if (!userId) {
    return res.status(400).json({ error: "Se requiere un userId" });
  }

  try {
    // Buscar al usuario en la base de datos
    const user = await User.findOne({ chatId: userId });

    if (user) {
      // Devolver el score del usuario
      res.json({ score: user.score, invites: user.invites });
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  } catch (error) {
    console.error("Error al obtener el score del usuario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

server.listen(port);
