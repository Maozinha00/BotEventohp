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
const CLIENT_ID = "1493948568078258347";
const GUILD_ID = "1477683902041690342";

// 📌 CANAIS
const CANAL_PAINEL_ID = "1477683908026961940";
const CANAL_LOGS_ID = "1495370353193521182";

// 📊 DB
const db = { users: {} };

// 🗳️ ENQUETE
const poll = { "24": 0, "25": 0, "26": 0 };
let pollMsgId = null;

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// =====================
// 👤 USER
// =====================
function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { pontos: 0 };
  }
  return db.users[id];
}

// =====================
// LOG
// =====================
async function log(msg) {
  try {
    const canal = await client.channels.fetch(CANAL_LOGS_ID);
    if (canal) canal.send(msg);
  } catch {}
}

// =====================
// ENQUETE
// =====================
function embedEnquete() {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🗳️ ENQUETE DO EVENTO")
    .setDescription(
`Escolha o dia:

📅 24/04 → ${poll["24"]} votos  
📅 25/04 → ${poll["25"]} votos  
📅 26/04 → ${poll["26"]} votos`
    );
}

function botoesEnquete() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("vote_24").setLabel("24/04").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("vote_25").setLabel("25/04").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("vote_26").setLabel("26/04").setStyle(ButtonStyle.Primary)
  );
}

async function enviarEnquete() {
  const canal = await client.channels.fetch(CANAL_PAINEL_ID);

  if (pollMsgId) {
    try {
      const msg = await canal.messages.fetch(pollMsgId);
      return msg.edit({
        embeds: [embedEnquete()],
        components: [botoesEnquete()]
      });
    } catch {}
  }

  const msg = await canal.send({
    embeds: [embedEnquete()],
    components: [botoesEnquete()]
  });

  pollMsgId = msg.id;
}

// =====================
// RANKING
// =====================
function gerarRanking() {
  const ranking = Object.entries(db.users)
    .sort((a, b) => b[1].pontos - a[1].pontos)
    .slice(0, 3);

  let text = ranking.map(([id, d], i) =>
    `${["🥇","🥈","🥉"][i]} <@${id}> — ${d.pontos} pts`
  ).join("\n");

  return new EmbedBuilder()
    .setColor("#FFD700")
    .setTitle("🏆 Ranking")
    .setDescription(text || "Sem dados");
}

function botoesSistema() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("atendimento").setLabel("🏥 Atendimento").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("chamado").setLabel("📞 Chamado").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("ranking").setLabel("🏆 Ranking").setStyle(ButtonStyle.Secondary)
  );
}

// =====================
// SLASH
// =====================
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName("enquete").setDescription("Criar enquete"),
    new SlashCommandBuilder().setName("painel").setDescription("Enviar painel")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

// =====================
// READY
// =====================
client.once("ready", async () => {
  console.log(`✅ Logado como ${client.user.tag}`);
  await registerCommands();
});

// =====================
// INTERAÇÕES
// =====================
client.on("interactionCreate", async (interaction) => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "enquete") {
      await enviarEnquete();
      return interaction.reply({ content: "✅ Enquete enviada", ephemeral: true });
    }

    if (interaction.commandName === "painel") {
      const canal = await client.channels.fetch(CANAL_PAINEL_ID);

      await canal.send({
        content: "📊 Painel de pontos",
        components: [botoesSistema()]
      });

      return interaction.reply({ content: "✅ Painel enviado", ephemeral: true });
    }
  }

  if (interaction.isButton()) {

    // VOTO
    if (interaction.customId.startsWith("vote_")) {
      const key = interaction.customId.split("_")[1];
      poll[key]++;

      await enviarEnquete();

      return interaction.reply({ content: "🗳️ Voto registrado", ephemeral: true });
    }

    // ATENDIMENTO
    if (interaction.customId === "atendimento") {
      const user = getUser(interaction.user.id);
      user.pontos += 1;
      log(`🏥 ${interaction.user.tag} +1`);
      return interaction.reply({ content: "+1 ponto", ephemeral: true });
    }

    // CHAMADO
    if (interaction.customId === "chamado") {
      const user = getUser(interaction.user.id);
      user.pontos += 2;
      log(`📞 ${interaction.user.tag} +2`);
      return interaction.reply({ content: "+2 pontos", ephemeral: true });
    }

    // RANKING
    if (interaction.customId === "ranking") {
      return interaction.reply({
        embeds: [gerarRanking()],
        ephemeral: true
      });
    }
  }
});

// =====================
client.login(TOKEN);
