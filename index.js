import "dotenv/config";

import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} from "discord.js";

// 🔐 CONFIG
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ TOKEN ou CLIENT_ID não configurados");
  process.exit(1);
}

// 👮 CARGOS
const CARGO_ADMIN_ID = "1490431614055088128";
const CARGO_PING = "1477683902079303932";

// 🏆 RECOMPENSAS
const CARGO_1 = "1477683902100410424";
const CARGO_2 = "1495374426815074304";
const CARGO_3 = "1495374557404594267";

// 📌 CANAIS
const CANAL_PAINEL_ID = "1477683908026961940";

// 📅 EVENTO (timestamp seguro)
let EVENTO_INICIO = Date.parse("2026-04-19T18:00:00-03:00");
let EVENTO_FIM = Date.parse("2026-04-19T21:00:00-03:00");

// ⚡ CONTROLE
let eventoManual = null;

// 👥 PARTICIPANTES
const participantesAtuais = new Set();

// 📊 DB
const db = { users: {} };

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, pontos: 0 };
  }
  return db.users[id];
}

// 🔥 STATUS DO EVENTO
function getEventoStatus() {
  const agora = Date.now();

  if (eventoManual === true) return "aberto";
  if (eventoManual === false) return "fechado";

  if (agora >= EVENTO_INICIO && agora <= EVENTO_FIM) return "aberto";
  return "fechado";
}

function eventoAberto() {
  return getEventoStatus() === "aberto";
}

function dataBR(ms) {
  return new Date(ms).toLocaleString("pt-BR");
}

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

let painelMsgId = null;

// 🔘 BOTÕES
function botoes() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("atendimento")
      .setLabel("🏥 Atendimento")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("chamado")
      .setLabel("📞 Chamado")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ranking")
      .setLabel("🏆 Ranking")
      .setStyle(ButtonStyle.Secondary)
  );
}

// 📢 PAINEL
async function atualizarPainel() {
  const canal = await client.channels.fetch(CANAL_PAINEL_ID);

  const status = getEventoStatus();

  const ranking = Object.entries(db.users)
    .sort((a, b) => b[1].pontos - a[1].pontos)
    .slice(0, 3);

  let topText = "";
  ranking.forEach(([id, data], i) => {
    topText += `\n${i + 1}. <@${id}> — ${data.pontos} pts`;
  });

  const embed = new EmbedBuilder()
    .setColor(status === "aberto" ? "#00ff00" : "#ff0000")
    .setTitle("📢 EVENTO HOSPITAL BELLA")
    .setDescription(
`<@&${CARGO_PING}>

📅 INÍCIO: ${dataBR(EVENTO_INICIO)}
⏰ FIM: ${dataBR(EVENTO_FIM)}

━━━━━━━━━━━━━━

${status === "aberto" ? "🟢 EVENTO ABERTO" : "🔴 EVENTO FECHADO"}

👥 PARTICIPANTES: ${participantesAtuais.size}

━━━━━━━━━━━━━━

🏆 TOP 3:${topText}`
    );

  if (painelMsgId) {
    const msg = await canal.messages.fetch(painelMsgId);
    await msg.edit({ embeds: [embed], components: [botoes()] });
  } else {
    const msg = await canal.send({ embeds: [embed], components: [botoes()] });
    painelMsgId = msg.id;
  }
}

// 🚀 COMANDOS
const commands = [
  new SlashCommandBuilder().setName("abrirevento").setDescription("Abrir evento"),
  new SlashCommandBuilder().setName("fecharevento").setDescription("Fechar evento"),
  new SlashCommandBuilder().setName("painelconfig").setDescription("Configurar evento")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log(`✅ Online: ${client.user.tag}`);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  setTimeout(atualizarPainel, 3000);
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  if (!interaction.guild) return;

  const member = await interaction.guild.members.fetch(interaction.user.id);

  // 🔘 BOTÕES
  if (interaction.isButton()) {

    if (interaction.customId === "atendimento") {

      if (!eventoAberto())
        return interaction.reply({ content: "⛔ Evento fechado", ephemeral: true });

      const user = getUser(interaction.user.id);
      user.atendimentos++;
      user.pontos++;

      return interaction.reply({ content: "🏥 Registrado", ephemeral: true });
    }

    if (interaction.customId === "chamado") {

      if (!eventoAberto())
        return interaction.reply({ content: "⛔ Evento fechado", ephemeral: true });

      const user = getUser(interaction.user.id);
      user.chamados++;
      user.pontos++;

      return interaction.reply({ content: "📞 Registrado", ephemeral: true });
    }

    if (interaction.customId === "ranking") {
      const ranking = Object.entries(db.users)
        .sort((a, b) => b[1].pontos - a[1].pontos)
        .slice(0, 3);

      let text = "🏆 TOP 3\n\n";
      ranking.forEach(([id, data], i) => {
        text += `${i + 1}. <@${id}> — ${data.pontos} pts\n`;
      });

      return interaction.reply({ content: text || "Sem dados", ephemeral: true });
    }
  }

  // ⚙️ CONFIG
  if (interaction.isChatInputCommand()) {

    if (!member.permissions.has(PermissionFlagsBits.Administrator))
      return interaction.reply({ content: "🚫 Apenas staff", ephemeral: true });

    if (interaction.commandName === "abrirevento") {
      eventoManual = true;
      await atualizarPainel();
      return interaction.reply({ content: "🟢 Evento aberto", ephemeral: true });
    }

    if (interaction.commandName === "fecharevento") {
      eventoManual = false;
      await atualizarPainel();
      return interaction.reply({ content: "🔴 Evento fechado", ephemeral: true });
    }
  }
});

client.login(TOKEN);
