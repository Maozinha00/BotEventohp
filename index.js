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
  SlashCommandBuilder
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

// 📌 CANAIS
const CANAL_PAINEL_ID = "1477683908026961940";
const CANAL_LOGS_ID = "1495370353193521182";

// 📅 EVENTO (LIBERA 07:40)
const EVENTO_INICIO = new Date("2026-04-19T07:40:00-03:00");
const EVENTO_FIM = new Date("2026-04-19T21:00:00-03:00");

function getEventoStatus() {
  const agora = new Date();
  if (agora >= EVENTO_INICIO && agora <= EVENTO_FIM) return "aberto";
  return "fechado";
}

function eventoAtivo() {
  return getEventoStatus() === "aberto";
}

// 👥 PARTICIPANTES
const participantesAtuais = new Set();
let avisoEnviado = false;

// 📊 DB
const db = { users: {} };

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, hacking: 0, pontos: 0 };
  }
  return db.users[id];
}

function getDataHoje() {
  return new Date().toLocaleDateString("pt-BR");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

function painelInfo() {
  const status = getEventoStatus();

  return new EmbedBuilder()
    .setColor(status === "aberto" ? "#00ff00" : "#ff0000")
    .setTitle("📢 EVENTO HOSPITAL BELLA")
    .setDescription(
`<@&${CARGO_PING}>

🚨 EVENTO DO DIA

📅 19/04/2026  
⏰ ABRE 07:40 / FECHA 21:00

━━━━━━━━━━━━━━━━━━━

📅 HOJE: ${getDataHoje()}

${status === "aberto" ? "🟢 EVENTO ABERTO" : "🔴 EVENTO FECHADO"}

👥 PARTICIPANTES: ${participantesAtuais.size}

━━━━━━━━━━━━━━━━━━━

🏥 ATENDIMENTOS: botão ativo
📞 CHAMADOS: botão ativo
💻 HACKING: botão ativo

━━━━━━━━━━━━━━━━━━━

🏆 PREMIAÇÃO
🥇 100.000$  
🥈 60.000$  
🥉 30.000$`
    );
}

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
      .setCustomId("hacking")
      .setLabel("💻 Hacking")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("ranking")
      .setLabel("🏆 Ranking")
      .setStyle(ButtonStyle.Secondary)
  );
}

async function logEvento(user, tipo) {
  try {
    const canal = await client.channels.fetch(CANAL_LOGS_ID);
    canal.send(`📊 LOG\n\n👤 <@${user}>\n📌 ${tipo}\n⏰ ${new Date().toLocaleTimeString("pt-BR")}`);
  } catch {}
}

let painelMsgId = null;

async function atualizarPainel() {
  try {
    const canal = await client.channels.fetch(CANAL_PAINEL_ID);
    const embed = painelInfo();

    if (painelMsgId) {
      try {
        const msg = await canal.messages.fetch(painelMsgId);
        return msg.edit({ embeds: [embed], components: [botoes()] });
      } catch {}
    }

    const msg = await canal.send({ embeds: [embed], components: [botoes()] });
    painelMsgId = msg.id;
  } catch {}
}

// ⏰ AUTO UPDATE
setInterval(async () => {
  const agora = new Date();
  const h = agora.getHours();

  // atualizar painel automaticamente
  if (h === 7 || h === 21) {
    await atualizarPainel();
  }

}, 60000);

// 🚀 COMANDOS
const commands = [
  new SlashCommandBuilder().setName("abrirevento").setDescription("Abrir evento"),
  new SlashCommandBuilder().setName("fecharevento").setDescription("Fechar evento")
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

  if (interaction.isButton()) {

    if (!eventoAtivo()) {
      return interaction.reply({ content: "⛔ Evento fechado", ephemeral: true });
    }

    if (!member.roles.cache.has(CARGO_SERVICO_ID)) {
      return interaction.reply({ content: "🚫 Sem cargo de serviço", ephemeral: true });
    }

    const user = getUser(interaction.user.id);
    participantesAtuais.add(interaction.user.id);

    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos++;
      await logEvento(interaction.user.id, "Atendimento");
      return interaction.reply({ content: "🏥 Registrado", ephemeral: true });
    }

    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos++;
      await logEvento(interaction.user.id, "Chamado");
      return interaction.reply({ content: "📞 Registrado", ephemeral: true });
    }

    if (interaction.customId === "hacking") {
      user.hacking++;
      user.pontos += 2;
      await logEvento(interaction.user.id, "Hacking");
      return interaction.reply({ content: "💻 Registrado", ephemeral: true });
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

  if (interaction.isChatInputCommand()) {

    if (!member.roles.cache.has(CARGO_ADMIN_ID)) {
      return interaction.reply({ content: "🚫 STAFF apenas", ephemeral: true });
    }

    if (interaction.commandName === "abrirevento") {
      return interaction.reply({ content: "🟢 Evento liberado 07:40 ativo", ephemeral: true });
    }

    if (interaction.commandName === "fecharevento") {
      return interaction.reply({ content: "🔴 Evento fechado", ephemeral: true });
    }
  }
});

client.login(TOKEN);
