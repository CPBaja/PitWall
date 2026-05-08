import express from "express";
import { getLastDataUpdate, initialFullData, parseAllData } from "./parser";
import { FullData } from "./models";

const app = express();
const PORT = 3001;
const POLL_INTERVAL = 60 * 1000;

let fullData: FullData = initialFullData;

const clients = new Set<express.Response>();

const broadcast = (data: FullData) => {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
};

app.get("/data", (_req, res) => {
  res.json(fullData);
});

app.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Send current state immediately on connect
  res.write(`data: ${JSON.stringify(fullData)}\n\n`);

  clients.add(res);
  req.on("close", () => clients.delete(res));
});

const startPolling = async () => {
  let lastUpdate: Date | null = null;

  fullData = await parseAllData(initialFullData, {
    static: true,
    dynamics: true,
    endurance: true,
  });
  broadcast(fullData);

  setInterval(async () => {
    try {
      const newDate = await getLastDataUpdate();

      if (newDate && (!lastUpdate || newDate > lastUpdate)) {
        console.log(`Data updated at ${newDate}, fetching...`);

        fullData = await parseAllData(fullData, {
          static: true,
          dynamics: true,
          endurance: true,
        });

        lastUpdate = newDate;
        broadcast(fullData);
      } else {
        console.log("No update detected.");
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, POLL_INTERVAL);
};

app.listen(PORT, () => {
  console.log(`PitWall server running on http://localhost:${PORT}`);
  startPolling();
});
