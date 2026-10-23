import http from 'http';
import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  AttachmentBuilder,
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

// ===== Bestaande settings =====
const GANG_LIST_CHANNEL_ID = "1562120631288471679";
const WELCOME_CHANNEL_ID = "1562120631288471675";
const ROLE_CHANGE_DEBOUNCE_MS = 3000;
const WARN_CHANNEL_ID = "1562127877623775242";
const PROMO_CHANNEL_ID = "1562127760640573491";
const DEMOTE_CHANNEL_ID = "1562127789455310960";
const AFWEZIGHEID_CHANNEL_ID = "1562130183350390834";
const AANGENOMEN_CHANNEL_ID = "1563302341455642674";
const ONTSLAGEN_CHANNEL_ID = "1563302151642546286";

// ===== Ticket settings =====
const TICKET_PANEL_CHANNEL_ID = "1562120631837794335";
const TICKET_SUPPORT_ROLE_ID = "1554510750092099688";
const TICKET_TRANSCRIPT_CHANNEL_ID = "1562120636095143950";

const TICKET_CATEGORIES = {
  application: {
    name: "Sollicitatie",
    prefix: "sollicitatie",
    categoryId: "1562120636095143951",
    emoji: "📝",
    color: 0xf39c12,
    isApplication: true,
  },
  partner: {
    name: "Partner",
    prefix: "partner",
    categoryId: "1562120636707377165",
    emoji: "🤝",
    color: 0xe91e63,
  },
};

const APPLICATION_QUESTIONS = [
  { id: "naam", label: "Wat is je naam?", placeholder: "Je volledige naam", style: TextInputStyle.Short, max: 100 },
  { id: "leeftijd", label: "Hoe oud ben je?", placeholder: "Bijv. 17", style: TextInputStyle.Short, max: 10 },
  { id: "discord", label: "Wat is je Discord tag?", placeholder: "username#0000 of @username", style: TextInputStyle.Short, max: 100 },
  { id: "ervaring", label: "Heb je ervaring met dit soort werk?", placeholder: "Vertel kort over je ervaring", style: TextInputStyle.Paragraph, max: 500 },
  { id: "motivatie", label: "Waarom wil je bij ons team?", placeholder: "Je motivatie", style: TextInputStyle.Paragraph, max: 500 },
  { id: "beschikbaarheid", label: "Hoeveel uur per week ben je beschikbaar?", placeholder: "Bijv. 20 uur", style: TextInputStyle.Short, max: 50 },
];

const SUPPORT_TICKET_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageThreads,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.UseExternalEmojis,
];

// ===== Bestaande role settings =====
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID ?? "1562120626766880810";
const MOD_ROLE_ID = "1562120626766880810";
const WARN_ROLE_LEVEL1 = process.env.WARN_ROLE_LEVEL1 ?? "1562120626754429040";
const WARN_ROLE_LEVEL2 = process.env.WARN_ROLE_LEVEL2 ?? "1562120626754429039";
const LID_ROLE_ID = "1562120626766880809";
const LID_NAME_PREFIX = "𝙆 | ";
const PLACEHOLDER_IMAGE = "https://cdn.discordapp.com/attachments/1563299912110575677/1563300098715418744/Kozlov.png?ex=6add202c&is=6adbceac&hm=9d10395d90b1d72e72c7b3a257263227bda7abba68c048e26a26efbb85022942&";

const FOOTER_TEXT = "Kozlov • Future Roleplay";

const ranks = [
  { name: "Босс | Boss", roleId: process.env.ROLE_JEFE ?? "1562120626779721779", level: 9, emoji: "👑" },
  { name: "Зам | Underboss", roleId: process.env.ROLE_SUB_JEFE ?? "1562120626766880818", level: 8, emoji: "🎩" },
  { name: "Правая рука | Right Hand", roleId: process.env.ROLE_ENCARGADO ?? "1562120626766880817", level: 7, emoji: "🤝" },
  { name: "Ядро | Core", roleId: process.env.ROLE_SICARIO ?? "1562120626766880816", level: 6, emoji: "💎" },
  { name: "Оператор | Operator", roleId: process.env.ROLE_ACTIVO ?? "1562120626766880815", level: 5, emoji: "🎯" },
  { name: "Солдат | Soldier", roleId: process.env.ROLE_CHEQUEOS ?? "1562120626766880814", level: 4, emoji: "🪖" },
  { name: "Ассоциированный | Associate", roleId: process.env.ROLE_COLABORADOR ?? "1562120626766880813", level: 3, emoji: "🔗" },
  { name: "Перспектива | Prospect", roleId: process.env.ROLE_SOLDADO ?? "1562120626766880812", level: 2, emoji: "🌱" },
  { name: "Тусовщик | Hangaround", roleId: process.env.ROLE_RECRUTA ?? "1562120626766880811", level: 1, emoji: "🚬" },
];

const sortedRanks = [...ranks].sort((a, b) => b.level - a.level);

// ===== Bestaande helpers =====
function getNumber(name) {
  const match = name.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
}

function displayName(member) { return member.displayName; }
function memberLink(id, _name) { return `<@!${id}>`; }

function getCurrentDate() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getFullDate() {
  return new Date().toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric' });
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

function hasAdminRole(member) { return member.roles.cache.has(ADMIN_ROLE_ID); }
function hasModRole(member) { return member.roles.cache.has(MOD_ROLE_ID) || member.roles.cache.has(ADMIN_ROLE_ID); }
function getRoleIdByLevel(level) { const r = ranks.find(r => r.level === level); return r ? r.roleId : null; }
function getRankNameByLevel(level) { const r = ranks.find(r => r.level === level); return r ? r.name : null; }

function getCurrentRankLevel(member) {
  for (const rank of sortedRanks) {
    if (member.roles.cache.has(rank.roleId)) return rank.level;
  }
  return 0;
}

async function removeAllGangRoles(member) {
  const gangRoleIds = ranks.map(r => r.roleId);
  const rolesToRemove = member.roles.cache.filter(role => gangRoleIds.includes(role.id));
  if (rolesToRemove.size > 0) await member.roles.remove(rolesToRemove);
}

async function removeLidRole(member) {
  if (member.roles.cache.has(LID_ROLE_ID)) await member.roles.remove(LID_ROLE_ID);
}

async function applyLidPrefix(member) {
  try {
    if (member.user.bot) return;
    if (member.roles.cache.has(LID_ROLE_ID)) {
      if (!member.displayName.startsWith(LID_NAME_PREFIX)) {
        await member.setNickname(`${LID_NAME_PREFIX}${member.displayName}`.slice(0, 32));
      }
    } else {
      if (member.displayName.startsWith(LID_NAME_PREFIX)) {
        const newName = member.displayName.slice(LID_NAME_PREFIX.length);
        await member.setNickname(newName || null);
      }
    }
  } catch (error) { console.error("Failed to update lid prefix:", error); }
}

function getServerIcon(guild) {
  if (guild && guild.iconURL()) return guild.iconURL({ size: 1024 });
  return PLACEHOLDER_IMAGE;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
  ],
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
    if (members.length > 0) for (const m of members) body += `➤ ${memberLink(m.id, m.name)}\n`;
    else body += `➤ Geen leden\n`;
    body += `\n`;
  }
  const description = `**Totaal: ${uniqueMembers.size} leden**\n\n${body}`;
  return new EmbedBuilder().setTitle("🏴 Kozlov Ledenlijst").setColor(0x2b2b2b).setDescription(description.slice(0, 4096)).setFooter({ text: FOOTER_TEXT }).setTimestamp();
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
    } catch (err) { messageId = null; }
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

