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

// 📅 EVENTO
let EVENTO_INICIO = Date.parse("2026-04-19T18:00:00-03:00");
let EVENTO_FIM = Date.parse("2026-04-19T21:00:00-03:00");

// ⚡ CONTROLE
let eventoManual = null;

// 📊 DB
const db = { users: {} };

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = {
      atendimentos: 0,
      chamados: 0,
      pontos: 0,
      batido: false
    };
  }
  return db.users[id];
}

// 🔥 STATUS
function eventoAberto() {
  const agora = Date.now();

  if (eventoManual === true) return true;
  if (eventoManual === false) return false;

  return agora >= EVENTO_INICIO && agora <= EVENTO_FIM;
}

function dataBR(ms) {
  return new Date(ms).toLocaleString("pt-BR");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

let painelMsgId = null;

// 🔘 BOTÕES
function botoes() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("baterponto")
      .setLabel("📍 Bater Ponto")
      .setStyle(ButtonStyle.Secondary),

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
      .setStyle(ButtonStyle.Danger)
  );
}

// 📢 PAINEL
async function atualizarPainel() {
  const canal = await client.channels.fetch(CANAL_PAINEL_ID);

  const status = eventoAberto() ? "aberto" : "fechado";

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

🚨 EVENTO ESPECIAL HOJE

📅 19/04/2026
⏰ 18:00 ATÉ 21:00

━━━━━━━━━━━━━━━━━━━

📅 HOJE: ${new Date().toLocaleDateString("pt-BR")}

${status === "aberto" ? "🟢 EVENTO ABERTO" : "🔴 EVENTO FECHADO"}

━━━━━━━━━━━━━━━━━━━

📍 PONTO OBRIGATÓRIO PARA PARTICIPAR
• Você precisa bater ponto antes de usar o sistema

━━━━━━━━━━━━━━━━━━━

👥 PARTICIPANTES: ${Object.values(db.users).filter(u => u.batido).length}

━━━━━━━━━━━━━━━━━━━

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

// 🚀 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  if (!interaction.guild) return;

  const user = getUser(interaction.user.id);

  // 📍 BATER PONTO
  if (interaction.isButton() && interaction.customId === "baterponto") {
    user.batido = true;
    return interaction.reply({ content: "📍 Ponto batido! Agora você pode participar do evento.", ephemeral: true });
  }

  // ⛔ BLOQUEIO GERAL
  if (interaction.isButton()) {

    if (interaction.customId !== "ranking" && interaction.customId !== "baterponto") {
      if (!eventoAberto()) {
        return interaction.reply({ content: "⛔ Evento fechado", ephemeral: true });
      }

      if (!user.batido) {
        return interaction.reply({ content: "📍 Você precisa bater ponto antes de participar", ephemeral: true });
      }
    }

    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos++;
      return interaction.reply({ content: "🏥 Registrado", ephemeral: true });
    }

    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos++;
      return interaction.reply({ content: "📞 Registrado", ephemeral: true });
    }

    if (interaction.customId === "ranking") {
      const ranking = Object.entries(db.users)
        .sort((a, b) => b[1].pontos - a[1].pontos)
        .slice(0, 3);

      let text = "🏆 TOP 3\n\n";
      ranking.forEach(([id, d], i) => {
        text += `${i + 1}. <@${id}> — ${d.pontos} pts\n`;
      });

      return interaction.reply({ content: text || "Sem dados", ephemeral: true });
    }
  }
});

// 👮 COMANDOS
const commands = [
  new SlashCommandBuilder().setName("abrirevento").setDescription("Abrir evento"),
  new SlashCommandBuilder().setName("fecharevento").setDescription("Fechar evento")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log(`✅ Online: ${client.user.tag}`);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  setTimeout(atualizarPainel, 3000);
});

client.login(TOKEN);
