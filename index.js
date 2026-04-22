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
  ChannelType
} from "discord.js";

// 🔐 CONFIG
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1493948568078258347";
const GUILD_ID = "1477683902041690342";

// 📌 LOGS
const CANAL_LOGS_ID = "1495370353193521182";

// 📊 DB
const db = { users: {} };

// 🗳️ ENQUETE
const poll = { "24": 0, "25": 0, "26": 0 };
let pollMsgId = null;
let pollChannelId = null;

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
// 📢 EVENTO HP
// =====================
function embedEvento() {
  return new EmbedBuilder()
    .setColor("#2ecc71")
    .setTitle("🏥 EVENTO HP — HOSPITAL BELLA")
    .setDescription(
`@|⚕️| Membro HP

📢 **Sistema oficial de atendimentos e chamados em operação**

📅 **Data:** 19/04/2026  
⏰ **Horário:** 18:00 → 21:00  

━━━━━━━━━━━━━━━━━━

🚑 **DESCRIÇÃO DO EVENTO**  
O Hospital Bella estará em operação ativa para simulação de atendimentos médicos em tempo real.

📊 **Avaliação:**  
• Atendimentos  
• Chamados  
• Tempo de resposta  
• Eficiência  

━━━━━━━━━━━━━━━━━━

🔴 **EVENTO FECHADO**  
👥 Participantes: 4  

━━━━━━━━━━━━━━━━━━

🏆 **PREMIAÇÃO**  
🥇 1º → 100k  
🥈 2º → 50k  
🥉 3º → 35k`
    );
}

// =====================
// 🗳️ ENQUETE
// =====================
function embedEnquete() {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🗳️ ENQUETE MÉDICA")
    .setDescription(
`👨‍⚕️ **A equipe médica está de acordo com qual data?**

Escolha o melhor dia 👇

📅 24/04 → ${poll["24"]} votos  
📅 25/04 → ${poll["25"]} votos  
📅 26/04 → ${poll["26"]} votos`
    );
}

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
async function enviarEnquete(canal) {
  if (canal) pollChannelId = canal.id;
  if (!pollChannelId) return;

  const channel = await client.channels.fetch(pollChannelId);

  if (pollMsgId) {
    try {
      const msg = await channel.messages.fetch(pollMsgId);
      return msg.edit({
        embeds: [embedEnquete()],
        components: [botoesEnquete()]
      });
    } catch {}
  }

  const msg = await channel.send({
    embeds: [embedEnquete()],
    components: [botoesEnquete()]
  });

  pollMsgId = msg.id;
}

// =====================
// 🏆 RANKING
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

// =====================
// BOTÕES SISTEMA
// =====================
function botoesSistema() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("atendimento").setLabel("🏥 Atendimento").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("chamado").setLabel("📞 Chamado").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("ranking").setLabel("🏆 Ranking").setStyle(ButtonStyle.Secondary)
  );
}

// =====================
// SLASH COMMANDS
// =====================
async function registerCommands() {
  const commands = [

    new SlashCommandBuilder()
      .setName("evento")
      .setDescription("Enviar painel do evento")
      .addChannelOption(option =>
        option.setName("canal")
          .setDescription("Canal do evento")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("enquete")
      .setDescription("Criar enquete médica")
      .addChannelOption(option =>
        option.setName("canal")
          .setDescription("Canal da enquete")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("painel")
      .setDescription("Enviar painel de pontos")
      .addChannelOption(option =>
        option.setName("canal")
          .setDescription("Canal do painel")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )

  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Comandos registrados");
}

// =====================
// READY
// =====================
client.once("ready", async () => {
  console.log(`🤖 Online: ${client.user.tag}`);
  await registerCommands();
});

// =====================
// INTERAÇÕES
// =====================
client.on("interactionCreate", async (interaction) => {

  if (interaction.isChatInputCommand()) {

    // EVENTO
    if (interaction.commandName === "evento") {
      const canal = interaction.options.getChannel("canal");

      await canal.send({
        embeds: [embedEvento()]
      });

      return interaction.reply({
        content: `✅ Evento enviado em ${canal}`,
        ephemeral: true
      });
    }

    // ENQUETE
    if (interaction.commandName === "enquete") {
      const canal = interaction.options.getChannel("canal");
      await enviarEnquete(canal);

      return interaction.reply({
        content: `🗳️ Enquete enviada em ${canal}`,
        ephemeral: true
      });
    }

    // PAINEL
    if (interaction.commandName === "painel") {
      const canal = interaction.options.getChannel("canal");

      await canal.send({
        content: "📊 Painel da equipe médica",
        components: [botoesSistema()]
      });

      return interaction.reply({
        content: `✅ Painel enviado em ${canal}`,
        ephemeral: true
      });
    }
  }

  // BOTÕES
  if (interaction.isButton()) {

    if (interaction.customId.startsWith("vote_")) {
      const key = interaction.customId.split("_")[1];
      poll[key]++;
      await enviarEnquete();

      return interaction.reply({ content: "🗳️ Voto registrado!", ephemeral: true });
    }

    if (interaction.customId === "atendimento") {
      const user = getUser(interaction.user.id);
      user.pontos += 1;
      log(`🏥 ${interaction.user.tag} +1`);
      return interaction.reply({ content: "+1 ponto", ephemeral: true });
    }

    if (interaction.customId === "chamado") {
      const user = getUser(interaction.user.id);
      user.pontos += 2;
      log(`📞 ${interaction.user.tag} +2`);
      return interaction.reply({ content: "+2 pontos", ephemeral: true });
    }

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