// ===== Welcome =====
async function sendWelcomeMessage(member) {
  try {
    const channel = await client.channels.fetch(WELCOME_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;
    const userAvatar = member.user?.avatarURL() || member.displayAvatarURL() || PLACEHOLDER_IMAGE;
    const memberCount = member.guild.memberCount;
    const embed = new EmbedBuilder()
      .setTitle("👋 WELKOM!")
      .setDescription(`Welkom ${memberLink(member.id, member.displayName)} in de **Kozlov** Discord server!`)
      .addFields(
        { name: "📊 Totaal leden", value: `${memberCount}`, inline: true },
        { name: "📅 Datum", value: getCurrentDate(), inline: true }
      )
      .setColor(0xFFFFFF).setFooter({ text: FOOTER_TEXT }).setTimestamp().setThumbnail(userAvatar);
    await channel.send({ embeds: [embed] });
  } catch (error) { console.error("Welcome message error:", error); }
}

// ===== Bestaande embed functies =====
async function sendPromoEmbed(guild, user, oldRank, newRank, reason, steps) {
  const channel = await client.channels.fetch(PROMO_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;
  const embed = new EmbedBuilder().setTitle("📈 PROMOTIE").setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "📌 Van", value: oldRank, inline: false },
      { name: "🎯 Naar", value: newRank, inline: false },
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    ).setColor(0xFFFFFF).setFooter({ text: FOOTER_TEXT }).setTimestamp().setThumbnail(getServerIcon(guild));
  await channel.send({ embeds: [embed] });
}

async function sendDemoteEmbed(guild, user, oldRank, newRank, reason, steps) {
  const channel = await client.channels.fetch(DEMOTE_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;
  const embed = new EmbedBuilder().setTitle("📉 DEMOTIE").setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "📌 Van", value: oldRank, inline: false },
      { name: "⬇️ Naar", value: newRank, inline: false },
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    ).setColor(0xFFFFFF).setFooter({ text: FOOTER_TEXT }).setTimestamp().setThumbnail(getServerIcon(guild));
  await channel.send({ embeds: [embed] });
}

async function sendWarnEmbed(user, warnLevel, reason) {
  const channel = await client.channels.fetch(WARN_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;
  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;
  const embed = new EmbedBuilder().setTitle("⚠️ WAARSCHUWING").setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "⚠️ Niveau", value: warnLevel, inline: false },
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    ).setColor(0xFFFFFF).setFooter({ text: FOOTER_TEXT }).setTimestamp().setThumbnail(userAvatar);
  await channel.send({ embeds: [embed] });
}

async function sendRemoveWarnEmbed(user, warnLevel, reason) {
  const channel = await client.channels.fetch(WARN_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;
  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;
  const embed = new EmbedBuilder().setTitle("✅ WAARSCHUWING INGETROKKEN").setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "⚠️ Niveau", value: warnLevel, inline: false },
      { name: "📝 Reden ingetrokken", value: reason, inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    ).setColor(0xFFFFFF).setFooter({ text: FOOTER_TEXT }).setTimestamp().setThumbnail(userAvatar);
  await channel.send({ embeds: [embed] });
}

async function sendAangenomenEmbed(guild, user, rank, reason) {
  const channel = await client.channels.fetch(AANGENOMEN_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;
  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;
  const embed = new EmbedBuilder().setTitle("✅ AANGENOMEN").setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "🎯 Rang", value: rank, inline: false },
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    ).setColor(0xFFFFFF).setFooter({ text: FOOTER_TEXT }).setTimestamp().setThumbnail(userAvatar);
  await channel.send({ embeds: [embed] });
}

async function sendOntslagenEmbed(user, reason) {
  const channel = await client.channels.fetch(ONTSLAGEN_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;
  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;
  const embed = new EmbedBuilder().setTitle("❌ ONTSLAGEN").setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    ).setColor(0xFFFFFF).setFooter({ text: FOOTER_TEXT }).setTimestamp().setThumbnail(userAvatar);
  await channel.send({ embeds: [embed] });
}

async function sendAfwezigheidEmbed(user, reason, fromDate, tilDate) {
  const channel = await client.channels.fetch(AFWEZIGHEID_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;
  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;
  const tilText = !tilDate || tilDate.trim().length === 0 ? "??" : tilDate;
  const embed = new EmbedBuilder().setTitle("📋 AFWEZIGHEID").setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Vanaf", value: fromDate, inline: false },
      { name: "📅 Tot", value: tilText, inline: false },
      { name: "📅 Gemeld op", value: getFullDate(), inline: false }
    ).setColor(0xFFFFFF).setFooter({ text: FOOTER_TEXT }).setTimestamp().setThumbnail(userAvatar);
  await channel.send({ embeds: [embed] });
}

async function sendMuteEmbed(user, minutes, reason) {
  const channel = await client.channels.fetch(WARN_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;
  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;
  const embed = new EmbedBuilder().setTitle("🔇 GEMUTE").setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "⏱️ Duur", value: `${minutes} minuten`, inline: false },
      { name: "📝 Reden", value: reason, inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    ).setColor(0xFFFFFF).setFooter({ text: FOOTER_TEXT }).setTimestamp().setThumbnail(userAvatar);
  await channel.send({ embeds: [embed] });
}

