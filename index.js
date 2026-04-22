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

// 📊 DB
const db = { users: {} };

// 🗳️ ENQUETE
let poll = { "24": 0, "25": 0, "26": 0 };

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// =====================
// 👤 USER
// =====================
function getUser(id) {
  if (!db.users[id]) db.users[id] = { pontos: 0 };
  return db.users[id];
}

// =====================
// 📢 EVENTO
// =====================
function embedEvento() {
  return new EmbedBuilder()
    .setColor("#2ecc71")
    .setDescription(
`@|⚕️| Membro HP

🏥 **EVENTO HP — HOSPITAL BELLA**

📢 Sistema oficial de atendimentos e chamados em operação

📅 Data: 19/04/2026
⏰ Horário: 18:00 → 21:00

━━━━━━━━━━━━━━━━━━

🚑 **DESCRIÇÃO DO EVENTO**
O Hospital Bella está em operação ativa para simulação de atendimentos médicos em tempo real.

Avaliação:
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

function botoesEvento() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("atendimento").setLabel("🏥 Atendimento").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("chamado").setLabel("📞 Chamado").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("ranking").setLabel("🏆 Ranking").setStyle(ButtonStyle.Secondary)
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
`👨‍⚕️ **Equipe médica, escolham a melhor data para o evento:**

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
// SLASH COMMANDS
// =====================
async function registerCommands() {
  const commands = [

    new SlashCommandBuilder()
      .setName("evento")
      .setDescription("Enviar evento")
      .addChannelOption(o =>
        o.setName("canal")
         .setDescription("Escolha o canal")
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("enquete")
      .setDescription("Criar enquete")
      .addChannelOption(o =>
        o.setName("canal")
         .setDescription("Escolha o canal")
         .addChannelTypes(ChannelType.GuildText)
         .setRequired(true)
      )

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
  console.log(`✅ ${client.user.tag} online`);
  await registerCommands();
});

// =====================
// INTERAÇÕES
// =====================
client.on("interactionCreate", async (interaction) => {

  // SLASH
  if (interaction.isChatInputCommand()) {

    const canal = interaction.options.getChannel("canal");

    if (interaction.commandName === "evento") {
      await canal.send({
        embeds: [embedEvento()],
        components: [botoesEvento()]
      });

      return interaction.reply({ content: "Evento enviado!", ephemeral: true });
    }

    if (interaction.commandName === "enquete") {
      poll = { "24": 0, "25": 0, "26": 0 };

      await canal.send({
        embeds: [embedEnquete()],
        components: [botoesEnquete()]
      });

      return interaction.reply({ content: "Enquete criada!", ephemeral: true });
    }
  }

  // BOTÕES
  if (interaction.isButton()) {

    // ENQUETE
    if (interaction.customId.startsWith("vote_")) {
      const key = interaction.customId.split("_")[1];
      poll[key]++;

      await interaction.message.edit({
        embeds: [embedEnquete()],
        components: [botoesEnquete()]
      });

      return interaction.reply({ content: "Voto registrado!", ephemeral: true });
    }

    // ATENDIMENTO
    if (interaction.customId === "atendimento") {
      getUser(interaction.user.id).pontos += 1;
      return interaction.reply({ content: "+1 ponto", ephemeral: true });
    }

    // CHAMADO
    if (interaction.customId === "chamado") {
      getUser(interaction.user.id).pontos += 2;
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
