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

// 🏆 PREMIAÇÃO
const PREMIO = {
  1: 100000,
  2: 60000,
  3: 30000
};

// 📅 EVENTO
function eventoAtivo() {
  const agora = new Date();
  const inicio = new Date("2026-04-17T17:00:00");
  const fim = new Date("2026-04-17T21:00:00");
  return agora >= inicio && agora <= fim;
}

// 🤖 BOT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages // ✅ necessário
  ]
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
    if (!channel) return false;

    const messages = await channel.messages.fetch({ limit: 30 });

    return messages.some(msg =>
      msg.content?.includes(userId) ||
      msg.content?.includes(`<@${userId}>`) ||
      JSON.stringify(msg.embeds || []).includes(userId)
    );

  } catch (err) {
    console.error("Erro ao verificar serviço:", err);
    return false;
  }
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

🏥 Atendimento  
📞 Chamado  

────────────────────

🏆 PREMIAÇÃO:
🥇 100.000$
🥈 60.000$
🥉 30.000$

📌 Só conta em serviço
⏰ 17:00 - 21:00`
    )
    .setFooter({ text: "Hospital Bella • Evento Ativo" });
}

// 📖 INFO
function painelInfo() {
  return new EmbedBuilder()
    .setColor("#2ecc71")
    .setTitle("📖 INFORMAÇÕES DO EVENTO")
    .setDescription(
`🏥 EVENTO HOSPITAL BELLA

📊 SISTEMA:
• Atendimento  
• Chamado  

⚠️ REGRAS:
• Só em serviço conta  
• Proibido farm  
• Apenas ações reais  

🏆 TOP 3 recebe premiação`
    )
    .setFooter({ text: "Hospital Bella" });
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

// 🚀 COMANDOS
const commands = [
  new SlashCommandBuilder()
    .setName("painelevento")
    .setDescription("Abrir painel do evento"),

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

  console.log("🏥 Bot atualizado!");
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  try {

    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === "painelevento") { // ✅ corrigido
        return interaction.reply({
          embeds: [painelEvento(interaction.user)],
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

    if (!eventoAtivo()) {
      return interaction.reply({
        content: "⛔ Evento não ativo",
        ephemeral: true
      });
    }

    const emServico = await estaEmServico(interaction.guild, interaction.user.id);

    if (!emServico) {
      return interaction.reply({
        content: "🚫 Você precisa estar EM SERVIÇO!",
        ephemeral: true
      });
    }

    const user = getUser(interaction.user.id);

    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos++;

      return interaction.reply({
        content: `🏥 Atendimento registrado`,
        ephemeral: true
      });
    }

    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos++;

      return interaction.reply({
        content: `📞 Chamado registrado`,
        ephemeral: true
      });
    }

    if (interaction.customId === "ranking") {
      const ranking = Object.entries(db.users)
        .sort((a, b) => b[1].pontos - a[1].pontos)
        .slice(0, 3);

      let text = "🏆 TOP 3\n\n";

      ranking.forEach(([id, data], i) => {
        const premio = PREMIO[i + 1];
        text += `${i + 1}. <@${id}> — ${data.pontos} pontos 💰 ${premio}$\n`;
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
