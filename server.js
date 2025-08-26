// server.js
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Simule une petite "base de données" en mémoire
let users = {};      // { username: { friends: [], socketId: "" } }
let pendingRequests = {}; // { targetUser: [requestingUser, ...] }

// 📌 Connexion Socket.IO
io.on("connection", (socket) => {
    console.log("Nouvel utilisateur connecté :", socket.id);

    // Quand un utilisateur s'identifie
    socket.on("register", (username) => {
        users[username] = { friends: [], socketId: socket.id };
        console.log(`${username} est en ligne ✅`);
    });

    // Envoi d’un message
    socket.on("chatMessage", ({ from, to, message }) => {
        if (users[to]) {
            io.to(users[to].socketId).emit("chatMessage", { from, message });
        }
    });

    // Envoi d'une demande d'ami
    socket.on("friendRequest", ({ from, to }) => {
        if (!users[to]) return;
        if (!pendingRequests[to]) pendingRequests[to] = [];
        pendingRequests[to].push(from);
        io.to(users[to].socketId).emit("friendRequest", { from });
    });

    // Acceptation d’une demande d’ami
    socket.on("acceptFriend", ({ from, to }) => {
        if (!users[to] || !users[from]) return;

        users[to].friends.push(from);
        users[from].friends.push(to);

        // notifier les deux
        io.to(users[to].socketId).emit("friendAccepted", { friend: from });
        io.to(users[from].socketId).emit("friendAccepted", { friend: to });

        // enlever la demande
        if (pendingRequests[to]) {
            pendingRequests[to] = pendingRequests[to].filter(f => f !== from);
        }
    });

    // Déconnexion
    socket.on("disconnect", () => {
        for (let username in users) {
            if (users[username].socketId === socket.id) {
                console.log(`${username} s'est déconnecté ❌`);
                delete users[username];
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
