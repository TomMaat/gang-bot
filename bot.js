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

const GANG_LIST_CHANNEL_ID = "1475784753264201740";
const ROLE_CHANGE_DEBOUNCE_MS = 3000;

// Separate channel IDs for different actions
const WARN_CHANNEL_ID = "1475784747392172178";
const PROMO_CHANNEL_ID = "1478540121555996836";
const DEMOTE_CHANNEL_ID = "1502446924702290053";
const AFWEZIGHEID_CHANNEL_ID = "1475784751192477746";

// Placeholder image URL (Discord's default missing image)
const PLACEHOLDER_IMAGE = "https://cdn.discordapp.com/embed/avatars/0.png";

// Role IDs for admin commands
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID ?? "1498067695692812528";
const WARN_ROLE_LEVEL1 = process.env.WARN_ROLE_LEVEL1 ?? "1475784712399224833";
const WARN_ROLE_LEVEL2 = process.env.WARN_ROLE_LEVEL2 ?? "1475784713376632832";

// Ranks from highest to lowest (emoji only used in list, not in embeds)
const ranks = [
  { name: "Jefe", roleId: process.env.ROLE_JEFE ?? "1475784693407420541", level: 10, emoji: "👑" },
  { name: "Sub Jefe", roleId: process.env.ROLE_SUB_JEFE ?? "1475784695689252999", level: 9, emoji: "🧠" },
  { name: "Encargado", roleId: process.env.ROLE_ENCARGADO ?? "1499735272299040798", level: 8, emoji: "🎯" },
  { name: "Sicario", roleId: process.env.ROLE_SICARIO ?? "1475784696553144321", level: 7, emoji: "🔫" },
  { name: "Paro", roleId: process.env.ROLE_PARO ?? "1478541802494627841", level: 6, emoji: "💰" },
  { name: "Activo", roleId: process.env.ROLE_ACTIVO ?? "1499735621156081774", level: 5, emoji: "⚡" },
  { name: "Chequeos", roleId: process.env.ROLE_CHEQUEOS ?? "1475784700982329407", level: 4, emoji: "📦" },
  { name: "Colaborador", roleId: process.env.ROLE_COLABORADOR ?? "1499736095158435960", level: 3, emoji: "🤝" },
  { name: "Soldado", roleId: process.env.ROLE_SOLDADO ?? "1475784699073921104", level: 2, emoji: "🪖" },
  { name: "Recruta", roleId: process.env.ROLE_RECRUTA ?? "1475784699753267364", level: 1, emoji: "🆕" },
];

// Sort ranks by level (highest first)
const sortedRanks = [...ranks].sort((a, b) => b.level - a.level);

function getNumber(name) {
  const match = name.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
}

function displayName(member) {
  return member.displayName;
}

function memberLink(id, _name) {
  return `<@!${id}>`;
}

function getCurrentDate() {
  const date = new Date();
  return date.toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).replace(/\//g, '/');
}

function getFullDate() {
  const date = new Date();
  return date.toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function hasAdminRole(member) {
  return member.roles.cache.has(ADMIN_ROLE_ID);
}

function getRoleIdByLevel(level) {
  const rank = ranks.find(r => r.level === level);
  return rank ? rank.roleId : null;
}

function getRankNameByLevel(level) {
  const rank = ranks.find(r => r.level === level);
  return rank ? rank.name : null;
}

function getCurrentRankLevel(member) {
  for (const rank of sortedRanks) {
    if (member.roles.cache.has(rank.roleId)) {
      return rank.level;
    }
  }
  return 0;
}

async function removeAllGangRoles(member) {
  const gangRoleIds = ranks.map(r => r.roleId);
  const rolesToRemove = member.roles.cache.filter(role => gangRoleIds.includes(role.id));
  if (rolesToRemove.size > 0) {
    await member.roles.remove(rolesToRemove);
  }
}

// ========================================
// 📨 EMBED FUNCTIONS WITH REQUESTED DESIGN
// ========================================

// Get server icon URL (returns placeholder if none)
function getServerIcon(guild) {
  if (guild && guild.iconURL()) {
    return guild.iconURL({ size: 1024 });
  }
  return PLACEHOLDER_IMAGE;
}

async function sendPromoEmbed(guild, user, oldRank, newRank, reason, steps) {
  const channel = await client.channels.fetch(PROMO_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    console.error(`Cannot send embed: Channel ${PROMO_CHANNEL_ID} not found`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("PROMOTIE")
    .setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "Van", value: oldRank, inline: true },
      { name: "Naar", value: newRank, inline: true },
      { name: "Reden", value: reason, inline: false },
      { name: "Datum", value: getCurrentDate(), inline: true }
    )
    .setColor(0x00FF00)
    .setFooter({ text: "MK-13 Bot" })
    .setTimestamp()
    .setThumbnail(getServerIcon(guild));

  await channel.send({ embeds: [embed] });
}

async function sendDemoteEmbed(guild, user, oldRank, newRank, reason, steps) {
  const channel = await client.channels.fetch(DEMOTE_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    console.error(`Cannot send embed: Channel ${DEMOTE_CHANNEL_ID} not found`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("DEMOTIE")
    .setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "Van", value: oldRank, inline: true },
      { name: "Naar", value: newRank, inline: true },
      { name: "Reden", value: reason, inline: false },
      { name: "Datum", value: getCurrentDate(), inline: true }
    )
    .setColor(0xFF0000)
    .setFooter({ text: "MK-13 Bot" })
    .setTimestamp()
    .setThumbnail(getServerIcon(guild));

  await channel.send({ embeds: [embed] });
}

async function sendWarnEmbed(user, warnLevel, reason) {
  const channel = await client.channels.fetch(WARN_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    console.error(`Cannot send embed: Channel ${WARN_CHANNEL_ID} not found`);
    return;
  }

  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;

  const embed = new EmbedBuilder()
    .setTitle("WAARSCHUWING")
    .setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "Niveau", value: warnLevel, inline: true },
      { name: "Reden", value: reason, inline: false },
      { name: "Datum", value: getCurrentDate(), inline: true }
    )
    .setColor(0xFFA500)
    .setFooter({ text: "MK-13 Bot" })
    .setTimestamp()
    .setThumbnail(userAvatar);

  await channel.send({ embeds: [embed] });
}

