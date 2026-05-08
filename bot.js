import http from 'http';
import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

// Create a web server so Render knows the bot is alive
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running!');
});
server.listen(3000, () => {
  console.log('✅ Web server running on port 3000');
});

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
  console.error("Missing DISCORD_BOT_TOKEN environment variable.");
  process.exit(1);
}

const CHANNEL_ID = process.env.GANG_CHANNEL_ID ?? "1475784753264201740";
const ROLE_CHANGE_DEBOUNCE_MS = 3000;

const ranks = [
  { name: "👑 Jefe", roleId: process.env.ROLE_JEFE ?? "1475784693407420541" },
  { name: "🧠 Sub Jefe", roleId: process.env.ROLE_SUB_JEFE ?? "1475784695689252999" },
  { name: "🎯 Encargado", roleId: process.env.ROLE_ENCARGADO ?? "1499735272299040798" },
  { name: "🔫 Sicario", roleId: process.env.ROLE_SICARIO ?? "1475784696553144321" },
  { name: "💰 Paro", roleId: process.env.ROLE_PARO ?? "1478541802494627841" },
  { name: "⚡ Activo", roleId: process.env.ROLE_ACTIVO ?? "1499735621156081774" },
  { name: "📦 Chequeos", roleId: process.env.ROLE_CHEQUEOS ?? "1475784700982329407" },
  { name: "🤝 Colaborador", roleId: process.env.ROLE_COLABORADOR ?? "1499736095158435960" },
  { name: "🪖 Soldado", roleId: process.env.ROLE_SOLDADO ?? "1475784699073921104" },
  { name: "🆕 Recruta", roleId: process.env.ROLE_RECRUTA ?? "1475784699753267364" },
];

function getNumber(name) {
  const match = name.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
}

function displayName(member) {
  return member.displayName;
}

function memberLink(id, _name) {
  return `<@${id}>`;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

let messageId = null;

async function buildEmbed() {
  const guild = client.guilds.cache.first();
  if (!guild) {
    console.warn("Bot is not in any guild yet.");
    return null;
  }

  let body = "";
  const uniqueMembers = new Set();

  for (const rank of ranks) {
    const role = guild.roles.cache.get(rank.roleId);
    if (!role) {
      body += `**${rank.name} (0)**\n`;
      body += `➤ Rol niet gevonden\n\n`;
      continue;
    }

    const members = [...role.members.values()]
      .map((m) => ({ id: m.id, name: displayName(m) }))
      .sort((a, b) => getNumber(a.name) - getNumber(b.name));

    for (const m of members) uniqueMembers.add(m.id);

    body += `**${rank.name} (${members.length})**\n`;
    if (members.length > 0) {
      for (const m of members) {
        body += `➤ ${memberLink(m.id, m.name)}\n`;
      }
    } else {
      body += `➤ Geen leden\n`;
    }
    body += `\n`;
  }

  const description = `**Totaal: ${uniqueMembers.size} leden**\n\n${body}`;

  return new EmbedBuilder()
    .setTitle("🏴 Gang Ledenlijst")
    .setColor(0x2b2b2b)
    .setDescription(description.slice(0, 4096))
    .setFooter({ text: "🔄 Auto-update bij rolwijzigingen" })
    .setTimestamp(new Date());
}

async function updateList() {
  const embed = await buildEmbed();
  if (!embed) {
    throw new Error("Bot zit niet in een server.");
  }

  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    throw new Error(`Channel ${CHANNEL_ID} is geen tekstkanaal of bestaat niet.`);
  }

  const payload = {
    embeds: [embed],
    allowedMentions: { parse: [] },
  };

  if (messageId) {
    try {
      const existing = await channel.messages.fetch(messageId);
      await existing.edit(payload);
      return;
    } catch (err) {
      console.warn("Could not edit existing message, sending a new one.", err);
      messageId = null;
    }
  }

  // Delete old bot messages
  try {
    const fetched = await channel.messages.fetch({ limit: 100 });
    const botMessages = fetched.filter((m) => m.author.id === client.user?.id);
    for (const m of botMessages.values()) {
      await m.delete().catch(() => null);
    }
  } catch (err) {
    console.warn("Could not clean up old bot messages:", err);
  }

  const sent = await channel.send(payload);
  messageId = sent.id;
}

async function safeUpdateList() {
  try {
    await updateList();
  } catch (err) {
    console.error("Failed to update gang list:", err);
  }
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("refresh")
      .setDescription("Refresh de gang ledenlijst nu")
      .addBooleanOption((option) =>
        option.setName("ephemeral").setDescription("Toon alleen aan jou").setRequired(false)
      )
      .toJSON(),
  ];

  try {
    const guild = client.guilds.cache.first();
    if (guild) {
      await guild.commands.set(commands);
      console.log(`✅ /refresh geregistreerd in ${guild.name}`);
    } else {
      await client.application?.commands.set(commands);
      console.log("✅ /refresh globaal geregistreerd");
    }
  } catch (err) {
    console.error("Failed to register slash commands:", err);
  }
}

async function handleRefresh(interaction) {
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? true;
  await interaction.deferReply({ flags: ephemeral ? 64 : 0 });
  try {
    await updateList();
    await interaction.editReply("✅ Ledenlijst bijgewerkt.");
  } catch (err) {
    console.error("Refresh command failed:", err);
    await interaction.editReply(`❌ Bijwerken mislukt: ${err.message}`);
  }
}

const watchedRoleIds = new Set(ranks.map((r) => r.roleId));
let pendingUpdate = null;

function scheduleUpdate() {
  if (pendingUpdate) return;
  pendingUpdate = setTimeout(() => {
    pendingUpdate = null;
    safeUpdateList();
  }, ROLE_CHANGE_DEBOUNCE_MS);
}

client.once("ready", async () => {
  console.log(`✅ Bot online als ${client.user?.tag}`);
  try {
    const guild = client.guilds.cache.first();
    if (guild) {
      await guild.members.fetch();
      console.log(`✅ ${guild.members.cache.size} leden geladen`);
    }
  } catch (err) {
    console.error("Failed to prefetch members:", err);
  }
  registerCommands();
  safeUpdateList();
});

client.on("guildMemberUpdate", (oldMember, newMember) => {
  const oldRoles = new Set(oldMember.roles.cache.keys());
  const newRoles = new Set(newMember.roles.cache.keys());
  
  let changed = false;
  for (const id of oldRoles) if (!newRoles.has(id)) changed = true;
  for (const id of newRoles) if (!oldRoles.has(id)) changed = true;
  
  if (!changed) return;
  
  let touchesGangRole = false;
  for (const id of watchedRoleIds) {
    if (oldRoles.has(id) !== newRoles.has(id)) {
      touchesGangRole = true;
      break;
    }
  }
  
  if (touchesGangRole) scheduleUpdate();
});

client.on("guildMemberRemove", (member) => {
  const hasGangRole = [...member.roles.cache.keys()].some((id) => watchedRoleIds.has(id));
  if (hasGangRole) scheduleUpdate();
});

client.on("interactionCreate", (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "refresh") handleRefresh(interaction);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

client.login(TOKEN);
