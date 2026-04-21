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
const GUILD_ID = process.env.GUILD_ID;

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

// 📊 DB (memória temporária)
const db = { users: {} };

// 🗳️ ENQUETE
const poll = { "24": 0, "25": 0, "26": 0 };
let pollMsgId = null;

// 🤖 CLIENT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// =====================
// 👤 USER DB
// =====================
function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, pontos: 0 };
  }
  return db.users[id];
}

// =====================
// 🗳️ EMBED ENQUETE
// =====================
function embedEnquete() {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🗳️ ENQUETE DO EVENTO")
    .setDescription(
`Escolha o dia do evento 👇

📅 24/04 → ${poll["24"]} votos  
📅 25/04 → ${poll["25"]} votos  
📅 26/04 → ${poll["26"]} votos`
    );
}

// =====================
// BOTÕES ENQUETE
// =====================
function botoesEnquete() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("vote_24").setLabel("📅 24/04").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("vote_25").setLabel("📅 25/04").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("vote_26").setLabel("📅 26/04").setStyle(ButtonStyle.Primary)
  );
}

// =====================
// ENVIAR ENQUETE
// =====================
async function enviarEnquete() {
  try {
    const canal = await client.channels.fetch(CANAL_PAINEL_ID);
    if (!canal) return console.log("❌ Canal da enquete não encontrado");

    const msg = await canal.send({
      embeds: [embedEnquete()],
      components: [botoesEnquete()]
    });

    pollMsgId = msg.id;
  } catch (err) {
    console.error("❌ Erro ao enviar enquete:", err);
  }
}

// =====================
// ATUALIZAR ENQUETE
// =====================
async function atualizarEnquete() {
  try {
    if (!pollMsgId) return;

    const canal = await client.channels.fetch(CANAL_PAINEL_ID);
    const msg = await canal.messages.fetch(pollMsgId);

    await msg.edit({
      embeds: [embedEnquete()],
      components: [botoesEnquete()]
    });
  } catch (err) {
    console.error("❌ Erro ao atualizar enquete:", err);
  }
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
    .setTitle("🏆 RANKING")
    .setDescription(text || "Sem dados ainda");
}

// =====================
// BOTÕES PAINEL
// =====================
function botoes() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("atendimento").setLabel("🏥 Atendimento").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("chamado").setLabel("📞 Chamado").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("ranking").setLabel("🏆 Ranking").setStyle(ButtonStyle.Danger)
  );
}

// =====================
// SLASH COMMAND
// =====================
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("enquete")
      .setDescription("🗳️ Criar enquete do evento")
      .toJSON()
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Slash /enquete registrado");
}

// =====================
// READY
// =====================
client.once("ready", async () => {
  console.log(`🤖 Online como ${client.user.tag}`);

  await registerCommands();
  await enviarEnquete();
});

// =====================
// INTERAÇÕES
// =====================
client.on("interactionCreate", async (interaction) => {

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "enquete") {
      await enviarEnquete();
      return interaction.reply({ content: "🗳️ Enquete criada!", ephemeral: true });
    }
  }

  if (interaction.isButton()) {

    // 🗳️ VOTOS
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
      const user = getUser(interaction.user.id);
      user.pontos += 1;

      return interaction.reply({ content: "🏥 +1 ponto", ephemeral: true });
    }

    // 📞 CHAMADO
    if (interaction.customId === "chamado") {
      const user = getUser(interaction.user.id);
      user.pontos += 2;

      return interaction.reply({ content: "📞 +2 pontos", ephemeral: true });
    }

    // 🏆 RANKING
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