async function sendUnmuteEmbed(user, reason) {
  const channel = await client.channels.fetch(WARN_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;
  const userAvatar = user.user?.avatarURL() || user.displayAvatarURL() || PLACEHOLDER_IMAGE;
  const embed = new EmbedBuilder().setTitle("🔊 GEUNMUTE").setDescription(`${memberLink(user.id, user.displayName)}`)
    .addFields(
      { name: "📝 Reden", value: reason || "Geen reden", inline: false },
      { name: "📅 Datum", value: getCurrentDate(), inline: false }
    ).setColor(0xFFFFFF).setFooter({ text: FOOTER_TEXT }).setTimestamp().setThumbnail(userAvatar);
  await channel.send({ embeds: [embed] });
}

async function sendSollicitatieFormulier(interaction) {
  const guild = interaction.guild;
  const embed = new EmbedBuilder()
    .setAuthor({ name: "KOZLOV", iconURL: getServerIcon(guild) })
    .setTitle("📝 Sollicitatieformulier")
    .setDescription(
      "Vul alle vragen **eerlijk en volledig** in. We verwachten serieuze antwoorden en respect voor onze gang.\n\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )
    .setColor(0x8B0000).setThumbnail(getServerIcon(guild))
    .addFields(
      { name: "**01 — Persoonlijke gegevens**", value: "> **Naam:**\n> **Leeftijd:**\n> **Discord:**\n> **IC-naam:**\n> **IC-leeftijd:**", inline: false },
      { name: "**02 — Ervaring**", value: "> **Ervaring met Serious RP:**\n> **Eerdere gangervaring:**\n> **Activiteit per dag:**", inline: false },
      { name: "**03 — Character**", value: "> **Totale waarde van je character:**\n> **Waarom wil je bij Kozlov?**\n> **Wat kun jij toevoegen aan Kozlov?**\n> **Waarom moeten wij jou aannemen?**", inline: false },
      { name: "**04 — Akkoord**", value: "> **Ben je bekend met de serverregels?**\n> **Ben je bereid je aan de regels en hiërarchie van Kozlov te houden?**", inline: false }
    )
    .setFooter({ text: FOOTER_TEXT, iconURL: getServerIcon(guild) })
    .setTimestamp();
  await interaction.channel.send({ embeds: [embed] });
}

// ===== Mute system =====
const activeMutes = new Map();

async function applyMute(member, minutes, reason) {
  try {
    let muteRole = member.guild.roles.cache.find(r => r.name === "Gemute");
    if (!muteRole) {
      muteRole = await member.guild.roles.create({
        name: "Gemute", color: 0x808080, permissions: [], reason: "Role for muted members"
      });
      for (const channel of member.guild.channels.cache.values()) {
        try {
          await channel.permissionOverwrites.edit(muteRole, {
            SendMessages: false, AddReactions: false, Speak: false, Connect: false,
            RequestToSpeak: false, CreatePublicThreads: false, CreatePrivateThreads: false,
            SendMessagesInThreads: false,
          });
        } catch (err) {}
      }
    }
    await member.roles.add(muteRole);
    await sendMuteEmbed(member, minutes, reason);
    if (minutes > 0) {
      const timeout = setTimeout(async () => {
        await removeMute(member, "Automatisch einde mute");
        activeMutes.delete(member.id);
      }, minutes * 60 * 1000);
      activeMutes.set(member.id, timeout);
    }
    return true;
  } catch (error) { console.error("Mute error:", error); return false; }
}

async function removeMute(member, reason = "Handmatig") {
  try {
    const muteRole = member.guild.roles.cache.find(r => r.name === "Gemute");
    if (muteRole && member.roles.cache.has(muteRole.id)) {
      await member.roles.remove(muteRole);
      if (activeMutes.has(member.id)) {
        clearTimeout(activeMutes.get(member.id));
        activeMutes.delete(member.id);
      }
      await sendUnmuteEmbed(member, reason);
    }
    return true;
  } catch (error) { console.error("Unmute error:", error); return false; }
}

// ========================================
// 🎫 TICKET SYSTEM
// ========================================

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderContent(content, mentions) {
  if (!content) return '';
  let html = escapeHtml(content);
  if (mentions && mentions.users) {
    for (const [id, user] of mentions.users) {
      html = html.replace(new RegExp(`&lt;@!?${id}&gt;`, 'g'), `<span class="mention">@${escapeHtml(user.username)}</span>`);
    }
  }
  html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="codeblock">$1</pre>');
  html = html.replace(/`([^`]+)`/g, '<code class="inline">$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

function renderEmbed(e) {
  const color = e.color ? `#${e.color.toString(16).padStart(6, '0')}` : '#5865f2';
  let fields = '';
  if (e.fields && e.fields.length > 0) {
    fields = `<div class="embed-fields">${e.fields.map(f =>
      `<div class="embed-field" style="grid-column: span ${f.inline ? 1 : 2}">
        <div class="embed-field-name">${escapeHtml(f.name)}</div>
        <div class="embed-field-value">${renderContent(f.value)}</div>
      </div>`
    ).join('')}</div>`;
  }
  return `<div class="embed" style="border-left:4px solid ${color}">
    <div class="embed-grid">
      <div class="embed-main">
        ${e.author ? `<div class="embed-author">${e.author.iconURL ? `<img src="${e.author.iconURL}" class="embed-author-icon">` : ''}${escapeHtml(e.author.name)}</div>` : ''}
        ${e.title ? `<div class="embed-title">${escapeHtml(e.title)}</div>` : ''}
        ${e.description ? `<div class="embed-desc">${renderContent(e.description)}</div>` : ''}
        ${fields}
        ${e.footer ? `<div class="embed-footer">${e.footer.iconURL ? `<img src="${e.footer.iconURL}" class="embed-footer-icon">` : ''}${escapeHtml(e.footer.text)}</div>` : ''}
      </div>
      ${e.thumbnail ? `<img src="${e.thumbnail.url}" class="embed-thumb">` : ''}
    </div>
    ${e.image ? `<img src="${e.image.url}" class="embed-image">` : ''}
  </div>`;
}

function renderAttachments(attachments) {
  if (!attachments || attachments.size === 0) return '';
  return [...attachments.values()].map(a => {
    const isImage = a.contentType && a.contentType.startsWith('image/');
    if (isImage) return `<div class="attachment-image"><a href="${a.url}" target="_blank"><img src="${a.url}" alt="${escapeHtml(a.name)}"></a></div>`;
    return `<div class="attachment"><a href="${a.url}" target="_blank">📎 ${escapeHtml(a.name)}</a></div>`;
  }).join('');
}

async function makeTranscript(channel) {
  let allMessages = [], lastId = null, searching = true;
  while (searching) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const messages = await channel.messages.fetch(options);
    if (messages.size === 0) break;
    allMessages.push(...messages.values());
    lastId = messages.last().id;
    if (messages.size < 100) searching = false;
  }
  allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  const messagesHtml = allMessages.map(m => {
    const avatar = m.author.displayAvatarURL({ extension: 'png', size: 64 });
    const time = new Date(m.createdTimestamp).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const botBadge = m.author.bot ? '<span class="bot-badge">BOT</span>' : '';
    return `<div class="message">
      <img class="avatar" src="${avatar}" alt="avatar">
      <div class="message-body">
        <div class="message-header">
          <span class="username" style="color:${m.member && m.member.displayHexColor && m.member.displayHexColor !== '#000000' ? m.member.displayHexColor : '#ffffff'}">${escapeHtml(m.author.username)}</span>
          ${botBadge}
          <span class="timestamp">${time}</span>
        </div>
        ${m.content ? `<div class="message-content">${renderContent(m.content, m.mentions)}</div>` : ''}
        ${m.embeds && m.embeds.length > 0 ? m.embeds.map(renderEmbed).join('') : ''}
        ${renderAttachments(m.attachments)}
      </div>
    </div>`;
  }).join('');
  const html = `<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8"><title>Transcript - #${escapeHtml(channel.name)}</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; background: #313338; color: #dbdee1; font-family: 'gg sans', Arial, sans-serif; font-size: 16px; line-height: 1.375; }
.header { background: #2b2d31; padding: 16px 20px; border-bottom: 1px solid #1e1f22; }
.header h1 { margin: 0; font-size: 18px; color: #f2f3f5; }
.header .meta { color: #949ba4; font-size: 13px; margin-top: 4px; }
.chat { padding: 20px 0; }
.message { display: flex; padding: 4px 20px; margin-top: 16px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 16px; flex-shrink: 0; }
.message-body { flex: 1; min-width: 0; }
.message-header { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.username { font-weight: 500; font-size: 16px; }
.bot-badge { background: #5865f2; color: #fff; font-size: 10px; font-weight: 600; padding: 1px 4px; border-radius: 3px; }
.timestamp { color: #949ba4; font-size: 12px; }
.message-content { color: #dbdee1; word-wrap: break-word; white-space: pre-wrap; }
.mention { background: #3c4270; color: #c9cdfb; padding: 0 2px; border-radius: 3px; }
.codeblock { background: #2b2d31; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 14px; white-space: pre-wrap; }
.embed { background: #2b2d31; border-radius: 4px; padding: 12px 16px; margin-top: 8px; max-width: 520px; }
.embed-title { font-size: 16px; font-weight: 600; color: #f2f3f5; margin-bottom: 4px; }
.embed-desc { font-size: 14px; color: #dbdee1; }
.embed-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
.embed-field-name { font-size: 14px; font-weight: 600; color: #f2f3f5; }
.embed-field-value { font-size: 14px; color: #dbdee1; }
.embed-thumb { width: 80px; height: 80px; border-radius: 4px; }
.embed-footer { font-size: 12px; color: #949ba4; margin-top: 8px; }
</style></head><body>
<div class="header"><h1>Transcript: #${escapeHtml(channel.name)}</h1><div class="meta">${allMessages.length} berichten • ${new Date().toLocaleString('nl-NL')}</div></div>
<div class="chat">${messagesHtml}</div>
</body></html>`;
  return { html, messageCount: allMessages.length };
}