async function sendAfwezigheidEmbed(user, reason, fromDate, tilDate) {
  const channel = await client.channels.fetch(AFWEZIGHEID_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    console.error(`Cannot send embed: Channel ${AFWEZIGHEID_CHANNEL_ID} not found`);
    return;
  }

  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;
  const tilText = tilDate === "??" || tilDate === "Onbekend" ? "??" : tilDate;

  const embed = new EmbedBuilder()
    .setTitle("AFWEZIGHEID")
    .setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "Reden", value: reason, inline: false },
      { name: "Van", value: fromDate, inline: true },
      { name: "Tot", value: tilText, inline: true },
      { name: "Gemeld op", value: getFullDate(), inline: false }
    )
    .setColor(0x00A5FF)
    .setFooter({ text: "MK-13 Bot" })
    .setTimestamp()
    .setThumbnail(userAvatar);

  await channel.send({ embeds: [embed] });
}

// ========================================
// 🤖 DISCORD CLIENT SETUP
// ========================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

let messageId = null;
let currentGuild = null;

async function buildEmbed() {
  const guild = client.guilds.cache.first();
  if (!guild) {
    console.warn("Bot is not in any guild yet.");
    return null;
  }
  currentGuild = guild;

  let body = "";
  const uniqueMembers = new Set();

  for (const rank of sortedRanks) {
    const role = guild.roles.cache.get(rank.roleId);
    if (!role) {
      body += `**${rank.emoji} ${rank.name} (0)**\n`;
      body += `➤ Rol niet gevonden\n\n`;
      continue;
    }

    const members = [...role.members.values()]
      .map((m) => ({ id: m.id, name: displayName(m) }))
      .sort((a, b) => getNumber(a.name) - getNumber(b.name));

    for (const m of members) uniqueMembers.add(m.id);

    body += `**${rank.emoji} ${rank.name} (${members.length})**\n`;
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
    .setTimestamp();
}

async function updateList() {
  const embed = await buildEmbed();
  if (!embed) {
    throw new Error("Bot zit niet in een server.");
  }

  const channel = await client.channels.fetch(GANG_LIST_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    throw new Error(`Channel ${GANG_LIST_CHANNEL_ID} is geen tekstkanaal of bestaat niet.`);
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
      ),
    
    new SlashCommandBuilder()
      .setName("promo")
      .setDescription("Promoveer een lid (1=+1 rank, 2=+2 ranks, etc.)")
      .addIntegerOption(option =>
        option.setName("steps")
          .setDescription("Aantal stappen omhoog (1-9)")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(9))
      .addUserOption(option =>
        option.setName("user")
          .setDescription("Het lid dat gepromoveerd wordt")
          .setRequired(true))
      .addStringOption(option =>
        option.setName("reason")
          .setDescription("Reden voor promotie")
          .setRequired(true)),
    
    new SlashCommandBuilder()
      .setName("demote")
      .setDescription("Demoveer een lid (1=-1 rank, 2=-2 ranks, etc.)")
      .addIntegerOption(option =>
        option.setName("steps")
          .setDescription("Aantal stappen omlaag (1-9)")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(9))
      .addUserOption(option =>
        option.setName("user")
          .setDescription("Het lid dat gedemoveerd wordt")
          .setRequired(true))
      .addStringOption(option =>
        option.setName("reason")
          .setDescription("Reden voor demotie")
          .setRequired(true)),
    
    new SlashCommandBuilder()
      .setName("warn")
      .setDescription("Geef een waarschuwing aan een lid")
      .addIntegerOption(option =>
        option.setName("number")
          .setDescription("1 = 1e waarschuwing, 2 = 2e waarschuwing")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(2))
      .addUserOption(option =>
        option.setName("user")
          .setDescription("Het lid dat gewaarschuwd wordt")
          .setRequired(true))
      .addStringOption(option =>
        option.setName("reason")
          .setDescription("Reden voor waarschuwing")
          .setRequired(true)),
    
    new SlashCommandBuilder()
      .setName("afwezigheid")
      .setDescription("Meld je afwezigheid (iedereen kan dit gebruiken)")
      .addStringOption(option =>
        option.setName("reason")
          .setDescription("Reden van afwezigheid")
          .setRequired(true))
      .addStringOption(option =>
        option.setName("from")
          .setDescription("Vanaf welke datum (bijv. 27/04/2026)")
          .setRequired(true))
      .addStringOption(option =>
        option.setName("til")
          .setDescription("Tot welke datum (bijv. 30/04/2026 of ??)")
          .setRequired(true)),
  ].map(cmd => cmd.toJSON());

  try {
    const guild = client.guilds.cache.first();
    if (guild) {
      await guild.commands.set(commands);
      console.log(`✅ Commands geregistreerd in ${guild.name}`);
    } else {
      await client.application?.commands.set(commands);
      console.log("✅ Commands globaal geregistreerd");
    }
  } catch (err) {
    console.error("Failed to register commands:", err);
  }
}

