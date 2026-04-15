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

// 🌐 ENV VARS (RAILWAY)
const TOKEN = process.env.TOKEN || "";
const CLIENT_ID = process.env.CLIENT_ID || "";

// 🔐 SEGURANÇA
if (!TOKEN) {
  console.error("❌ TOKEN não encontrado nas variáveis de ambiente!");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ CLIENT_ID não encontrado nas variáveis de ambiente!");
  process.exit(1);
}

// 🤖 CLIENT
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 📊 BANCO EM MEMÓRIA
const db = {
  users: {}
};

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = {
      atendimentos: 0,
      chamados: 0,
      horas: 0
    };
  }
  return db.users[id];
}

// 🏥 PAINEL DO EVENTO
function painelEvento() {
  return new EmbedBuilder()
    .setColor("#00AEEF")
    .setTitle("🏥 EVENTO HOSPITAL BELLA")
    .setDescription(
      `📊 **Sistema de Pontuação Ativo**

🏥 Atendimentos: + pontos  
📞 Chamados: + pontos  
⏱ Horas no plantão: + bônus  

🏆 Ranking automático com base na performance!`
    )
    .setFooter({ text: "Hospital Bella • Sistema de Evento" });
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
      .setCustomId("horas")
      .setLabel("⏱ Hora")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("ranking")
      .setLabel("🏆 Ranking")
      .setStyle(ButtonStyle.Danger)
  );
}

// 🚀 SLASH COMMAND
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel do evento hospitalar")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

// 🎯 READY
client.once("ready", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands
    });

    console.log("✅ Slash command registrado com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao registrar comandos:", err);
  }
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  try {
    // /painel
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel") {
        return interaction.reply({
          embeds: [painelEvento()],
          components: [botoesEvento()]
        });
      }
    }

    if (!interaction.isButton()) return;

    const user = getUser(interaction.user.id);

    // 🏥 atendimento
    if (interaction.customId === "atendimento") {
      user.atendimentos++;

      return interaction.reply({
        content: `🏥 Atendimento registrado! Total: **${user.atendimentos}**`,
        ephemeral: true
      });
    }

    // 📞 chamado
    if (interaction.customId === "chamado") {
      user.chamados++;

      return interaction.reply({
        content: `📞 Chamado registrado! Total: **${user.chamados}**`,
        ephemeral: true
      });
    }

    // ⏱ horas
    if (interaction.customId === "horas") {
      user.horas++;

      return interaction.reply({
        content: `⏱ Hora registrada! Total: **${user.horas}h**`,
        ephemeral: true
      });
    }

    // 🏆 ranking
    if (interaction.customId === "ranking") {
      const ranking = Object.entries(db.users)
        .sort((a, b) => {
          const totalA = a[1].atendimentos + a[1].chamados + a[1].horas;
          const totalB = b[1].atendimentos + b[1].chamados + b[1].horas;
          return totalB - totalA;
        })
        .slice(0, 5);

      let texto = "🏆 **TOP 5 EVENTO HOSPITAL**\n\n";

      if (ranking.length === 0) {
        texto += "Nenhum dado registrado ainda.";
      } else {
        ranking.forEach(([id, data], i) => {
          const total = data.atendimentos + data.chamados + data.horas;
          texto += `**${i + 1}. <@${id}>** — ${total} pontos\n`;
        });
      }

      return interaction.reply({
        content: texto,
        ephemeral: true
      });
    }
  } catch (err) {
    console.error("❌ Erro na interação:", err);
  }
});

// 🚀 LOGIN
client.login(TOKEN);