const activeTickets = new Map();

async function closeTicket(channel, closerId) {
  const ticket = activeTickets.get(channel.id);
  if (!ticket) return { ok: false, reason: 'Geen actief ticket.' };
  try {
    const { html, messageCount } = await makeTranscript(channel);
    const buffer = Buffer.from(html, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.html` });
    const transcriptChannel = await client.channels.fetch(TICKET_TRANSCRIPT_CHANNEL_ID);
    const cat = TICKET_CATEGORIES[ticket.category];
    const embed = new EmbedBuilder()
      .setTitle('Ticket Transcript')
      .setColor(cat ? cat.color : 0x5865f2)
      .addFields(
        { name: 'Kanaal', value: `#${channel.name}`, inline: true },
        { name: 'Klant', value: `<@${ticket.userId}>`, inline: true },
        { name: 'Gesloten door', value: `<@${closerId}>`, inline: true },
        { name: 'Categorie', value: cat ? cat.name : 'Onbekend', inline: true },
        { name: 'Berichten', value: `${messageCount}`, inline: true }
      )
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();
    await transcriptChannel.send({ embeds: [embed], files: [attachment] });
  } catch (e) { console.error('Transcript error:', e.message); }
  activeTickets.delete(channel.id);
  setTimeout(async () => { try { await channel.delete('Ticket gesloten'); } catch (e) {} }, 5000);
  return { ok: true };
}

// ===== Ticket panel =====
function buildTicketPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('🎫 Tickets')
    .setColor(0x5865f2)
    .setDescription('Kies hieronder een categorie om een ticket te openen.\n\n> 📝 **Sollicitatie** — Solliciteer bij Kozlov\n> 🤝 **Partner** — Vraag een partnership aan')
    .setFooter({ text: FOOTER_TEXT })
    .setTimestamp();
}

function buildTicketPanelMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_category_select')
      .setPlaceholder('Kies een categorie...')
      .addOptions([
        { label: 'Sollicitatie', value: 'application', emoji: '📝', description: 'Solliciteer bij Kozlov' },
        { label: 'Partner', value: 'partner', emoji: '🤝', description: 'Vraag een partnership aan' },
      ])
  );
}

async function setupTicketPanel() {
  try {
    const channel = await client.channels.fetch(TICKET_PANEL_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) return;
    try {
      const fetched = await channel.messages.fetch({ limit: 50 });
      const botMsgs = fetched.filter(m => m.author.id === client.user.id);
      for (const m of botMsgs.values()) await m.delete().catch(() => {});
    } catch (e) {}
    await channel.send({ embeds: [buildTicketPanelEmbed()], components: [buildTicketPanelMenu()] });
    console.log('✅ Ticket panel geplaatst');
  } catch (e) { console.error('Ticket panel error:', e.message); }
}

