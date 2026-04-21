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

// 👮 CARGOS
const CARGO_SERVICO_ID = "1492553421973356795";
const CARGO_PING = "1477683902079303932";

// 🏆 TOP 3 CARGOS
const CARGO_1 = "1477683902100410424";
const CARGO_2 = "1495374426815074304";
const CARGO_3 = "1495374557404594267";

// 📌 CANAIS
const CANAL_PAINEL_ID = "1477683908026961940";
const CANAL_LOGS_ID = "1495370353193521182";
const CANAL_AVISO_ID = "1477683904315134215";

// ⏰ EVENTO
const EVENTO_INICIO = new Date("2026-04-19T18:00:00-03:00");
const EVENTO_FIM = new Date("2026-04-19T21:00:00-03:00");

// 📊 DB
const db = { users: {} };

// 🗳️ ENQUETE
const poll = { "24": 0, "25": 0, "26": 0 };
let pollMsgId = null;

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// =====================
// 👤 USER
// =====================
function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, pontos: 0 };
  }
  return db.users[id];
}

// =====================
// ⏰ EVENTO
// =====================
function eventoAtivo() {
  const now = Date.now();
  return now >= EVENTO_INICIO.getTime() && now <= EVENTO_FIM.getTime();
}

// =====================
// 🚫 COOLDOWN
// =====================
const cooldown = new Map();
const COOLDOWN_TIME = 5000;

function podeClicar(id) {
  const now = Date.now();
  const last = cooldown.get(id);

  if (last && now - last < COOLDOWN_TIME) return false;

  cooldown.set(id, now);
  return true;
}

// =====================
// 🔘 BOTÕES PRINCIPAIS
// =====================
function botoes() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("atendimento").setLabel("🏥 Atendimento").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("chamado").setLabel("📞 Chamado").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("ranking").setLabel("🏆 Ranking").setStyle(ButtonStyle.Danger)
  );
}

// =====================
// 🗳️ ENQUETE BOTÕES
// =====================
function botoesEnquete() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("vote_24").setLabel("📅 24/04").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("vote_25").setLabel("📅 25/04").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("vote_26").setLabel("📅 26/04").setStyle(ButtonStyle.Primary)
  );
}

// =====================
// 🗳️ ENQUETE EMBED
// =====================
function embedEnquete() {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🗳️ ENQUETE DO EVENTO")
    .setDescription(
`Escolha o melhor dia 👇

📅 24/04 → ${poll["24"]} votos  
📅 25/04 → ${poll["25"]} votos  
📅 26/04 → ${poll["26"]} votos  

Clique nos botões abaixo para votar!`
    );
}

// =====================
// 📢 ENVIAR ENQUETE
// =====================
async function enviarEnquete() {
  const canal = await client.channels.fetch(CANAL_PAINEL_ID);

  const msg = await canal.send({
    embeds: [embedEnquete()],
    components: [botoesEnquete()]
  });

  pollMsgId = msg.id;
}

// =====================
// 🔄 ATUALIZAR ENQUETE
// =====================
async function atualizarEnquete() {
  if (!pollMsgId) return;

  const canal = await client.channels.fetch(CANAL_PAINEL_ID);
  const msg = await canal.messages.fetch(pollMsgId);

  await msg.edit({
    embeds: [embedEnquete()],
    components: [botoesEnquete()]
  });
}

// =====================
// 📊 LOG
// =====================
async function logEvento(userId, tipo, pontos) {
  try {
    const canal = await client.channels.fetch(CANAL_LOGS_ID);

    const embed = new EmbedBuilder()
      .setColor("#2f3136")
      .setTitle("📊 LOG HOSPITAL BELLA")
      .setDescription(
`👤 <@${userId}>
📌 ${tipo}
⭐ +${pontos} pontos`
      );

    canal.send({ embeds: [embed] });
  } catch {}
}

// =====================
// 🏆 RANKING
// =====================
function gerarRanking() {
  const ranking = Object.entries(db.users)
    .sort((a, b) => b[1].pontos - a[1].pontos)
    .slice(0, 3);

  let text = "";

  ranking.forEach(([id, d], i) => {
    const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
    text += `${medalha} <@${id}> — ${d.pontos} pts\n`;
  });

  return new EmbedBuilder()
    .setColor("#FFD700")
    .setTitle("🏆 RANKING HOSPITAL BELLA")
    .setDescription(text || "Sem dados");
}

// =====================
// 📢 PAINEL
// =====================
async function atualizarPainel() {
  const canal = await client.channels.fetch(CANAL_PAINEL_ID);

  const embed = new EmbedBuilder()
    .setColor(eventoAtivo() ? "#00ff00" : "#ff0000")
    .setDescription(
`<@&${CARGO_PING}>

🏥 EVENTO HOSPITAL BELLA

📅 19/04/2026  
⏰ 18:00 → 21:00  

━━━━━━━━━━━━━━━

${eventoAtivo() ? "🟢 ATIVO" : "🔴 FECHADO"}

👥 ${Object.keys(db.users).length} participantes`
    );

  if (painelMsgId) {
    const msg = await canal.messages.fetch(painelMsgId);
    await msg.edit({ embeds: [embed], components: [botoes()] });
  } else {
    const msg = await canal.send({ embeds: [embed], components: [botoes()] });
    painelMsgId = msg.id;
  }
}

// =====================
// 🚀 READY
// =====================
client.once("ready", async () => {
  console.log(`🤖 Online: ${client.user.tag}`);

  await atualizarPainel();

  // 🗳️ ENQUETE ENTRA AQUI (NO MEIO DO BOT)
  await enviarEnquete();
});

// =====================
// 🎮 INTERAÇÕES
// =====================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.guild) return;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const user = getUser(interaction.user.id);

  if (interaction.isButton()) {

    // 🗳️ VOTOS ENQUETE
    if (interaction.customId.startsWith("vote_")) {
      const key = interaction.customId.replace("vote_", "");

      poll[key]++;

      await atualizarEnquete();

      return interaction.reply({
        content: "🗳️ Voto registrado!",
        ephemeral: true
      });
    }

    // 🏥 ATENDIMENTO
    if (interaction.customId === "atendimento") {
      user.pontos += 1;
      await logEvento(interaction.user.id, "ATENDIMENTO", 1);
      return interaction.reply({ content: "🏥 +1 ponto", ephemeral: true });
    }

    // 📞 CHAMADO
    if (interaction.customId === "chamado") {
      user.pontos += 2;
      await logEvento(interaction.user.id, "CHAMADO", 2);
      return interaction.reply({ content: "📞 +2 pontos", ephemeral: true });
    }

    // 🏆 RANKING
    if (interaction.customId === "ranking") {
      return interaction.reply({ embeds: [gerarRanking()], ephemeral: true });
    }
  }
});

client.login(TOKEN);
