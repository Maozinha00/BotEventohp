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
const CARGO_SERVICO_ID = "1492553421973356795";
const CARGO_PING = "1477683902079303932";

// 📌 CANAL
const CANAL_PAINEL_ID = "1477683908026961940";

// 🏥 EVENTO FIXO (BRASIL CORRETO)
function criarHorarioBR(ano, mes, dia, hora, min) {
  return Date.UTC(ano, mes - 1, dia, hora + 3, min, 0);
}

const EVENTO_INICIO = criarHorarioBR(2026, 4, 19, 18, 0);
const EVENTO_FIM = criarHorarioBR(2026, 4, 19, 21, 0);

// 📊 DB
const db = { users: {} };

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, pontos: 0 };
  }
  return db.users[id];
}

// ⏰ EVENTO REAL
function eventoAberto() {
  const agora = Date.now();
  return agora >= EVENTO_INICIO && agora <= EVENTO_FIM;
}

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
  ranking.forEach(([id, d], i) => {
    topText += `\n${i + 1}. <@${id}> — ${d.pontos} pts`;
  });

  const inicio = new Date(EVENTO_INICIO).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const fim = new Date(EVENTO_FIM).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const embed = new EmbedBuilder()
    .setColor(status === "aberto" ? "#00ff00" : "#ff0000")
    .setTitle("🏥 HOSPITAL BELLA - EVENTO OFICIAL")
    .setDescription(
`━━━━━━━━━━━━━━━━━━━━━━

🏥 **PLANTÃO HOSPITAL BELLA**

📅 Início: ${inicio}
📅 Fim: ${fim}

━━━━━━━━━━━━━━━━━━━━━━

${status === "aberto"
  ? "🟢 EVENTO ATIVO - ATENDIMENTOS LIBERADOS"
  : "🔴 EVENTO FECHADO - AGUARDE O HORÁRIO OFICIAL"}

👥 Participantes: ${Object.keys(db.users).length}

━━━━━━━━━━━━━━━━━━━━━━

🏆 TOP 3${topText}

💡 Sistema automático de pontuação em andamento.`
    );

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

    if (!eventoAberto())
      return interaction.reply({ content: "⛔ Evento ainda não está ativo", ephemeral: true });

    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos += 1;
      return interaction.reply({ content: "🏥 +1 ponto", ephemeral: true });
    }

    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos += 2;
      return interaction.reply({ content: "📞 +2 pontos", ephemeral: true });
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

client.login(TOKEN);