// ===== Ticket modals / embeds =====
function buildApplicationModal() {
  const modal = new ModalBuilder().setCustomId('application_modal').setTitle('Sollicitatie Formulier');
  for (const q of APPLICATION_QUESTIONS) {
    const input = new TextInputBuilder()
      .setCustomId(q.id).setLabel(q.label).setPlaceholder(q.placeholder)
      .setStyle(q.style).setRequired(true).setMaxLength(q.max);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }
  return modal;
}

function buildApplicationEmbed(userId, answers) {
  const fields = APPLICATION_QUESTIONS.map(q => ({
    name: q.label, value: answers[q.id] || '*Niet ingevuld*', inline: false,
  }));
  return new EmbedBuilder()
    .setTitle('📝 Sollicitatie Ingevuld')
    .setColor(0xf39c12)
    .setDescription(`<@${userId}> heeft het sollicitatieformulier ingevuld.`)
    .addFields(fields)
    .setFooter({ text: FOOTER_TEXT })
    .setTimestamp();
}

// ===== Command registration =====
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName("refresh").setDescription("Refresh de gang ledenlijst nu").addBooleanOption(o => o.setName("ephemeral").setDescription("Toon alleen aan jou").setRequired(false)),
    new SlashCommandBuilder().setName("promo").setDescription("Promoveer een lid").addIntegerOption(o => o.setName("steps").setDescription("Stappen omhoog").setRequired(true).setMinValue(1).setMaxValue(9)).addUserOption(o => o.setName("user").setDescription("Lid").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Reden").setRequired(true)),
    new SlashCommandBuilder().setName("demote").setDescription("Demoveer een lid").addIntegerOption(o => o.setName("steps").setDescription("Stappen omlaag").setRequired(true).setMinValue(1).setMaxValue(9)).addUserOption(o => o.setName("user").setDescription("Lid").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Reden").setRequired(true)),
    new SlashCommandBuilder().setName("warn").setDescription("Waarschuw een lid").addIntegerOption(o => o.setName("number").setDescription("1 of 2").setRequired(true).setMinValue(1).setMaxValue(2)).addUserOption(o => o.setName("user").setDescription("Lid").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Reden").setRequired(true)),
    new SlashCommandBuilder().setName("removewarn").setDescription("Trek waarschuwing in").addIntegerOption(o => o.setName("number").setDescription("1 of 2").setRequired(true).setMinValue(1).setMaxValue(2)).addUserOption(o => o.setName("user").setDescription("Lid").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Reden").setRequired(true)),
    new SlashCommandBuilder().setName("aangenomen").setDescription("Neem een nieuw lid aan").addUserOption(o => o.setName("user").setDescription("Lid").setRequired(true)).addStringOption(o => o.setName("rank").setDescription("Rang").setRequired(true).addChoices(...ranks.map(r => ({ name: r.name, value: r.name })))).addStringOption(o => o.setName("reason").setDescription("Reden").setRequired(true)),
    new SlashCommandBuilder().setName("ontslagen").setDescription("Ontsla een lid").addUserOption(o => o.setName("user").setDescription("Lid").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Reden").setRequired(true)),
    new SlashCommandBuilder().setName("afwezigheid").setDescription("Meld afwezigheid").addStringOption(o => o.setName("reason").setDescription("Reden").setRequired(true)).addStringOption(o => o.setName("from").setDescription("Vanaf DD/MM/YYYY").setRequired(true)).addStringOption(o => o.setName("til").setDescription("Tot").setRequired(true)),
    new SlashCommandBuilder().setName("clear").setDescription("Verwijder berichten").addStringOption(o => o.setName("number").setDescription("Aantal of 'all'").setRequired(true)),
    new SlashCommandBuilder().setName("mute").setDescription("Mute een lid").addUserOption(o => o.setName("user").setDescription("Lid").setRequired(true)).addIntegerOption(o => o.setName("minutes").setDescription("Minuten").setRequired(true).setMinValue(1).setMaxValue(1440)).addStringOption(o => o.setName("reason").setDescription("Reden").setRequired(false)),
    new SlashCommandBuilder().setName("unmute").setDescription("Unmute een lid").addUserOption(o => o.setName("user").setDescription("Lid").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Reden").setRequired(false)),
    new SlashCommandBuilder().setName("sollicitatieformulier").setDescription("Stuur het Kozlov sollicitatieformulier (alleen mods)"),
    new SlashCommandBuilder().setName("add").setDescription("Voeg een gebruiker toe aan dit ticket").addUserOption(o => o.setName("user").setDescription("Gebruiker").setRequired(true)),
    new SlashCommandBuilder().setName("remove").setDescription("Verwijder een gebruiker uit dit ticket").addUserOption(o => o.setName("user").setDescription("Gebruiker").setRequired(true)),
    new SlashCommandBuilder().setName("close").setDescription("Sluit dit ticket"),
    new SlashCommandBuilder().setName("rename").setDescription("Hernoem dit ticket").addStringOption(o => o.setName("name").setDescription("Nieuwe naam").setRequired(true)),
    new SlashCommandBuilder().setName("ticketpanel").setDescription("Plaats het ticket panel (alleen mods)"),
  ].map(cmd => cmd.toJSON());

  try {
    const guild = client.guilds.cache.first();
    if (guild) {
      await guild.commands.set(commands);
      console.log(`✅ Commands geregistreerd in ${guild.name}`);
    } else {
      await client.application?.commands.set(commands);
    }
  } catch (err) { console.error("Failed to register commands:", err); }
}

// ===== Command handlers =====
async function handlePromote(interaction) {
  const steps = interaction.options.getInteger("steps");
  const targetUser = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason");
  if (!hasModRole(interaction.member)) return interaction.reply({ content: "❌ Je hebt niet de juiste rol!", flags: MessageFlags.Ephemeral });
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  const currentLevel = getCurrentRankLevel(targetMember);
  if (currentLevel === 0) return interaction.reply({ content: `❌ ${targetUser.username} heeft geen gang rol!`, flags: MessageFlags.Ephemeral });
  let newLevel = Math.min(currentLevel + steps, 9);
  if (newLevel === currentLevel) return interaction.reply({ content: `❌ Al hoogste rang!`, flags: MessageFlags.Ephemeral });
  const newRole = interaction.guild.roles.cache.get(getRoleIdByLevel(newLevel));
  try {
    await removeAllGangRoles(targetMember);
    await targetMember.roles.add(newRole);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await sendPromoEmbed(interaction.guild, targetMember, getRankNameByLevel(currentLevel), getRankNameByLevel(newLevel), reason, steps);
    await safeUpdateList();
    await interaction.deleteReply().catch(() => null);
  } catch (error) { if (!interaction.replied) await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral }); }
}

async function handleDemote(interaction) {
  const steps = interaction.options.getInteger("steps");
  const targetUser = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason");
  if (!hasModRole(interaction.member)) return interaction.reply({ content: "❌ Je hebt niet de juiste rol!", flags: MessageFlags.Ephemeral });
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  const currentLevel = getCurrentRankLevel(targetMember);
  if (currentLevel === 0) return interaction.reply({ content: `❌ ${targetUser.username} heeft geen gang rol!`, flags: MessageFlags.Ephemeral });
  let newLevel = Math.max(currentLevel - steps, 1);
  if (newLevel === currentLevel) return interaction.reply({ content: `❌ Al laagste rang!`, flags: MessageFlags.Ephemeral });
  const newRole = interaction.guild.roles.cache.get(getRoleIdByLevel(newLevel));
  try {
    await removeAllGangRoles(targetMember);
    await targetMember.roles.add(newRole);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await sendDemoteEmbed(interaction.guild, targetMember, getRankNameByLevel(currentLevel), getRankNameByLevel(newLevel), reason, steps);
    await safeUpdateList();
    await interaction.deleteReply().catch(() => null);
  } catch (error) { if (!interaction.replied) await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral }); }
}