// ========================================
// 🎮 COMMAND HANDLERS
// ========================================

async function handlePromote(interaction) {
  const steps = interaction.options.getInteger("steps");
  const targetUser = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason");
  const executor = interaction.member;
  const guild = interaction.guild;

  if (!hasAdminRole(executor)) {
    await interaction.reply({ content: "❌ Je hebt niet de juiste rol om dit commando te gebruiken!", flags: MessageFlags.Ephemeral });
    return;
  }

  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  if (!targetMember) {
    await interaction.reply({ content: "❌ Gebruiker niet gevonden in deze server!", flags: MessageFlags.Ephemeral });
    return;
  }

  const currentLevel = getCurrentRankLevel(targetMember);
  if (currentLevel === 0) {
    await interaction.reply({ content: `❌ ${targetUser.username} heeft geen gang rol!`, flags: MessageFlags.Ephemeral });
    return;
  }

  let newLevel = currentLevel + steps;
  if (newLevel > 10) newLevel = 10;
  if (newLevel === currentLevel) {
    await interaction.reply({ content: `❌ ${targetUser.username} is al op de hoogste rang!`, flags: MessageFlags.Ephemeral });
    return;
  }

  const newRoleId = getRoleIdByLevel(newLevel);
  if (!newRoleId) {
    await interaction.reply({ content: `❌ Kan niet promoveren naar niveau ${newLevel}`, flags: MessageFlags.Ephemeral });
    return;
  }

  const newRole = interaction.guild.roles.cache.get(newRoleId);
  const oldRankName = getRankNameByLevel(currentLevel);
  const newRankName = getRankNameByLevel(newLevel);

  try {
    await removeAllGangRoles(targetMember);
    await targetMember.roles.add(newRole);
    await interaction.reply({ content: `✅ ${targetUser.username} is gepromoveerd van ${oldRankName} naar ${newRankName} (+${steps})!` });
    await sendPromoEmbed(guild, targetMember, oldRankName, newRankName, reason, steps);
    await safeUpdateList();
  } catch (error) {
    console.error("Promote error:", error);
    if (!interaction.replied) {
      await interaction.reply({ content: `❌ Er ging iets mis: ${error.message}`, flags: MessageFlags.Ephemeral });
    }
  }
}

