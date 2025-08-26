// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

app.use(cors());
app.use(bodyParser.json());

let users = {}; // { email: { id, pseudo, email, password, avatar, code, friends: [] } }
let sessions = {}; // { token: email }

// inscription
app.post("/signup", (req, res) => {
  const { pseudo, email, password } = req.body;
  if (users[email]) return res.status(400).json({ error: "Email déjà utilisé" });

  const newUser = {
    id: uuidv4(),
    pseudo,
    email,
    password,
    avatar: "default.png",
    code: Math.random().toString(36).substring(2, 8),
    friends: []
  };

  users[email] = newUser;
  res.json({ success: true, user: newUser });
});

// connexion
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = users[email];
  if (!user || user.password !== password) {
    return res.status(400).json({ error: "Identifiants invalides" });
  }
  const token = uuidv4();
  sessions[token] = email;
  res.json({ success: true, token, user });
});

// changer avatar
app.post("/avatar", (req, res) => {
  const { token, avatar } = req.body;
  const email = sessions[token];
  if (!email) return res.status(403).json({ error: "Non autorisé" });

  users[email].avatar = avatar;
  res.json({ success: true, avatar });
});

// ajouter ami via code
app.post("/add-friend", (req, res) => {
  const { token, code } = req.body;
  const email = sessions[token];
  if (!email) return res.status(403).json({ error: "Non autorisé" });

  let friend = Object.values(users).find(u => u.code === code);
  if (!friend) return res.status(404).json({ error: "Code invalide" });

  if (!users[email].friends.includes(friend.id)) {
    users[email].friends.push(friend.id);
    friend.friends.push(users[email].id);
  }
  res.json({ success: true, friends: users[email].friends });
});

// chat websocket
io.on("connection", (socket) => {
  console.log("Nouveau client connecté");

  socket.on("sendMessage", (msg) => {
    io.emit("receiveMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client déconnecté");
  });
});

server.listen(3000, () => {
  console.log("Serveur lancé sur http://localhost:3000");
});