async function handleWarn(interaction) {
  const number = interaction.options.getInteger("number");
  const targetUser = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason");
  if (!hasModRole(interaction.member)) return interaction.reply({ content: "❌ Je hebt niet de juiste rol!", flags: MessageFlags.Ephemeral });
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  const warnRoleId = number === 1 ? WARN_ROLE_LEVEL1 : WARN_ROLE_LEVEL2;
  const warnRole = interaction.guild.roles.cache.get(warnRoleId);
  try {
    await targetMember.roles.add(warnRole);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await sendWarnEmbed(targetMember, number === 1 ? "1e Waarschuwing" : "2e Waarschuwing", reason);
    await interaction.deleteReply().catch(() => null);
  } catch (error) { if (!interaction.replied) await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral }); }
}

async function handleRemoveWarn(interaction) {
  const number = interaction.options.getInteger("number");
  const targetUser = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason");
  if (!hasModRole(interaction.member)) return interaction.reply({ content: "❌ Je hebt niet de juiste rol!", flags: MessageFlags.Ephemeral });
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  const warnRoleId = number === 1 ? WARN_ROLE_LEVEL1 : WARN_ROLE_LEVEL2;
  if (!targetMember.roles.cache.has(warnRoleId)) return interaction.reply({ content: `❌ ${targetUser.username} heeft geen waarschuwing!`, flags: MessageFlags.Ephemeral });
  try {
    await targetMember.roles.remove(interaction.guild.roles.cache.get(warnRoleId));
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await sendRemoveWarnEmbed(targetMember, number === 1 ? "1e Waarschuwing" : "2e Waarschuwing", reason);
    await interaction.deleteReply().catch(() => null);
  } catch (error) { if (!interaction.replied) await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral }); }
}

async function handleAangenomen(interaction) {
  const targetUser = interaction.options.getUser("user");
  const rankName = interaction.options.getString("rank");
  const reason = interaction.options.getString("reason");
  if (!hasAdminRole(interaction.member)) return interaction.reply({ content: "❌ Je hebt niet de juiste rol!", flags: MessageFlags.Ephemeral });
  const rank = ranks.find(r => r.name === rankName);
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  try {
    await removeAllGangRoles(targetMember);
    await targetMember.roles.add(interaction.guild.roles.cache.get(rank.roleId));
    await targetMember.roles.add(interaction.guild.roles.cache.get(LID_ROLE_ID));
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await sendAangenomenEmbed(interaction.guild, targetMember, rank.name, reason);
    await safeUpdateList();
    await interaction.deleteReply().catch(() => null);
  } catch (error) { if (!interaction.replied) await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral }); }
}

async function handleOntslagen(interaction) {
  const targetUser = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason");
  if (!hasModRole(interaction.member)) return interaction.reply({ content: "❌ Je hebt niet de juiste rol!", flags: MessageFlags.Ephemeral });
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  try {
    await removeAllGangRoles(targetMember);
    await removeLidRole(targetMember);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await sendOntslagenEmbed(targetMember, reason);
    await safeUpdateList();
    await interaction.deleteReply().catch(() => null);
  } catch (error) { if (!interaction.replied) await interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral }); }
}

async function handleAfwezigheid(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const reason = interaction.options.getString("reason");
  const fromDate = interaction.options.getString("from");
  const tilDate = interaction.options.getString("til");
  if (!isValidDate(fromDate)) return interaction.editReply({ content: "❌ Ongeldig formaat bij 'from'!" });
  await sendAfwezigheidEmbed(interaction.member, reason, fromDate, tilDate);
  await interaction.editReply({ content: `✅ Afwezigheid gemeld!` });
}

async function handleRefresh(interaction) {
  if (!hasModRole(interaction.member)) return interaction.reply({ content: "❌ Je hebt niet de juiste rol!", flags: MessageFlags.Ephemeral });
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try { await updateList(); await interaction.editReply("✅ Ledenlijst bijgewerkt."); }
  catch (err) { await interaction.editReply(`❌ ${err.message}`); }
}

