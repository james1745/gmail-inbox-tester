import { google } from "googleapis";

export default async function handler(req, res) {
  try {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      "urn:ietf:wg:oauth:2.0:oob"
    );

    oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    const messagesList = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10,
    });

    const messages = messagesList.data.messages || [];
    const results = [];

    for (const msg of messages) {
      const message = await gmail.users.messages.get({ userId: "me", id: msg.id });
      const headers = message.data.payload.headers;
      const subject = headers.find(h => h.name === "Subject")?.value || "";
      const from = headers.find(h => h.name === "From")?.value || "";
      const labels = message.data.labelIds || [];
      let folder = "Inbox";
      if (labels.includes("SPAM")) folder = "Spam";
      else if (labels.includes("CATEGORY_PROMOTIONS")) folder = "Promotions";

      results.push({ from, subject, folder });
    }

    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
}
