// Setup our environment variables via dotenv
require("dotenv").config();
const Queue = require("bull");
const redis = require("redis");

const redisClient = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
// Import relevant classes from discord.js
const { Client, Intents } = require("discord.js");
// Instantiate a new discordClient with some necessary parameters.
const discordClient = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

redisClient.connect();

redisClient.on("connect", function () {
    console.log("Redis Connected!");
  });
  
redisClient.on("error", function (err) {
console.log("Something went wrong " + err);
});

// Notify progress for Discord login
discordClient.on("ready", function (e) {
  console.log(`Logged into Discord as ${discordClient.user.tag}!`);
});

// Discord Authenticate 
discordClient.login(process.env.DISCORD_TOKEN);

var channel = null;

// Create queue
const messageQueue = new Queue("message-queue");

const messageProcessor = async (job) => {
    await channel.send(job.data.reverseMessage);
};

messageQueue.process(messageProcessor);


discordClient.on("messageCreate", (messageCreate) => {
  if (!messageCreate.author.bot) {
    console.log("Message", messageCreate.content);
    console.log("Sender: ", messageCreate.author.username);

    channel = messageCreate.channel;

    const msg = messageCreate.content;

    var data = null;
    redisClient.get(msg).then((value) => {
        // Check message value exist
      if (value) {
        data = {
          reverseMessage: value,
        };
      } else {
        const reversed = msg.split("").reverse().join("");

        // Add message with value in redis
        redisClient.set(msg, reversed);

        data = {
          reverseMessage: reversed,
        };
      }
      messageQueue.add(data, {});
    });
  }
});