async function handleDemote(interaction) {
  const steps = interaction.options.getInteger("steps");
  const targetUser = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason");
  const executor = interaction.member;
  const guild = interaction.guild;

  if (!hasAdminRole(executor)) {
    await interaction.reply({ content: "❌ Je hebt niet de juiste rol om dit commando te gebruiken!", flags: MessageFlags.Ephemeral });
    return;
  }

  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  if (!targetMember) {
    await interaction.reply({ content: "❌ Gebruiker niet gevonden in deze server!", flags: MessageFlags.Ephemeral });
    return;
  }

  const currentLevel = getCurrentRankLevel(targetMember);
  if (currentLevel === 0) {
    await interaction.reply({ content: `❌ ${targetUser.username} heeft geen gang rol!`, flags: MessageFlags.Ephemeral });
    return;
  }

  let newLevel = currentLevel - steps;
  if (newLevel < 1) newLevel = 1;
  if (newLevel === currentLevel) {
    await interaction.reply({ content: `❌ ${targetUser.username} is al op de laagste rang!`, flags: MessageFlags.Ephemeral });
    return;
  }

  const newRoleId = getRoleIdByLevel(newLevel);
  if (!newRoleId) {
    await interaction.reply({ content: `❌ Kan niet demoveren naar niveau ${newLevel}`, flags: MessageFlags.Ephemeral });
    return;
  }

  const newRole = interaction.guild.roles.cache.get(newRoleId);
  const oldRankName = getRankNameByLevel(currentLevel);
  const newRankName = getRankNameByLevel(newLevel);

  try {
    await removeAllGangRoles(targetMember);
    await targetMember.roles.add(newRole);
    await interaction.reply({ content: `✅ ${targetUser.username} is gedemoveerd van ${oldRankName} naar ${newRankName} (-${steps})!` });
    await sendDemoteEmbed(guild, targetMember, oldRankName, newRankName, reason, steps);
    await safeUpdateList();
  } catch (error) {
    console.error("Demote error:", error);
    if (!interaction.replied) {
      await interaction.reply({ content: `❌ Er ging iets mis: ${error.message}`, flags: MessageFlags.Ephemeral });
    }
  }
}

async function handleWarn(interaction) {
  const number = interaction.options.getInteger("number");
  const targetUser = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason");
  const executor = interaction.member;

  if (!hasAdminRole(executor)) {
    await interaction.reply({ content: "❌ Je hebt niet de juiste rol om dit commando te gebruiken!", flags: MessageFlags.Ephemeral });
    return;
  }

  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  if (!targetMember) {
    await interaction.reply({ content: "❌ Gebruiker niet gevonden in deze server!", flags: MessageFlags.Ephemeral });
    return;
  }

  let warnRoleId = null;
  let warnLevel = "";
  
  if (number === 1) {
    warnRoleId = WARN_ROLE_LEVEL1;
    warnLevel = "1e Waarschuwing";
  } else if (number === 2) {
    warnRoleId = WARN_ROLE_LEVEL2;
    warnLevel = "2e Waarschuwing";
  } else {
    await interaction.reply({ content: "❌ Nummer moet 1 of 2 zijn!", flags: MessageFlags.Ephemeral });
    return;
  }

  const warnRole = interaction.guild.roles.cache.get(warnRoleId);
  if (!warnRole) {
    await interaction.reply({ content: `❌ Waarschuwingsrol niet gevonden!`, flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await targetMember.roles.add(warnRole);
    await interaction.reply({ content: `✅ ${targetUser.username} heeft een ${warnLevel} gekregen!` });
    await sendWarnEmbed(targetMember, warnLevel, reason);
  } catch (error) {
    console.error("Warn error:", error);
    if (!interaction.replied) {
      await interaction.reply({ content: `❌ Er ging iets mis: ${error.message}`, flags: MessageFlags.Ephemeral });
    }
  }
}

async function handleAfwezigheid(interaction) {
  const reason = interaction.options.getString("reason");
  const fromDate = interaction.options.getString("from");
  const tilDate = interaction.options.getString("til");
  const member = interaction.member;

  try {
    await interaction.reply({ content: `✅ ${member.user.username}, je afwezigheid is gemeld!`, flags: MessageFlags.Ephemeral });
    await sendAfwezigheidEmbed(member, reason, fromDate, tilDate);
  } catch (error) {
    console.error("Afwezigheid error:", error);
    if (!interaction.replied) {
      await interaction.reply({ content: `❌ Er ging iets mis: ${error.message}`, flags: MessageFlags.Ephemeral });
    }
  }
}

async function handleRefresh(interaction) {
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;
  await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : 0 });
  try {
    await updateList();
    await interaction.editReply("✅ Ledenlijst bijgewerkt.");
  } catch (err) {
    console.error("Refresh command failed:", err);
    await interaction.editReply(`❌ Bijwerken mislukt: ${err.message}`);
  }
}

// ========================================
// 🔄 EVENT HANDLERS
// ========================================

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
      currentGuild = guild;
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

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === "refresh") {
    await handleRefresh(interaction);
  } else if (interaction.commandName === "promo") {
    await handlePromote(interaction);
  } else if (interaction.commandName === "demote") {
    await handleDemote(interaction);
  } else if (interaction.commandName === "warn") {
    await handleWarn(interaction);
  } else if (interaction.commandName === "afwezigheid") {
    await handleAfwezigheid(interaction);
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

client.login(TOKEN);
