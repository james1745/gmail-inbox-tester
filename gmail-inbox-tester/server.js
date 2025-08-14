const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { google } = require("googleapis");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve frontend files
app.use(express.static("public"));

// Connect to Gmail and check for new emails
async function checkInbox() {
    const accounts = ["inbox01", "inbox02"]; // token file names without .json

    for (let acc of accounts) {
        const auth = new google.auth.OAuth2();
        auth.setCredentials(JSON.parse(fs.readFileSync(`tokens/${acc}.json`)));
        const gmail = google.gmail({ version: "v1", auth });

        const res = await gmail.users.messages.list({
            userId: "me",
            maxResults: 1,
            labelIds: ["INBOX", "SPAM", "CATEGORY_PROMOTIONS"]
        });

        if (res.data.messages && res.data.messages.length > 0) {
            const msg = await gmail.users.messages.get({
                userId: "me",
                id: res.data.messages[0].id
            });

            const labels = msg.data.labelIds;
            let folder = "Inbox";
            if (labels.includes("SPAM")) folder = "Spam";
            else if (labels.includes("CATEGORY_PROMOTIONS")) folder = "Promotions";

            io.emit("emailUpdate", {
                account: acc,
                folder,
                subject: msg.data.payload.headers.find(h => h.name === "Subject")?.value
            });
        }
    }
}

// Check inbox every 10 seconds
setInterval(checkInbox, 10000);

io.on("connection", socket => {
    console.log("User connected");
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
