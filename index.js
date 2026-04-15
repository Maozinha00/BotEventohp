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

// 🔐 ENV (CORRIGIDO E SEGURO)
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// 🚨 CHECAGEM FORTE (evita crash silencioso)
if (!TOKEN || TOKEN.trim() === "") {
  console.error("❌ TOKEN não definido nas variáveis de ambiente!");
  process.exit(1);
}

if (!CLIENT_ID || CLIENT_ID.trim() === "") {
  console.error("❌ CLIENT_ID não definido nas variáveis de ambiente!");
  process.exit(1);
}

// 🤖 CLIENT
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 📊 BANCO EM MEMÓRIA
const db = { users: {} };

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

// 🏥 PAINEL
function painelEvento() {
  return new EmbedBuilder()
    .setColor("#00AEEF")
    .setTitle("🏥 EVENTO HOSPITAL BELLA")
    .setDescription(
      `📊 Sistema de Pontuação Ativo

🏥 Atendimentos  
📞 Chamados  
⏱ Horas  

🏆 Ranking automático ativo`
    );
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

// 🚀 SLASH
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel do evento")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

// READY
client.once("ready", async () => {
  console.log(`✅ Online como ${client.user.tag}`);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands
    });

    console.log("✅ Slash command registrado!");
  } catch (err) {
    console.error("❌ Erro ao registrar comandos:", err);
  }
});

// INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  try {
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

    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      return interaction.reply({ content: `🏥 +1 atendimento`, ephemeral: true });
    }

    if (interaction.customId === "chamado") {
      user.chamados++;
      return interaction.reply({ content: `📞 +1 chamado`, ephemeral: true });
    }

    if (interaction.customId === "horas") {
      user.horas++;
      return interaction.reply({ content: `⏱ +1 hora`, ephemeral: true });
    }

    if (interaction.customId === "ranking") {
      const ranking = Object.entries(db.users)
        .sort((a, b) =>
          (b[1].atendimentos + b[1].chamados + b[1].horas) -
          (a[1].atendimentos + a[1].chamados + a[1].horas)
        )
        .slice(0, 5);

      let text = "🏆 TOP 5\n\n";

      if (ranking.length === 0) {
        text += "Sem dados ainda.";
      } else {
        ranking.forEach(([id, data], i) => {
          const total = data.atendimentos + data.chamados + data.horas;
          text += `${i + 1}. <@${id}> - ${total}\n`;
        });
      }

      return interaction.reply({ content: text, ephemeral: true });
    }
  } catch (err) {
    console.error("❌ Erro interação:", err);
  }
});

// LOGIN
client.login(TOKEN);
