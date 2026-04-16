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

// 🔐 ENV
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ TOKEN ou CLIENT_ID não configurados");
  process.exit(1);
}

// 👑 CARGO
const CARGO_EVENTO_ID = "1477683902079303932";

// 📌 CANAL DO BATE-PONTO (OUTRO BOT)
const CANAL_SERVICO_ID = "1490431346298851490";

// 📅 HORÁRIO DO EVENTO
function eventoAtivo() {
  const agora = new Date();
  const inicio = new Date("2026-04-16T17:00:00");
  const fim = new Date("2026-04-16T21:00:00");

  return agora >= inicio && agora <= fim;
}

// 🤖 BOT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 📊 BANCO
const db = { users: {} };

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, pontos: 0 };
  }
  return db.users[id];
}

// 🔍 VERIFICAR SE ESTÁ EM SERVIÇO (LENDO CANAL DO OUTRO BOT)
async function estaEmServico(guild, userId) {
  const channel = await guild.channels.fetch(CANAL_SERVICO_ID);
  if (!channel) return false;

  const messages = await channel.messages.fetch({ limit: 30 });

  return messages.some(msg => {
    if (!msg.content && msg.embeds.length === 0) return false;

    // texto normal
    if (msg.content.includes(userId)) return true;

    // menção
    if (msg.content.includes(`<@${userId}>`)) return true;

    // embed do outro bot
    if (msg.embeds.length > 0) {
      const data = JSON.stringify(msg.embeds[0]);
      if (data.includes(userId)) return true;
    }

    return false;
  });
}

// 🏥 PAINEL
function painelEvento(user) {
  return new EmbedBuilder()
    .setColor("#00AEEF")
    .setTitle("🏥 EVENTO HOSPITAL BELLA")
    .setDescription(
`👑 RESPONSÁVEL
${user}

⚕️ <@&${CARGO_EVENTO_ID}>

────────────────────

🏥 Atendimento = +1 ponto
📞 Chamado = +1 ponto

📌 Só conta se estiver EM SERVIÇO

📅 16/04/2026 — 17:00 até 21:00`
    )
    .setFooter({ text: "Hospital Bella" });
}

// 🔘 BOTÕES
function botoesEvento() {
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

// 🚀 COMANDOS
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel do evento")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

// READY
client.once("ready", async () => {
  console.log(`✅ Online como ${client.user.tag}`);

  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commands
  });

  console.log("🏥 Bot do evento ativo!");
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  try {

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel") {
        return interaction.reply({
          embeds: [painelEvento(interaction.user)],
          components: [botoesEvento()]
        });
      }
    }

    if (!interaction.isButton()) return;

    // 🚫 HORÁRIO
    if (!eventoAtivo()) {
      return interaction.reply({
        content: "⛔ Evento não está ativo (17:00 - 21:00)",
        ephemeral: true
      });
    }

    // 🚫 VERIFICA SERVIÇO NO OUTRO BOT
    const emServico = await estaEmServico(interaction.guild, interaction.user.id);

    if (!emServico) {
      return interaction.reply({
        content: "🚫 Você precisa estar EM SERVIÇO para ganhar pontos!",
        ephemeral: true
      });
    }

    const user = getUser(interaction.user.id);

    // 🏥 ATENDIMENTO
    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos++;

      return interaction.reply({
        content: `🏥 Atendimento registrado! +1 ponto\nTotal: **${user.pontos}**`,
        ephemeral: true
      });
    }

    // 📞 CHAMADO
    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos++;

      return interaction.reply({
        content: `📞 Chamado registrado! +1 ponto\nTotal: **${user.pontos}**`,
        ephemeral: true
      });
    }

    // 🏆 RANKING
    if (interaction.customId === "ranking") {
      const ranking = Object.entries(db.users)
        .sort((a, b) => b[1].pontos - a[1].pontos)
        .slice(0, 5);

      let text = "🏆 TOP 5 HOSPITAL BELLA\n\n";

      ranking.forEach(([id, data], i) => {
        text += `${i + 1}. <@${id}> — ${data.pontos} pontos\n`;
      });

      return interaction.reply({
        content: text,
        ephemeral: true
      });
    }

  } catch (err) {
    console.error(err);
  }
});

// 🔑 LOGIN
client.login(TOKEN);
