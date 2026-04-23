import "dotenv/config";
import express from "express";
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

// 🌐 KEEP ALIVE
const app = express();
app.get("/", (_, res) => res.send("🏥 Hospital + Evento Bot Online"));
app.listen(3000);

// 🔐 ENV
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.log("❌ Falta TOKEN / CLIENT_ID / GUILD_ID");
  process.exit(1);
}

/* =========================
   🏥 HOSPITAL SYSTEM
========================= */

let config = { painel: null, msgId: null };

const pontos = new Map();
const chamados = new Map();
const atendimentoAtivo = new Map();
const stats = new Map();

/* =========================
   📢 EVENTO SYSTEM
========================= */

const CANAL_EVENTO = "COLOQUE_ID_DO_CANAL_EVENTO";

const STAFF_EVENTO = [
  "111111111111111111",
  "222222222222222222"
];

const rankingEvento = new Map();
let msgEventoId = null;

/* =========================
   ⏱ FORMAT
========================= */

function format(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

/* =========================
   🏥 PAINEL HOSPITAL
========================= */

function painel() {

  const medicosAtivos = [...pontos.entries()]
    .map(([id, d]) => {
      const tempo = Date.now() - d.inicio;
      return `┆ 🟢 <@${id}> • ${format(tempo)}`;
    })
    .join("\n") || "┆ Nenhum médico em serviço";

  const sorted = [...stats.entries()]
    .sort((a, b) => (b[1]?.atendimentos || 0) - (a[1]?.atendimentos || 0));

  const top = (i) =>
    sorted[i]
      ? `┆ ${i + 1}. <@${sorted[i][0]}> • ${sorted[i][1].atendimentos} 🩺`
      : `┆ ${i + 1}. Sem dados`;

  return new EmbedBuilder()
    .setColor("#0f172a")
    .setTitle("🏥 HOSPITAL RP SYSTEM")
    .setDescription(`
👨‍⚕️ Médicos em plantão: ${pontos.size}
📞 Pacientes na fila: ${chamados.size}
🩺 Atendimentos ativos: ${atendimentoAtivo.size}

👨‍⚕️ MÉDICOS ONLINE
${medicosAtivos}

🏆 TOP MÉDICOS
${top(0)}
${top(1)}
${top(2)}

⏱ Atualizado automaticamente
`);
}

/* =========================
   🏥 BOTÕES HOSPITAL
========================= */

function rowHospital() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("iniciar").setLabel("🟢 Iniciar").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("finalizar").setLabel("🔴 Finalizar").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("chamar").setLabel("📞 Chamar Médico").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("atender").setLabel("🩺 Atender").setStyle(ButtonStyle.Secondary)
  );
}

/* =========================
   📢 BOTÕES EVENTO
========================= */

function rowEvento() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("evento_atendimento")
      .setLabel("🏥 Atendimento")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("evento_chamado")
      .setLabel("📞 Chamado")
      .setStyle(ButtonStyle.Primary)
  );
}

/* =========================
   🏆 EVENTO UPDATE
========================= */

