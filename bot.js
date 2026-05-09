import http from 'http';
import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

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
const WARN_CHANNEL_ID = "1475784747392172178";
const PROMO_CHANNEL_ID = "1478540121555996836";
const DEMOTE_CHANNEL_ID = "1502446924702290053";
const AFWEZIGHEID_CHANNEL_ID = "1475784751192477746";
const AANGENOMEN_CHANNEL_ID = "1499166962973151372";
const ONTSLAGEN_CHANNEL_ID = "1499167137334558790";

const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID ?? "1498067695692812528";
const WARN_ROLE_LEVEL1 = process.env.WARN_ROLE_LEVEL1 ?? "1475784712399224833";
const WARN_ROLE_LEVEL2 = process.env.WARN_ROLE_LEVEL2 ?? "1475784713376632832";
const LID_ROLE_ID = "1475784707844341780";
const PLACEHOLDER_IMAGE = "https://cdn.discordapp.com/embed/avatars/0.png";

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
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getFullDate() {
  const date = new Date();
  return date.toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function isValidDate(dateString) {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!regex.test(dateString)) return false;
  const parts = dateString.split('/');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
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

async function removeLidRole(member) {
  if (member.roles.cache.has(LID_ROLE_ID)) {
    await member.roles.remove(LID_ROLE_ID);
  }
}

function getServerIcon(guild) {
  if (guild && guild.iconURL()) {
    return guild.iconURL({ size: 1024 });
  }
  return PLACEHOLDER_IMAGE;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

let messageId = null;

async function buildEmbed() {
  const guild = client.guilds.cache.first();
  if (!guild) return null;
  let body = "";
  const uniqueMembers = new Set();
  for (const rank of sortedRanks) {
    const role = guild.roles.cache.get(rank.roleId);
    if (!role) {
      body += `**${rank.emoji} ${rank.name} (0)**\n➤ Rol niet gevonden\n\n`;
      continue;
    }
    const members = [...role.members.values()].map((m) => ({ id: m.id, name: displayName(m) })).sort((a, b) => getNumber(a.name) - getNumber(b.name));
    for (const m of members) uniqueMembers.add(m.id);
    body += `**${rank.emoji} ${rank.name} (${members.length})**\n`;
    if (members.length > 0) {
      for (const m of members) body += `➤ ${memberLink(m.id, m.name)}\n`;
    } else {
      body += `➤ Geen leden\n`;
    }
    body += `\n`;
  }
  const description = `**Totaal: ${uniqueMembers.size} leden**\n\n${body}`;
  return new EmbedBuilder().setTitle("🏴 Gang Ledenlijst").setColor(0x2b2b2b).setDescription(description.slice(0, 4096)).setFooter({ text: "🔄 Auto-update bij rolwijzigingen" }).setTimestamp();
}

async function updateList() {
  const embed = await buildEmbed();
  if (!embed) throw new Error("Bot zit niet in een server.");
  const channel = await client.channels.fetch(GANG_LIST_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) throw new Error(`Channel ${GANG_LIST_CHANNEL_ID} is geen tekstkanaal of bestaat niet.`);
  const payload = { embeds: [embed], allowedMentions: { parse: [] } };
  if (messageId) {
    try {
      const existing = await channel.messages.fetch(messageId);
      await existing.edit(payload);
      return;
    } catch (err) {
      messageId = null;
    }
  }
  try {
    const fetched = await channel.messages.fetch({ limit: 100 });
    const botMessages = fetched.filter((m) => m.author.id === client.user?.id);
    for (const m of botMessages.values()) await m.delete().catch(() => null);
  } catch (err) {}
  const sent = await channel.send(payload);
  messageId = sent.id;
}

async function safeUpdateList() {
  try { await updateList(); } catch (err) { console.error("Failed to update gang list:", err); }
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName("refresh").setDescription("Refresh de gang ledenlijst nu").addBooleanOption((option) => option.setName("ephemeral").setDescription("Toon alleen aan jou").setRequired(false)),
    new SlashCommandBuilder().setName("promo").setDescription("Promoveer een lid (1=+1 rank)").addIntegerOption(option => option.setName("steps").setDescription("Aantal stappen omhoog (1-9)").setRequired(true).setMinValue(1).setMaxValue(9)).addUserOption(option => option.setName("user").setDescription("Het lid dat gepromoveerd wordt").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reden voor promotie").setRequired(true)),
    new SlashCommandBuilder().setName("demote").setDescription("Demoveer een lid (1=-1 rank)").addIntegerOption(option => option.setName("steps").setDescription("Aantal stappen omlaag (1-9)").setRequired(true).setMinValue(1).setMaxValue(9)).addUserOption(option => option.setName("user").setDescription("Het lid dat gedemoveerd wordt").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reden voor demotie").setRequired(true)),
    new SlashCommandBuilder().setName("warn").setDescription("Geef een waarschuwing aan een lid").addIntegerOption(option => option.setName("number").setDescription("1 = 1e, 2 = 2e").setRequired(true).setMinValue(1).setMaxValue(2)).addUserOption(option => option.setName("user").setDescription("Het lid dat gewaarschuwd wordt").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reden voor waarschuwing").setRequired(true)),
    new SlashCommandBuilder().setName("removewarn").setDescription("Trek een waarschuwing in").addIntegerOption(option => option.setName("number").setDescription("1 = 1e, 2 = 2e").setRequired(true).setMinValue(1).setMaxValue(2)).addUserOption(option => option.setName("user").setDescription("Het lid waarvan de waarschuwing wordt ingetrokken").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reden voor intrekken").setRequired(true)),
    new SlashCommandBuilder().setName("aangenomen").setDescription("Neem een nieuw lid aan").addUserOption(option => option.setName("user").setDescription("Het lid dat wordt aangenomen").setRequired(true)).addStringOption(option => option.setName("rank").setDescription("Rang: Jefe, Sub Jefe, Encargado, Sicario, Paro, Activo, Chequeos, Colaborador, Soldado, Recruta").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reden voor aanname").setRequired(true)),
    new SlashCommandBuilder().setName("ontslagen").setDescription("Ontsla een lid").addUserOption(option => option.setName("user").setDescription("Het lid dat ontslagen wordt").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("Reden voor ontslag").setRequired(true)),
    new SlashCommandBuilder().setName("afwezigheid").setDescription("Meld je afwezigheid (DD/MM/YYYY)").addStringOption(option => option.setName("reason").setDescription("Reden van afwezigheid").setRequired(true)).addStringOption(option => option.setName("from").setDescription("Vanaf (DD/MM/YYYY)").setRequired(true)).addStringOption(option => option.setName("til").setDescription("Tot (DD/MM/YYYY of ??)").setRequired(true)),
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
// 📨 EMBED FUNCTIONS - WITTE BALK, EMOJIS, ALLES ONDER ELKAAR
// ========================================

async function sendPromoEmbed(guild, user, oldRank, newRank, reason, steps) {
  const channel = await client.channels.fetch(PROMO_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle("📈 PROMOTIE")
    .setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "📌 Van", value: oldRank, inline: false },
      { name: "🎯 Naar", value: newRank, inline: false },
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    )
    .setColor(0xFFFFFF)
    .setFooter({ text: "MK-13 Bot" })
    .setTimestamp()
    .setThumbnail(getServerIcon(guild));

  await channel.send({ embeds: [embed] });
}

async function sendDemoteEmbed(guild, user, oldRank, newRank, reason, steps) {
  const channel = await client.channels.fetch(DEMOTE_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle("📉 DEMOTIE")
    .setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "📌 Van", value: oldRank, inline: false },
      { name: "⬇️ Naar", value: newRank, inline: false },
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    )
    .setColor(0xFFFFFF)
    .setFooter({ text: "MK-13 Bot" })
    .setTimestamp()
    .setThumbnail(getServerIcon(guild));

  await channel.send({ embeds: [embed] });
}

async function sendWarnEmbed(user, warnLevel, reason) {
  const channel = await client.channels.fetch(WARN_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;

  const embed = new EmbedBuilder()
    .setTitle("⚠️ WAARSCHUWING")
    .setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "⚠️ Niveau", value: warnLevel, inline: false },
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    )
    .setColor(0xFFFFFF)
    .setFooter({ text: "MK-13 Bot" })
    .setTimestamp()
    .setThumbnail(userAvatar);

  await channel.send({ embeds: [embed] });
}

async function sendRemoveWarnEmbed(user, warnLevel, reason) {
  const channel = await client.channels.fetch(WARN_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;

  const embed = new EmbedBuilder()
    .setTitle("✅ WAARSCHUWING INGETROKKEN")
    .setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "⚠️ Niveau", value: warnLevel, inline: false },
      { name: "📝 Reden ingetrokken", value: reason, inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    )
    .setColor(0xFFFFFF)
    .setFooter({ text: "MK-13 Bot" })
    .setTimestamp()
    .setThumbnail(userAvatar);

  await channel.send({ embeds: [embed] });
}

async function sendAangenomenEmbed(guild, user, rank, reason) {
  const channel = await client.channels.fetch(AANGENOMEN_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;

  const embed = new EmbedBuilder()
    .setTitle("✅ AANGENOMEN")
    .setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "🎯 Rang", value: rank, inline: false },
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    )
    .setColor(0xFFFFFF)
    .setFooter({ text: "MK-13 Bot" })
    .setTimestamp()
    .setThumbnail(userAvatar);

  await channel.send({ embeds: [embed] });
}

async function sendOntslagenEmbed(user, reason) {
  const channel = await client.channels.fetch(ONTSLAGEN_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;

  const embed = new EmbedBuilder()
    .setTitle("❌ ONTSLAGEN")
    .setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    )
    .setColor(0xFFFFFF)
    .setFooter({ text: "MK-13 Bot" })
    .setTimestamp()
    .setThumbnail(userAvatar);

  await channel.send({ embeds: [embed] });
}

async function sendAfwezigheidEmbed(user, reason, fromDate, tilDate) {
  const channel = await client.channels.fetch(AFWEZIGHEID_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;
  const tilText = tilDate === "??" || tilDate === "Onbekend" || !tilDate ? "??" : tilDate;

  const embed = new EmbedBuilder()
    .setTitle("📋 AFWEZIGHEID")
    .setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Vanaf", value: fromDate, inline: false },
      { name: "📅 Tot", value: tilText, inline: false },
      { name: "📅 Gemeld op", value: getFullDate(), inline: false }
    )
    .setColor(0xFFFFFF)
    .setFooter({ text: "MK-13 Bot" })
    .setTimestamp()
    .setThumbnail(userAvatar);

  await channel.send({ embeds: [embed] });
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
    if (!interaction.replied) await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
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
    if (!interaction.replied) await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
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
  const warnRoleId = number === 1 ? WARN_ROLE_LEVEL1 : WARN_ROLE_LEVEL2;
  const warnLevel = number === 1 ? "1e Waarschuwing" : "2e Waarschuwing";
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
    if (!interaction.replied) await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
  }
}

async function handleRemoveWarn(interaction) {
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
  const warnRoleId = number === 1 ? WARN_ROLE_LEVEL1 : WARN_ROLE_LEVEL2;
  const warnLevel = number === 1 ? "1e Waarschuwing" : "2e Waarschuwing";
  const warnRole = interaction.guild.roles.cache.get(warnRoleId);
  if (!warnRole) {
    await interaction.reply({ content: `❌ Waarschuwingsrol niet gevonden!`, flags: MessageFlags.Ephemeral });
    return;
  }
  if (!targetMember.roles.cache.has(warnRoleId)) {
    await interaction.reply({ content: `❌ ${targetUser.username} heeft geen ${warnLevel}!`, flags: MessageFlags.Ephemeral });
    return;
  }
  try {
    await targetMember.roles.remove(warnRole);
    await interaction.reply({ content: `✅ ${targetUser.username} zijn ${warnLevel} is ingetrokken!` });
    await sendRemoveWarnEmbed(targetMember, warnLevel, reason);
  } catch (error) {
    console.error("RemoveWarn error:", error);
    if (!interaction.replied) await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
  }
}

async function handleAangenomen(interaction) {
  const targetUser = interaction.options.getUser("user");
  const rankName = interaction.options.getString("rank");
  const reason = interaction.options.getString("reason");
  const executor = interaction.member;
  const guild = interaction.guild;
  if (!hasAdminRole(executor)) {
    await interaction.reply({ content: "❌ Je hebt niet de juiste rol om dit commando te gebruiken!", flags: MessageFlags.Ephemeral });
    return;
  }
  const rank = ranks.find(r => r.name.toLowerCase() === rankName.toLowerCase());
  if (!rank) {
    const validRanks = ranks.map(r => r.name).join(", ");
    await interaction.reply({ content: `❌ Ongeldige rang! Gebruik: ${validRanks}`, flags: MessageFlags.Ephemeral });
    return;
  }
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  if (!targetMember) {
    await interaction.reply({ content: "❌ Gebruiker niet gevonden!", flags: MessageFlags.Ephemeral });
    return;
  }
  const roleToAdd = interaction.guild.roles.cache.get(rank.roleId);
  const lidRole = interaction.guild.roles.cache.get(LID_ROLE_ID);
  if (!roleToAdd || !lidRole) {
    await interaction.reply({ content: `❌ Rol niet gevonden!`, flags: MessageFlags.Ephemeral });
    return;
  }
  try {
    await removeAllGangRoles(targetMember);
    await targetMember.roles.add(roleToAdd);
    await targetMember.roles.add(lidRole);
    await interaction.reply({ content: `✅ ${targetUser.username} is aangenomen als ${rank.name}!` });
    await sendAangenomenEmbed(guild, targetMember, rank.name, reason);
    await safeUpdateList();
  } catch (error) {
    console.error("Aangenomen error:", error);
    if (!interaction.replied) await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
  }
}

async function handleOntslagen(interaction) {
  const targetUser = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason");
  const executor = interaction.member;
  if (!hasAdminRole(executor)) {
    await interaction.reply({ content: "❌ Je hebt niet de juiste rol om dit commando te gebruiken!", flags: MessageFlags.Ephemeral });
    return;
  }
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  if (!targetMember) {
    await interaction.reply({ content: "❌ Gebruiker niet gevonden!", flags: MessageFlags.Ephemeral });
    return;
  }
  try {
    await removeAllGangRoles(targetMember);
    await removeLidRole(targetMember);
    await interaction.reply({ content: `✅ ${targetUser.username} is ontslagen!` });
    await sendOntslagenEmbed(targetMember, reason);
    await safeUpdateList();
  } catch (error) {
    console.error("Ontslagen error:", error);
    if (!interaction.replied) await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
  }
}

async function handleAfwezigheid(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const reason = interaction.options.getString("reason");
    const fromDate = interaction.options.getString("from");
    const tilDate = interaction.options.getString("til");
    const member = interaction.member;
    if (!isValidDate(fromDate)) {
      await interaction.editReply({ content: "❌ Ongeldig formaat! Gebruik DD/MM/YYYY" });
      return;
    }
    if (tilDate !== "??" && tilDate !== "Onbekend" && !isValidDate(tilDate)) {
      await interaction.editReply({ content: "❌ Ongeldig formaat! Gebruik DD/MM/YYYY of ??" });
      return;
    }
    await sendAfwezigheidEmbed(member, reason, fromDate, tilDate);
    await interaction.editReply({ content: `✅ ${member.user.username}, je afwezigheid is gemeld!` });
  } catch (error) {
    console.error("Afwezigheid error:", error);
    if (!interaction.replied) await interaction.editReply({ content: `❌ ${error.message}` });
  }
}

async function handleRefresh(interaction) {
  const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;
  await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : 0 });
  try {
    await updateList();
    await interaction.editReply("✅ Ledenlijst bijgewerkt.");
  } catch (err) {
    await interaction.editReply(`❌ ${err.message}`);
  }
}

const watchedRoleIds = new Set(ranks.map(r => r.roleId));
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
  } catch (err) {}
  await registerCommands();
  await safeUpdateList();
});

client.on("guildMemberUpdate", (oldMember, newMember) => {
  const oldRoles = new Set(oldMember.roles.cache.keys());
  const newRoles = new Set(newMember.roles.cache.keys());
  let changed = false;
  for (const id of oldRoles) if (!newRoles.has(id)) changed = true;
  for (const id of newRoles) if (!oldRoles.has(id))
