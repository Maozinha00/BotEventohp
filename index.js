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

// 📌 CANAL SERVIÇO
const CANAL_SERVICO_ID = "1490431346298851490";

// 📅 HORÁRIO EVENTO
function eventoAtivo() {
  const agora = new Date();
  const inicio = new Date("2026-04-16T17:00:00");
  const fim = new Date("2026-04-16T21:00:00");
  return agora >= inicio && agora <= fim;
}

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 📊 DB
const db = { users: {} };

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, pontos: 0 };
  }
  return db.users[id];
}

// 🔍 SERVIÇO
async function estaEmServico(guild, userId) {
  try {
    const channel = await guild.channels.fetch(CANAL_SERVICO_ID);
    const messages = await channel.messages.fetch({ limit: 30 });

    return messages.some(msg =>
      msg.content?.includes(userId) ||
      msg.content?.includes(`<@${userId}>`) ||
      JSON.stringify(msg.embeds || []).includes(userId)
    );
  } catch {
    return false;
  }
}

// 🏥 PAINEL 1 (AÇÕES)
function painelPrincipal(user) {
  return new EmbedBuilder()
    .setColor("#00AEEF")
    .setTitle("🏥 PAINEL DE ATENDIMENTO")
    .setDescription(
`👑 Responsável: ${user}

⚕️ <@&${CARGO_EVENTO_ID}>

────────────────────

🏥 Atendimento = +1 ponto
📞 Chamado = +1 ponto

📌 Só funciona em serviço

⏰ 17:00 até 21:00`
    )
    .setFooter({ text: "Hospital Bella • Sistema de Pontos" });
}

// 📖 PAINEL 2 (INFORMAÇÕES)
function painelInfo() {
  return new EmbedBuilder()
    .setColor("#2ecc71")
    .setTitle("📖 INFORMAÇÕES DO EVENTO")
    .setDescription(
`🏥 EVENTO HOSPITAL BELLA

📊 COMO FUNCIONA:
• Atendimento = +1 ponto  
• Chamado = +1 ponto  

⚠️ REGRAS:
• Só conta em serviço  
• Proibido farm  
• Apenas ações reais  

🏆 TOP 3 recebe premiação

⏰ 16/04/2026 — 17:00 até 21:00`
    )
    .setFooter({ text: "Hospital Bella • Regras Oficiais" });
}

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

// 🚀 COMANDOS (2 PAINÉIS)
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel de atendimento"),

  new SlashCommandBuilder()
    .setName("infoevento")
    .setDescription("Ver informações do evento")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

// READY
client.once("ready", async () => {
  console.log(`✅ Online como ${client.user.tag}`);

  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commands
  });

  console.log("🏥 2 painéis ativos!");
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  try {

    // 📌 COMANDOS
    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === "painel") {
        return interaction.reply({
          embeds: [painelPrincipal(interaction.user)],
          components: [botoes()]
        });
      }

      if (interaction.commandName === "infoevento") {
        return interaction.reply({
          embeds: [painelInfo()]
        });
      }
    }

    if (!interaction.isButton()) return;

    // 🚫 HORÁRIO
    if (!eventoAtivo()) {
      return interaction.reply({
        content: "⛔ Evento não ativo (17:00 - 21:00)",
        ephemeral: true
      });
    }

    // 🚫 SERVIÇO
    const emServico = await estaEmServico(interaction.guild, interaction.user.id);

    if (!emServico) {
      return interaction.reply({
        content: "🚫 Você precisa estar EM SERVIÇO!",
        ephemeral: true
      });
    }

    const user = getUser(interaction.user.id);

    // 🏥 ATENDIMENTO
    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos++;

      return interaction.reply({
        content: `🏥 Atendimento +1 ponto\nTotal: ${user.pontos}`,
        ephemeral: true
      });
    }

    // 📞 CHAMADO
    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos++;

      return interaction.reply({
        content: `📞 Chamado +1 ponto\nTotal: ${user.pontos}`,
        ephemeral: true
      });
    }

    // 🏆 RANKING
    if (interaction.customId === "ranking") {
      const ranking = Object.entries(db.users)
        .sort((a, b) => b[1].pontos - a[1].pontos)
        .slice(0, 5);

      let text = "🏆 TOP 5\n\n";

      ranking.forEach(([id, data], i) => {
        text += `${i + 1}. <@${id}> — ${data.pontos}\n`;
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
