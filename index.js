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
  TextInputStyle
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
const CARGO_SERVICO_ID = "1492553421973356795";
const CARGO_PING = "1477683902079303932";

// 🏆 RECOMPENSAS
const CARGO_1 = "1477683902100410424";
const CARGO_2 = "1495374426815074304";
const CARGO_3 = "1495374557404594267";

// 📌 CANAIS
const CANAL_PAINEL_ID = "1477683908026961940";
const CANAL_LOGS_ID = "1495370353193521182";

// 📅 EVENTO DINÂMICO (EDITÁVEL NO BOT)
let EVENTO_INICIO = new Date("2026-04-19T18:00:00-03:00");
let EVENTO_FIM = new Date("2026-04-19T21:00:00-03:00");

// ⚡ CONTROLE
let eventoManual = null;
let ultimoStatus = null;

function getEventoStatus() {
  const agora = new Date();

  if (eventoManual === true) return "aberto";
  if (eventoManual === false) return "fechado";

  if (agora >= EVENTO_INICIO && agora <= EVENTO_FIM) return "aberto";
  return "fechado";
}

function eventoAtivo() {
  return getEventoStatus() === "aberto";
}

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

function getDataHoje() {
  return new Date().toLocaleDateString("pt-BR");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

let painelMsgId = null;

// 📢 PAINEL PRINCIPAL
async function atualizarPainel() {
  try {
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

🚨 EVENTO DO DIA

📅 ${EVENTO_INICIO.toLocaleString("pt-BR")}  
⏰ ${EVENTO_FIM.toLocaleString("pt-BR")}

━━━━━━━━━━━━━━━━━━━

📅 HOJE: ${getDataHoje()}

${status === "aberto" ? "🟢 EVENTO ABERTO" : "🔴 EVENTO FECHADO"}

👥 PARTICIPANTES: ${participantesAtuais.size}

━━━━━━━━━━━━━━━━━━━

🏥 ATENDIMENTOS
📞 CHAMADOS

━━━━━━━━━━━━━━━━━━━

🏆 PREMIAÇÃO
🥇 100.000$  
🥈 60.000$  
🥉 30.000$

━━━━━━━━━━━━━━━━━━━

🥇 TOP 3:${topText}`
      );

    if (painelMsgId) {
      const msg = await canal.messages.fetch(painelMsgId);
      await msg.edit({ embeds: [embed] });
    } else {
      const msg = await canal.send({ embeds: [embed] });
      painelMsgId = msg.id;
    }

  } catch {}
}

// ⚙️ PAINEL CONFIG
async function painelConfig(interaction) {
  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("⚙️ CONFIGURAR EVENTO")
    .setDescription("Clique no botão abaixo para alterar data e horário do evento.");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("config_evento")
      .setLabel("⏰ Alterar Evento")
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// ⏰ AUTO UPDATE
setInterval(async () => {
  const statusAtual = getEventoStatus();

  if (statusAtual !== ultimoStatus) {
    ultimoStatus = statusAtual;
    await atualizarPainel();
  }

}, 60000);

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
  setTimeout(() => atualizarPainel(), 3000);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.guild) return;

  const member = await interaction.guild.members.fetch(interaction.user.id);

  // 📌 PAINEL CONFIG
  if (interaction.isChatInputCommand()) {

    if (!member.permissions.has("Administrator")) {
      return interaction.reply({ content: "🚫 Apenas staff", ephemeral: true });
    }

    if (interaction.commandName === "painelconfig") {
      return painelConfig(interaction);
    }

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

  // 🔘 BOTÃO CONFIG
  if (interaction.isButton()) {
    if (interaction.customId === "config_evento") {

      const modal = new ModalBuilder()
        .setCustomId("modal_evento")
        .setTitle("Configurar Evento");

      const inputInicio = new TextInputBuilder()
        .setCustomId("inicio")
        .setLabel("Data/Hora Início (ex: 2026-04-19 18:00)")
        .setStyle(TextInputStyle.Short);

      const inputFim = new TextInputBuilder()
        .setCustomId("fim")
        .setLabel("Data/Hora Fim (ex: 2026-04-19 21:00)")
        .setStyle(TextInputStyle.Short);

      modal.addComponents(
        new ActionRowBuilder().addComponents(inputInicio),
        new ActionRowBuilder().addComponents(inputFim)
      );

      return interaction.showModal(modal);
    }
  }

  // 🧠 MODAL SUBMIT
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "modal_evento") {

      const inicio = interaction.fields.getTextInputValue("inicio");
      const fim = interaction.fields.getTextInputValue("fim");

      EVENTO_INICIO = new Date(inicio.replace(" ", "T") + ":00-03:00");
      EVENTO_FIM = new Date(fim.replace(" ", "T") + ":00-03:00");

      await atualizarPainel();

      return interaction.reply({
        content: "✅ Evento atualizado com sucesso!",
        ephemeral: true
      });
    }
  }
});

client.login(TOKEN);
