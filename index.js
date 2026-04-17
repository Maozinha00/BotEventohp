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

// 🔐 ENV
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ TOKEN ou CLIENT_ID não configurados");
  process.exit(1);
}

// 👑 CARGOS
const CARGO_EVENTO_ID = "1477683902079303932";
const CARGO_SERVICO_ID = "1492553421973356795";

// 📌 CANAL SERVIÇO
const CANAL_SERVICO_ID = "1490431346298851490";

// 🏆 PREMIAÇÃO
const PREMIO = {
  1: 100000,
  2: 60000,
  3: 30000
};

// 🔥 STATUS DO EVENTO
let eventoStatus = "fechado"; 
// fechado | aberto | cancelado

function eventoAtivo() {
  return eventoStatus === "aberto";
}

// 🤖 BOT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
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
      msg.content?.includes(`<@${userId}>`)
    );
  } catch {
    return false;
  }
}

// 🏥 PAINEL
function painelEvento(user) {
  return new EmbedBuilder()
    .setColor("#00AEEF")
    .setTitle("🏥 EVENTO HOSPITAL BELLA")
    .setDescription(
`👑 Responsável:
${user}

⚕️ <@&${CARGO_EVENTO_ID}>

━━━━━━━━━━━━━━━━━━━
🏥 Atendimento  
📞 Chamado  
━━━━━━━━━━━━━━━━━━━

🏆 PREMIAÇÃO
🥇 100.000$
🥈 60.000$
🥉 30.000$

📌 Só conta em serviço`
    );
}

// 📢 INFO EVENTO
function painelInfo() {
  let statusTexto = "";

  if (eventoStatus === "aberto") {
    statusTexto = "🟢 EVENTO ABERTO AGORA!";
  } else if (eventoStatus === "fechado") {
    statusTexto = "🔴 EVENTO FECHADO";
  } else {
    statusTexto = "🟥 EVENTO CANCELADO";
  }

  return new EmbedBuilder()
    .setColor("#ff0000")
    .setTitle("📢 GRANDE EVENTO HOSPITAL BELLA")
    .setDescription(
`🚨 **ATENÇÃO EQUIPE MÉDICA** 🚨

${statusTexto}

━━━━━━━━━━━━━━━━━━━

🏥 COMO PARTICIPAR
• Atendimento  
• Chamados  
• Estar em serviço  

━━━━━━━━━━━━━━━━━━━

🏆 PREMIAÇÃO
🥇 100.000$  
🥈 60.000$  
🥉 30.000$  

🔥 Boa sorte!`
    )
    .setTimestamp();
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
    .setDescription("Abrir painel"),

  new SlashCommandBuilder()
    .setName("infoevento")
    .setDescription("Ver info do evento"),

  new SlashCommandBuilder()
    .setName("abrirevento")
    .setDescription("Abrir evento"),

  new SlashCommandBuilder()
    .setName("fecharevento")
    .setDescription("Fechar evento"),

  new SlashCommandBuilder()
    .setName("eventocancelado")
    .setDescription("Cancelar evento")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

// ✅ READY
client.once("ready", async () => {
  console.log(`✅ Online: ${client.user.tag}`);

  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commands
  });

  console.log("✅ Comandos registrados");
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  try {

    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

    // 🔹 COMANDOS
    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === "abrirevento") {
        eventoStatus = "aberto";
        return interaction.reply({
          content: "🟢 Evento ABERTO!",
          ephemeral: true
        });
      }

      if (interaction.commandName === "fecharevento") {
        eventoStatus = "fechado";
        return interaction.reply({
          content: "🔴 Evento FECHADO!",
          ephemeral: true
        });
      }

      if (interaction.commandName === "eventocancelado") {
        eventoStatus = "cancelado";
        return interaction.reply({
          content: "🟥 Evento cancelado oficialmente pela administração. Aguarde novas informações.",
          ephemeral: true
        });
      }

      if (interaction.commandName === "painelevento") {
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

    // 🔘 BOTÕES
    if (!interaction.isButton()) return;

    if (!eventoAtivo()) {
      return interaction.reply({
        content: "⛔ Evento não está ativo",
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!member.roles.cache.has(CARGO_SERVICO_ID)) {
      return interaction.reply({
        content: "🚫 Você não está em serviço!",
        ephemeral: true
      });
    }

    const emServico = await estaEmServico(interaction.guild, interaction.user.id);

    if (!emServico) {
      return interaction.reply({
        content: "🚫 Você não registrou serviço no canal!",
        ephemeral: true
      });
    }

    const user = getUser(interaction.user.id);

    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos++;
      return interaction.reply({ content: "🏥 Atendimento registrado", ephemeral: true });
    }

    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos++;
      return interaction.reply({ content: "📞 Chamado registrado", ephemeral: true });
    }

    if (interaction.customId === "ranking") {
      const ranking = Object.entries(db.users)
        .sort((a, b) => b[1].pontos - a[1].pontos)
        .slice(0, 3);

      let text = "🏆 TOP 3\n\n";

      ranking.forEach(([id, data], i) => {
        text += `${i + 1}. <@${id}> — ${data.pontos} pontos 💰 ${PREMIO[i + 1]}$\n`;
      });

      return interaction.reply({
        content: text || "Sem dados ainda",
        ephemeral: true
      });
    }

  } catch (err) {
    console.error(err);
  }
});

client.login(TOKEN);