async function updateEvento(client) {
  try {
    const canal = await client.channels.fetch(CANAL_EVENTO);

    const top = [...rankingEvento.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const medalhas = ["🥇", "🥈", "🥉"];

    const lista = top.length
      ? top.map(([id, p], i) => `${medalhas[i]} <@${id}> — ${p} pts`).join("\n")
      : "Sem dados";

    const embed = new EmbedBuilder()
      .setColor("#00ff00")
      .setDescription(`
📢 ═════════════〔 EVENTO HOSPITAL 〕═════════════

🏆 TOP 3
${lista}

────────────────────────────
⚡ Atualização automática
`);

    if (msgEventoId) {
      const msg = await canal.messages.fetch(msgEventoId);
      await msg.edit({ embeds: [embed], components: [rowEvento()] });
    } else {
      const msg = await canal.send({ embeds: [embed], components: [rowEvento()] });
      msgEventoId = msg.id;
    }

  } catch (err) {
    console.log("Erro evento:", err);
  }
}

/* =========================
   🤖 BOT
========================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const rest = new REST({ version: "10" }).setToken(TOKEN);

/* =========================
   SLASH COMMANDS
========================= */

const commands = [
  new SlashCommandBuilder()
    .setName("painelhp")
    .setDescription("Criar painel hospital")
    .addChannelOption(o =>
      o.setName("canal").setDescription("Canal painel").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rankinghp")
    .setDescription("Top médicos"),

  new SlashCommandBuilder()
    .setName("abrirevento")
    .setDescription("Abrir evento hospitalar")
].map(c => c.toJSON());

/* =========================
   READY
========================= */

client.once("ready", async () => {
  console.log(`🏥 ONLINE COMO ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  setInterval(() => updatePanel(), 15000);
  setInterval(() => updateEvento(client), 3000);
});

/* =========================
   UPDATE PAINEL HP
========================= */

async function updatePanel() {
  try {
    if (!config.painel || !config.msgId) return;

    const channel = await client.channels.fetch(config.painel);
    const msg = await channel.messages.fetch(config.msgId);

    await msg.edit({
      embeds: [painel()],
      components: [rowHospital()]
    });

  } catch {}
}

/* =========================
   INTERAÇÕES
========================= */

client.on("interactionCreate", async (interaction) => {

  const id = interaction.user.id;

  /* ===== SLASH ===== */
  if (interaction.isChatInputCommand()) {

    // 🏥 PAINEL HP
    if (interaction.commandName === "painelhp") {
      const canal = interaction.options.getChannel("canal");

      config.painel = canal.id;

      const msg = await canal.send({
        embeds: [painel()],
        components: [rowHospital()]
      });

      config.msgId = msg.id;

      return interaction.reply({ content: "✅ Painel criado!", ephemeral: true });
    }

    // 🏆 RANKING HP
    if (interaction.commandName === "rankinghp") {

      const sorted = [...stats.entries()]
        .sort((a, b) => (b[1]?.atendimentos || 0) - (a[1]?.atendimentos || 0));

      const top = (i) =>
        sorted[i]
          ? `#${i + 1} <@${sorted[i][0]}> • ${sorted[i][1].atendimentos}`
          : `#${i + 1} Sem dados`;

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🏆 TOP MÉDICOS")
            .setColor("Gold")
            .setDescription(`${top(0)}\n${top(1)}\n${top(2)}`)
        ]
      });
    }

    // 📢 ABRIR EVENTO
    if (interaction.commandName === "abrirevento") {

      if (!STAFF_EVENTO.includes(id)) {
        return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });
      }

      const canal = await client.channels.fetch(CANAL_EVENTO);

      const msg = await canal.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#00ff00")
            .setDescription("📢 EVENTO INICIADO 🔥")
        ],
        components: [rowEvento()]
      });

      msgEventoId = msg.id;

      return interaction.reply({ content: "✅ Evento aberto!", ephemeral: true });
    }
  }

  /* ===== BOTÕES ===== */
  if (!interaction.isButton()) return;

  /* ===== HOSPITAL ===== */

  if (interaction.customId === "iniciar") {
    pontos.set(id, { inicio: Date.now() });
    return interaction.reply({ content: "🟢 Plantão iniciado!", ephemeral: true });
  }

  if (interaction.customId === "finalizar") {
    const p = pontos.get(id);
    if (!p) return interaction.reply({ content: "❌ Não está em plantão", ephemeral: true });

    pontos.delete(id);
    return interaction.reply({
      content: `🔴 Finalizado: ${format(Date.now() - p.inicio)}`,
      ephemeral: true
    });
  }

  if (interaction.customId === "chamar") {
    chamados.set(id, true);
    return interaction.reply({ content: "📞 Médico chamado!", ephemeral: true });
  }

  if (interaction.customId === "atender") {

    const paciente = chamados.keys().next().value;
    if (!paciente) return interaction.reply({ content: "❌ Sem fila", ephemeral: true });

    chamados.delete(paciente);

    if (!stats.has(id)) stats.set(id, { atendimentos: 0 });
    stats.get(id).atendimentos++;

    return interaction.reply({ content: `🩺 Atendendo <@${paciente}>`, ephemeral: true });
  }

  /* ===== EVENTO ===== */

  if (interaction.customId === "evento_atendimento" || interaction.customId === "evento_chamado") {
    rankingEvento.set(id, (rankingEvento.get(id) || 0) + 1);

    return interaction.reply({
      content: "+1 ponto no evento 🔥",
      ephemeral: true
    });
  }
});

client.login(TOKEN);
