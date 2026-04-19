import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
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

// 📌 CANAIS
const CANAL_PAINEL_ID = "1477683908026961940";
const CANAL_LOGS_ID = "1495370353193521182";

// 📅 HORÁRIO NOVO (09:03 → 09:10)
const EVENTO_INICIO = new Date("2026-04-19T09:03:00-03:00");
const EVENTO_FIM = new Date("2026-04-19T09:10:00-03:00");

// 📊 DB
const db = { users: {} };

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, pontos: 0 };
  }
  return db.users[id];
}

// ⏰ EVENTO
function eventoAtivo() {
  const agora = Date.now();
  return agora >= EVENTO_INICIO.getTime() && agora <= EVENTO_FIM.getTime();
}

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

let painelMsgId = null;
let ultimoStatus = null;

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

  const status = eventoAtivo() ? "aberto" : "fechado";

  const embed = new EmbedBuilder()
    .setColor(status === "aberto" ? "#00ff00" : "#ff0000")
    .setTitle("📢 EVENTO HOSPITAL BELLA")
    .setDescription(
`<@&${CARGO_PING}>

🚨 EVENTO ESPECIAL

📅 DATA: 19/04/2026

⏰ INÍCIO: 09:03
⏰ FIM: 09:10

━━━━━━━━━━━━━━━━━━━

${status === "aberto"
? "🟢 EVENTO ABERTO - ATIVO AGORA"
: "🔴 EVENTO FECHADO - AGUARDE PRÓXIMO"}

👥 PARTICIPANTES: ${Object.keys(db.users).length}

━━━━━━━━━━━━━━━━━━━

🏆 PREMIAÇÃO
🥇 100.000$
🥈 60.000$
🥉 30.000$`
    );

  if (painelMsgId) {
    const msg = await canal.messages.fetch(painelMsgId);
    await msg.edit({ embeds: [embed], components: [botoes()] });
  } else {
    const msg = await canal.send({ embeds: [embed], components: [botoes()] });
    painelMsgId = msg.id;
  }
}

// 🔥 ATUALIZAÇÃO AUTOMÁTICA EXATA (SEM ATRASO)
setInterval(async () => {
  const status = eventoAtivo() ? "aberto" : "fechado";

  // só atualiza quando muda o status
  if (status !== ultimoStatus) {
    ultimoStatus = status;
    await atualizarPainel();
  }

}, 1000);

// 🚀 READY
client.once("ready", async () => {
  console.log(`✅ Online: ${client.user.tag}`);
  await atualizarPainel();
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
