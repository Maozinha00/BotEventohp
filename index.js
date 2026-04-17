import "dotenv/config"; // funciona no PC, Railway ignora se não tiver .env

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

// 📅 EVENTO (17/04/2026)
function eventoAtivo() {
  const agora = new Date();
  const inicio = new Date("2026-04-17T19:00:00");
  const fim = new Date("2026-04-17T21:00:00");
  return agora >= inicio && agora <= fim;
}

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 📊 BANCO SIMPLES
const db = { users: {} };

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = {
      atendimentos: 0,
      chamados: 0,
      pontos: 0
    };
  }
  return db.users[id];
}

// 🔍 VERIFICAR SERVIÇO
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

// 🏥 PAINEL PRINCIPAL
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

🏆 PREMIAÇÃO:
🥇 100.000$
🥈 60.000$
🥉 30.000$

📌 Só conta em serviço
⏰ 19:00 às 21:00`
    );
}

// 📖 SEGUNDA DESCRIÇÃO (INFO)
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
• Apenas em serviço conta
• Proibido farm
• Apenas ações reais

🏆 PREMIAÇÃO:
TOP 3 recebe dinheiro`
    );
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

// ✅ ONLINE
client.once("ready", async () => {
  console.log(`✅ Online: ${client.user.tag}`);

  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commands
  });

  console.log("✅ Comandos carregados");
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  try {

    // 📌 COMANDOS
    if (interaction.isChatInputCommand()) {

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

    if (!interaction.isButton()) return;

    // ⛔ Evento fora
    if (!eventoAtivo()) {
      return interaction.reply({
        content: "⛔ Evento não está ativo agora",
        ephemeral: true
      });
    }

    // 🔍 Cargo
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!member.roles.cache.has(CARGO_SERVICO_ID)) {
      return interaction.reply({
        content: "🚫 Você não está no cargo de serviço!",
        ephemeral: true
      });
    }

    // 🔍 Serviço
    const emServico = await estaEmServico(interaction.guild, interaction.user.id);

    if (!emServico) {
      return interaction.reply({
        content: "🚫 Você não registrou serviço no canal!",
        ephemeral: true
      });
    }

    const user = getUser(interaction.user.id);

    // 🏥 Atendimento
    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos++;

      return interaction.reply({
        content: "🏥 Atendimento registrado",
        ephemeral: true
      });
    }

    // 📞 Chamado
    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos++;

      return interaction.reply({
        content: "📞 Chamado registrado",
        ephemeral: true
      });
    }

    // 🏆 Ranking
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

// 🔑 LOGIN
client.login(TOKEN);
