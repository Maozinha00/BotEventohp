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

// 📅 EVENTO FIXO
const EVENTO_INICIO = new Date("2026-04-19T18:00:00-03:00");
const EVENTO_FIM = new Date("2026-04-19T21:00:00-03:00");

// 🔥 STATUS
function eventoAtivo() {
  const agora = new Date();
  return agora >= EVENTO_INICIO && agora <= EVENTO_FIM;
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

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// 📢 EMBED (DESCRIÇÃO ANTIGA MELHORADA)
function painelInfo() {
  const status = eventoAtivo() ? "aberto" : "fechado";

  return new EmbedBuilder()
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

👥 PARTICIPANTES: ${participantesAtuais.size}

━━━━━━━━━━━━━━━━━━━

🏥 REGRAS
• Cargo de serviço obrigatório
• Estar em serviço
• Usar botões

━━━━━━━━━━━━━━━━━━━

🏆 PREMIAÇÃO
🥇 100.000$
🥈 60.000$
🥉 30.000$`
    );
}

// 🔘 BOTÕES (COM CONTADOR FUNCIONANDO)
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
      .setStyle(ButtonStyle.Danger)
  );
}

// 📊 LOG
async function logEvento(user, tipo) {
  try {
    const canal = await client.channels.fetch(CANAL_LOGS_ID);
    canal.send(`👤 <@${user}> - ${tipo} às ${new Date().toLocaleTimeString("pt-BR")}`);
  } catch {}
}

// 📢 PAINEL
let painelMsgId = null;

async function atualizarPainel() {
  const canal = await client.channels.fetch(CANAL_PAINEL_ID);

  const ranking = Object.entries(db.users)
    .sort((a, b) => b[1].pontos - a[1].pontos)
    .slice(0, 3);

  let topText = "";
  ranking.forEach(([id, d], i) => {
    topText += `\n${i + 1}. <@${id}> — ${d.pontos} pts`;
  });

  const embed = painelInfo();

  if (painelMsgId) {
    const msg = await canal.messages.fetch(painelMsgId);
    await msg.edit({ embeds: [embed], components: [botoes()] });
  } else {
    const msg = await canal.send({ embeds: [embed], components: [botoes()] });
    painelMsgId = msg.id;
  }
}

// 🚀 READY
client.once("ready", async () => {
  console.log(`✅ Online: ${client.user.tag}`);
  setInterval(atualizarPainel, 30000);
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  if (!interaction.guild) return;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const user = getUser(interaction.user.id);

  if (interaction.isButton()) {

    if (!member.roles.cache.has(CARGO_SERVICO_ID))
      return interaction.reply({ content: "🚫 Sem cargo de serviço", ephemeral: true });

    if (!eventoAtivo())
      return interaction.reply({ content: "⛔ Evento fechado", ephemeral: true });

    participantesAtuais.add(interaction.user.id);

    // 🏥 ATENDIMENTO (+1)
    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos += 1;
      await logEvento(interaction.user.id, "Atendimento");
      return interaction.reply({ content: `🏥 Atendimento registrado (+1) | Total: ${user.atendimentos}`, ephemeral: true });
    }

    // 📞 CHAMADO (+2)
    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos += 2;
      await logEvento(interaction.user.id, "Chamado");
      return interaction.reply({ content: `📞 Chamado registrado (+2) | Total: ${user.chamados}`, ephemeral: true });
    }

    // 🏆 RANKING
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

client.login(TOKEN);
