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

// Role IDs for admin commands
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID ?? "1498067695692812528";
const WARN_ROLE_LEVEL1 = process.env.WARN_ROLE_LEVEL1 ?? "1475784712399224833";
const WARN_ROLE_LEVEL2 = process.env.WARN_ROLE_LEVEL2 ?? "1475784713376632832";

const ranks = [
  { name: "👑 Jefe", roleId: process.env.ROLE_JEFE ?? "1475784693407420541", level: 10 },
  { name: "🧠 Sub Jefe", roleId: process.env.ROLE_SUB_JEFE ?? "1475784695689252999", level: 9 },
  { name: "🎯 Encargado", roleId: process.env.ROLE_ENCARGADO ?? "1499735272299040798", level: 8 },
  { name: "🔫 Sicario", roleId: process.env.ROLE_SICARIO ?? "1475784696553144321", level: 7 },
  { name: "💰 Paro", roleId: process.env.ROLE_PARO ?? "1478541802494627841", level: 6 },
  { name: "⚡ Activo", roleId: process.env.ROLE_ACTIVO ?? "1499735621156081774", level: 5 },
  { name: "📦 Chequeos", roleId: process.env.ROLE_CHEQUEOS ?? "1475784700982329407", level: 4 },
  { name: "🤝 Colaborador", roleId: process.env.ROLE_COLABORADOR ?? "1499736095158435960", level: 3 },
  { name: "🪖 Soldado", roleId: process.env.ROLE_SOLDADO ?? "1475784699073921104", level: 2 },
  { name: "🆕 Recruta", roleId: process.env.ROLE_RECRUTA ?? "1475784699753267364", level: 1 },
];

// Sort ranks by level (highest first for easier promotion logic)
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

// Helper function to check if user has admin role
function hasAdminRole(member) {
  return member.roles.cache.has(ADMIN_ROLE_ID);
}

// Helper function to get current rank level of a member
function getCurrentRankLevel(member) {
  for (const rank of sortedRanks) {
    if (member.roles.cache.has(rank.roleId)) {
      return rank.level;
    }
  }
  return 0; // No gang role found
}

// Helper function to get role ID by level
function getRoleIdByLevel(level) {
  const rank = ranks.find(r => r.level === level);
  return rank ? rank.roleId : null;
}

// Helper function to remove all gang roles from a member
async function removeAllGangRoles(member) {
  const gangRoleIds = ranks.map(r => r.roleId);
  const rolesToRemove = member.roles.cache.filter(role => gangRoleIds.includes(role.id));
  if (rolesToRemove.size > 0) {
    await member.roles.remove(rolesToRemove);
  }
}

// Helper function to send embed to gang channel (VISIBLE TO EVERYONE)
async function sendActionEmbed(title, user, reason, actionType = "promotion") {
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    console.error("Cannot send embed: Channel not found");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Datum", value: new Date().toLocaleString('nl-NL'), inline: false }
    )
    .setColor(actionType === "promotion" ? 0x00FF00 : (actionType === "demotion" ? 0xFF0000 : 0xFFA500))
    .setTimestamp();

  await channel.send({ embeds: [embed] });
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
    // Existing refresh command
    new SlashCommandBuilder()
      .setName("refresh")
      .setDescription("Refresh de gang ledenlijst nu")
      .addBooleanOption((option) =>
        option.setName("ephemeral").setDescription("Toon alleen aan jou").setRequired(false)
      ),
    
    // PROMOTE command
    new SlashCommandBuilder()
      .setName("promo")
      .setDescription("Promoveer een lid naar een hogere rang")
      .addIntegerOption(option =>
        option.setName("number")
          .setDescription("Het rang nummer (1-10, 10 is hoogste)")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(10))
      .addUserOption(option =>
        option.setName("user")
          .setDescription("Het lid dat gepromoveerd wordt")
          .setRequired(true))
      .addStringOption(option =>
        option.setName("reason")
          .setDescription("Reden voor promotie")
          .setRequired(true)),
    
    // DEMOTE command
    new SlashCommandBuilder()
      .setName("demote")
      .setDescription("Demoveer een lid naar een lagere rang")
      .addIntegerOption(option =>
        option.setName("number")
          .setDescription("Het rang nummer (1-10, 1 is laagste)")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(10))
      .addUserOption(option =>
        option.setName("user")
          .setDescription("Het lid dat gedemoveerd wordt")
          .setRequired(true))
      .addStringOption(option =>
        option.setName("reason")
          .setDescription("Reden voor demotie")
          .setRequired(true)),
    
    // WARN command
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