async function handleClear(interaction) {
  const numberInput = interaction.options.getString("number");
  const channel = interaction.channel;
  if (!hasModRole(interaction.member)) return interaction.reply({ content: "❌ Je hebt niet de juiste rol!", ephemeral: true });
  if (!channel.permissionsFor(client.user)?.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: "❌ Geen permissie!", ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  try {
    if (numberInput.toLowerCase() === "all") {
      let deletedTotal = 0, fetched;
      do {
        fetched = await channel.messages.fetch({ limit: 100 });
        if (fetched.size === 0) break;
        const deleted = await channel.bulkDelete(fetched, true);
        deletedTotal += deleted.size;
        await new Promise(r => setTimeout(r, 1000));
      } while (fetched.size === 100);
      await interaction.editReply({ content: `✅ **${deletedTotal}** berichten verwijderd!` });
    } else {
      const amount = parseInt(numberInput);
      if (isNaN(amount) || amount < 1 || amount > 100) return interaction.editReply({ content: "❌ Voer een getal 1-100 in of 'all'!" });
      const fetched = await channel.messages.fetch({ limit: amount });
      const deleted = await channel.bulkDelete(fetched, true);
      await interaction.editReply({ content: `✅ **${deleted.size}** berichten verwijderd!` });
    }
  } catch (error) { await interaction.editReply({ content: `❌ ${error.message}` }); }
}

async function handleMute(interaction) {
  const targetUser = interaction.options.getUser("user");
  const minutes = interaction.options.getInteger("minutes");
  const reason = interaction.options.getString("reason") || "Geen reden";
  if (!hasModRole(interaction.member)) return interaction.reply({ content: "❌ Je hebt niet de juiste rol!", flags: MessageFlags.Ephemeral });
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  const existingMuteRole = interaction.guild.roles.cache.find(r => r.name === "Gemute");
  if (existingMuteRole && targetMember.roles.cache.has(existingMuteRole.id)) return interaction.reply({ content: "❌ Al gemute!", ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  const success = await applyMute(targetMember, minutes, reason);
  if (success) await interaction.editReply({ content: `✅ ${targetUser.username} is gemute voor ${minutes} min!` });
  else await interaction.editReply({ content: `❌ Mute mislukt.` });
}

async function handleUnmute(interaction) {
  const targetUser = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason") || "Geen reden";
  if (!hasModRole(interaction.member)) return interaction.reply({ content: "❌ Je hebt niet de juiste rol!", flags: MessageFlags.Ephemeral });
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  await interaction.deferReply({ ephemeral: true });
  const success = await removeMute(targetMember, reason);
  if (success) await interaction.editReply({ content: `✅ ${targetUser.username} is geunmute!` });
  else await interaction.editReply({ content: `❌ Unmute mislukt.` });
}

async function handleSollicitatieFormulier(interaction) {
  if (!hasModRole(interaction.member)) return interaction.reply({ content: "❌ Je hebt niet de juiste rol!", flags: MessageFlags.Ephemeral });
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try { await sendSollicitatieFormulier(interaction); await interaction.editReply({ content: "✅ Formulier verzonden!" }); }
  catch (error) { await interaction.editReply({ content: `❌ ${error.message}` }); }
}

// ===== Ticket handlers =====
async function handleTicketCategorySelect(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const choice = interaction.values[0];
  const cat = TICKET_CATEGORIES[choice];
  if (!cat) return interaction.editReply({ content: 'Onbekende categorie.' });

  try {
    const guild = interaction.guild;
    const existing = [...activeTickets.entries()].find(([_, t]) => t.userId === interaction.user.id);
    if (existing) return interaction.editReply({ content: `Je hebt al een open ticket: <#${existing[0]}>` });

    const channelName = `${cat.prefix}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: cat.categoryId,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [
          PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles,
        ]},
        { id: TICKET_SUPPORT_ROLE_ID, allow: SUPPORT_TICKET_PERMS },
        { id: client.user.id, allow: [
          PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory,
        ]},
      ],
      topic: `Ticket van ${interaction.user.tag} — ${cat.name}`,
    });

    activeTickets.set(ticketChannel.id, {
      userId: interaction.user.id,
      category: choice,
      extraUsers: [],
      startedAt: Date.now(),
    });

    const embed = new EmbedBuilder()
      .setTitle(cat.name)
      .setColor(cat.color)
      .setDescription(`<@${interaction.user.id}> — beschrijf hieronder je vraag.`)
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_close').setLabel('Sluiten').setEmoji('🔒').setStyle(ButtonStyle.Danger)
    );

    if (cat.isApplication) {
      const startEmbed = new EmbedBuilder()
        .setTitle('📝 Sollicitatie')
        .setColor(0xf39c12)
        .setDescription('Welkom bij je sollicitatie!\n\nKlik op de knop hieronder om het formulier in te vullen.')
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();
      const openRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('application_open').setLabel('Open Sollicitatieformulier').setEmoji('📝').setStyle(ButtonStyle.Primary)
      );
      await ticketChannel.send({ content: `<@${interaction.user.id}> <@&${TICKET_SUPPORT_ROLE_ID}>`, embeds: [embed, startEmbed], components: [openRow, closeRow] });
    } else {
      await ticketChannel.send({ content: `<@${interaction.user.id}> <@&${TICKET_SUPPORT_ROLE_ID}>`, embeds: [embed], components: [closeRow] });
    }

    await interaction.editReply({ content: `Ticket aangemaakt: <#${ticketChannel.id}>` });
  } catch (e) {
    console.error('Ticket create error:', e);
    await interaction.editReply({ content: `Fout: ${e.message}` });
  }
}

async function handleApplicationOpen(interaction) {
  const ticket = activeTickets.get(interaction.channelId);
  if (!ticket || ticket.userId !== interaction.user.id) return interaction.reply({ content: 'Dit is niet jouw ticket.', ephemeral: true });
  await interaction.showModal(buildApplicationModal());
}

async function handleApplicationModal(interaction) {
  await interaction.deferReply();
  const answers = {};
  for (const q of APPLICATION_QUESTIONS) answers[q.id] = interaction.fields.getTextInputValue(q.id);
  const embed = buildApplicationEmbed(interaction.user.id, answers);
  await interaction.channel.send({ content: `<@&${TICKET_SUPPORT_ROLE_ID}> Nieuwe sollicitatie ingevuld!`, embeds: [embed] });
  await interaction.editReply({ content: '✅ Sollicitatie verzonden!' });
}

async function handleTicketClose(interaction) {
  const ticket = activeTickets.get(interaction.channelId);
  if (!ticket) return interaction.reply({ content: 'Geen actief ticket.', ephemeral: true });
  const isOwner = ticket.userId === interaction.user.id;
  const isStaff = interaction.member.roles.cache.has(TICKET_SUPPORT_ROLE_ID);
  if (!isOwner && !isStaff) return interaction.reply({ content: 'Je mag dit ticket niet sluiten.', ephemeral: true });
  await interaction.reply({ content: '🔒 Ticket wordt gesloten...' });
  await closeTicket(interaction.channel, interaction.user.id);
}

async function handleAdd(interaction) {
  if (!interaction.member.roles.cache.has(TICKET_SUPPORT_ROLE_ID)) return interaction.reply({ content: '❌ Geen permissie.', ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  const ticket = activeTickets.get(interaction.channelId);
  if (!ticket) return interaction.editReply({ content: 'Geen actief ticket.' });
  const targetUser = interaction.options.getUser('user');
  try {
    await interaction.channel.permissionOverwrites.edit(targetUser.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
    });
    if (!ticket.extraUsers.includes(targetUser.id)) ticket.extraUsers.push(targetUser.id);
    await interaction.channel.send({ content: `➕ <@${targetUser.id}> is toegevoegd door <@${interaction.user.id}>.` });
    await interaction.editReply({ content: `✅ <@${targetUser.id}> toegevoegd.` });
  } catch (e) { await interaction.editReply({ content: `Fout: ${e.message}` }); }
}

async function handleRemove(interaction) {
  if (!interaction.member.roles.cache.has(TICKET_SUPPORT_ROLE_ID)) return interaction.reply({ content: '❌ Geen permissie.', ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  const ticket = activeTickets.get(interaction.channelId);
  if (!ticket) return interaction.editReply({ content: 'Geen actief ticket.' });
  const targetUser = interaction.options.getUser('user');
  if (targetUser.id === ticket.userId) return interaction.editReply({ content: '⚠️ Kan eigenaar niet verwijderen.' });
  try {
    await interaction.channel.permissionOverwrites.delete(targetUser.id);
    ticket.extraUsers = ticket.extraUsers.filter(id => id !== targetUser.id);
    await interaction.channel.send({ content: `➖ <@${targetUser.id}> is verwijderd door <@${interaction.user.id}>.` });
    await interaction.editReply({ content: `✅ <@${targetUser.id}> verwijderd.` });
  } catch (e) { await interaction.editReply({ content: `Fout: ${e.message}` }); }
}

async function handleClose(interaction) {
  if (!interaction.member.roles.cache.has(TICKET_SUPPORT_ROLE_ID)) return interaction.reply({ content: '❌ Geen permissie.', ephemeral: true });
  const ticket = activeTickets.get(interaction.channelId);
  if (!ticket) return interaction.reply({ content: 'Geen actief ticket.', ephemeral: true });
  await interaction.reply({ content: '🔒 Ticket wordt gesloten...' });
  await closeTicket(interaction.channel, interaction.user.id);
}

async function handleRename(interaction) {
  if (!interaction.member.roles.cache.has(TICKET_SUPPORT_ROLE_ID)) return interaction.reply({ content: '❌ Geen permissie.', ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  if (!activeTickets.has(interaction.channelId)) return interaction.editReply({ content: 'Geen actief ticket.' });
  const newName = interaction.options.getString('name').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 100);
  if (!newName) return interaction.editReply({ content: '⚠️ Ongeldige naam.' });
  try {
    await interaction.channel.setName(newName);
    await interaction.editReply({ content: `✅ Hernoemd naar \`${newName}\`.` });
  } catch (e) { await interaction.editReply({ content: `Fout: ${e.message}` }); }
}

async function handleTicketPanel(interaction) {
  if (!hasModRole(interaction.member)) return interaction.reply({ content: '❌ Geen permissie.', ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  try {
    await setupTicketPanel();
    await interaction.editReply({ content: '✅ Ticket panel geplaatst!' });
  } catch (e) { await interaction.editReply({ content: `Fout: ${e.message}` }); }
}

// ===== Events =====
const watchedRoleIds = new Set(ranks.map(r => r.roleId));
let pendingUpdate = null;

function scheduleUpdate() {
  if (pendingUpdate) return;
  pendingUpdate = setTimeout(() => { pendingUpdate = null; safeUpdateList(); }, ROLE_CHANGE_DEBOUNCE_MS);
}

client.once("ready", async () => {
  console.log(`✅ Bot online als ${client.user?.tag}`);
  try {
    const guild = client.guilds.cache.first();
    if (guild) {
      await guild.members.fetch();
      for (const member of guild.members.cache.values()) {
        if (member.user.bot) continue;
        await applyLidPrefix(member);
      }
    }
  } catch (err) { console.error("Ready error:", err); }
  await registerCommands();
  await safeUpdateList();
  await setupTicketPanel();
});

client.on("guildMemberAdd", async (member) => { await sendWelcomeMessage(member); });

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const hadLid = oldMember.roles.cache.has(LID_ROLE_ID);
  const hasLid = newMember.roles.cache.has(LID_ROLE_ID);
  if (hadLid !== hasLid) await applyLidPrefix(newMember);
  const oldRoles = new Set(oldMember.roles.cache.keys());
  const newRoles = new Set(newMember.roles.cache.keys());
  let changed = false;
  for (const id of oldRoles) if (!newRoles.has(id)) changed = true;
  for (const id of newRoles) if (!oldRoles.has(id)) changed = true;
  if (!changed) return;
  let touchesGangRole = false;
  for (const id of watchedRoleIds) if (oldRoles.has(id) !== newRoles.has(id)) { touchesGangRole = true; break; }
  if (touchesGangRole) scheduleUpdate();
});

client.on("guildMemberRemove", (member) => {
  const hasGangRole = [...member.roles.cache.keys()].some(id => watchedRoleIds.has(id));
  if (hasGangRole) scheduleUpdate();
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const name = interaction.commandName;
    if (name === "refresh") await handleRefresh(interaction);
    else if (name === "promo") await handlePromote(interaction);
    else if (name === "demote") await handleDemote(interaction);
    else if (name === "warn") await handleWarn(interaction);
    else if (name === "removewarn") await handleRemoveWarn(interaction);
    else if (name === "aangenomen") await handleAangenomen(interaction);
    else if (name === "ontslagen") await handleOntslagen(interaction);
    else if (name === "afwezigheid") await handleAfwezigheid(interaction);
    else if (name === "clear") await handleClear(interaction);
    else if (name === "mute") await handleMute(interaction);
    else if (name === "unmute") await handleUnmute(interaction);
    else if (name === "sollicitatieformulier") await handleSollicitatieFormulier(interaction);
    else if (name === "add") await handleAdd(interaction);
    else if (name === "remove") await handleRemove(interaction);
    else if (name === "close") await handleClose(interaction);
    else if (name === "rename") await handleRename(interaction);
    else if (name === "ticketpanel") await handleTicketPanel(interaction);
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
    await handleTicketCategorySelect(interaction);
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === 'application_modal') {
    await handleApplicationModal(interaction);
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'ticket_close') await handleTicketClose(interaction);
    else if (interaction.customId === 'application_open') await handleApplicationOpen(interaction);
  }
});

process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason));
process.on("uncaughtException", (err) => console.error("Uncaught exception:", err));

client.login(TOKEN);