// PROMOTE command handler
async function handlePromote(interaction) {
  const number = interaction.options.getInteger("number");
  const targetUser = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason");
  const executor = interaction.member;

  // Check admin role
  if (!hasAdminRole(executor)) {
    await interaction.reply({ content: "❌ Je hebt niet de juiste rol om dit commando te gebruiken!", ephemeral: true });
    return;
  }

  // Get the target member
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  if (!targetMember) {
    await interaction.reply({ content: "❌ Gebruiker niet gevonden in deze server!", ephemeral: true });
    return;
  }

  // Get the new role ID based on number
  const newRoleId = getRoleIdByLevel(number);
  if (!newRoleId) {
    await interaction.reply({ content: `❌ Rang nummer ${number} bestaat niet! Gebruik 1-10.`, ephemeral: true });
    return;
  }

  const newRole = interaction.guild.roles.cache.get(newRoleId);
  if (!newRole) {
    await interaction.reply({ content: `❌ Rol voor rang ${number} niet gevonden!`, ephemeral: true });
    return;
  }

  try {
    // Remove all old gang roles and add the new one
    await removeAllGangRoles(targetMember);
    await targetMember.roles.add(newRole);
    
    // Send confirmation (VISIBLE TO EVERYONE - no ephemeral)
    await interaction.reply({ content: `✅ ${targetUser} is gepromoveerd naar ${newRole.name}!` });
    
    // Send embed to gang channel (VISIBLE TO EVERYONE)
    await sendActionEmbed(`## PROMOTIE MK-13`, targetMember, reason, "promotion");
    
    // Update the member list
    await safeUpdateList();
  } catch (error) {
    console.error("Promote error:", error);
    await interaction.reply({ content: `❌ Er ging iets mis: ${error.message}`, ephemeral: true });
  }
}

// DEMOTE command handler
async function handleDemote(interaction) {
  const number = interaction.options.getInteger("number");
  const targetUser = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason");
  const executor = interaction.member;

  // Check admin role
  if (!hasAdminRole(executor)) {
    await interaction.reply({ content: "❌ Je hebt niet de juiste rol om dit commando te gebruiken!", ephemeral: true });
    return;
  }

  // Get the target member
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  if (!targetMember) {
    await interaction.reply({ content: "❌ Gebruiker niet gevonden in deze server!", ephemeral: true });
    return;
  }

  // Get the new role ID based on number
  const newRoleId = getRoleIdByLevel(number);
  if (!newRoleId) {
    await interaction.reply({ content: `❌ Rang nummer ${number} bestaat niet! Gebruik 1-10.`, ephemeral: true });
    return;
  }

  const newRole = interaction.guild.roles.cache.get(newRoleId);
  if (!newRole) {
    await interaction.reply({ content: `❌ Rol voor rang ${number} niet gevonden!`, ephemeral: true });
    return;
  }

  try {
    // Remove all old gang roles and add the new one
    await removeAllGangRoles(targetMember);
    await targetMember.roles.add(newRole);
    
    // Send confirmation (VISIBLE TO EVERYONE - no ephemeral)
    await interaction.reply({ content: `✅ ${targetUser} is gedemoveerd naar ${newRole.name}!` });
    
    // Send embed to gang channel (VISIBLE TO EVERYONE)
    await sendActionEmbed(`## DEMOTE MK-13`, targetMember, reason, "demotion");
    
    // Update the member list
    await safeUpdateList();
  } catch (error) {
    console.error("Demote error:", error);
    await interaction.reply({ content: `❌ Er ging iets mis: ${error.message}`, ephemeral: true });
  }
}

// WARN command handler
async function handleWarn(interaction) {
  const number = interaction.options.getInteger("number");
  const targetUser = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason");
  const executor = interaction.member;

  // Check admin role
  if (!hasAdminRole(executor)) {
    await interaction.reply({ content: "❌ Je hebt niet de juiste rol om dit commando te gebruiken!", ephemeral: true });
    return;
  }

  // Get the target member
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  if (!targetMember) {
    await interaction.reply({ content: "❌ Gebruiker niet gevonden in deze server!", ephemeral: true });
    return;
  }

  // Determine which warn role to add
  let warnRoleId = null;
  let warnLevel = "";
  
  if (number === 1) {
    warnRoleId = WARN_ROLE_LEVEL1;
    warnLevel = "1e Waarschuwing";
  } else if (number === 2) {
    warnRoleId = WARN_ROLE_LEVEL2;
    warnLevel = "2e Waarschuwing";
  } else {
    await interaction.reply({ content: "❌ Nummer moet 1 of 2 zijn!", ephemeral: true });
    return;
  }

  const warnRole = interaction.guild.roles.cache.get(warnRoleId);
  if (!warnRole) {
    await interaction.reply({ content: `❌ Waarschuwingsrol niet gevonden! Neem contact op met een beheerder.`, ephemeral: true });
    return;
  }

  try {
    // Add the warn role
    await targetMember.roles.add(warnRole);
    
    // Send confirmation (VISIBLE TO EVERYONE - no ephemeral)
    await interaction.reply({ content: `✅ ${targetUser} heeft een ${warnLevel} gekregen!` });
    
    // Send embed to gang channel (VISIBLE TO EVERYONE)
    await sendActionEmbed(`## WARN MK-13`, targetMember, reason, "warn");
    
  } catch (error) {
    console.error("Warn error:", error);
    await interaction.reply({ content: `❌ Er ging iets mis: ${error.message}`, ephemeral: true });
  }
}

// REFRESH command handler
async function handleRefresh(interaction) {
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false; // Changed to false by default
  await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : 0 });
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

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  // Route commands to their handlers
  if (interaction.commandName === "refresh") {
    await handleRefresh(interaction);
  } else if (interaction.commandName === "promo") {
    await handlePromote(interaction);
  } else if (interaction.commandName === "demote") {
    await handleDemote(interaction);
  } else if (interaction.commandName === "warn") {
    await handleWarn(interaction);
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

client.login(TOKEN);
