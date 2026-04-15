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

// 🚨 CHECK DE ERRO (Railway safe)
if (!TOKEN || TOKEN.trim() === "") {
  console.error("❌ TOKEN não definido no Railway");
  process.exit(1);
}

if (!CLIENT_ID || CLIENT_ID.trim() === "") {
  console.error("❌ CLIENT_ID não definido no Railway");
  process.exit(1);
}

// 🤖 BOT
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

function totalPontos(u) {
  return u.atendimentos + u.chamados + u.horas;
}

// 🏥 PAINEL INTERATIVO
function painelEvento() {
  return new EmbedBuilder()
    .setColor("#00AEEF")
    .setTitle("🏥 EVENTO HOSPITAL BELLA")
    .setDescription(
      `📊 **Sistema de Pontuação Ativo**

🏥 Atendimento = +1 ponto  
📞 Chamado = +1 ponto  
⏱ Hora = +1 ponto  

🏆 Ranking automático ativo`
    )
    .setFooter({ text: "Hospital Bella • Sistema de Evento" });
}

// 📖 PAINEL INFORMATIVO
function painelEventoInfo() {
  return new EmbedBuilder()
    .setColor("#2ecc71")
    .setTitle("🏥 INFORMAÇÕES DO EVENTO")
    .setDescription(
      `📊 **EVENTO HOSPITAL BELLA**

🏥 Objetivo:
Realizar atendimentos e chamados para acumular pontos.

📞 Sistema:
• Atendimento = +1 ponto  
• Chamado = +1 ponto  
• Horas = bônus no ranking  

🏆 Premiação:
Top 1, Top 2 e Top 3 recebem bônus especial

⚠️ Regras:
• Proibido farm de pontos  
• Apenas atendimentos válidos contam  
• Respeito obrigatório`
    )
    .setFooter({ text: "Hospital Bella • Evento Oficial" });
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

// 🚀 COMANDOS
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel interativo do evento hospitalar"),

  new SlashCommandBuilder()
    .setName("painelevento")
    .setDescription("Ver informações e regras do evento hospitalar")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

// READY
client.once("ready", async () => {
  console.log(`✅ Online como ${client.user.tag}`);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands
    });

    console.log("✅ Comandos registrados com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao registrar comandos:", err);
  }
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  try {
    // slash commands
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel") {
        return interaction.reply({
          embeds: [painelEvento()],
          components: [botoesEvento()]
        });
      }

      if (interaction.commandName === "painelevento") {
        return interaction.reply({
          embeds: [painelEventoInfo()],
          ephemeral: false
        });
      }
    }

    if (!interaction.isButton()) return;

    const user = getUser(interaction.user.id);

    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      return interaction.reply({
        content: `🏥 Atendimento registrado! Total: **${user.atendimentos}**`,
        ephemeral: true
      });
    }

    if (interaction.customId === "chamado") {
      user.chamados++;
      return interaction.reply({
        content: `📞 Chamado registrado! Total: **${user.chamados}**`,
        ephemeral: true
      });
    }

    if (interaction.customId === "horas") {
      user.horas++;
      return interaction.reply({
        content: `⏱ Hora registrada! Total: **${user.horas}**`,
        ephemeral: true
      });
    }

    if (interaction.customId === "ranking") {
      const ranking = Object.entries(db.users)
        .sort((a, b) => totalPontos(b[1]) - totalPontos(a[1]))
        .slice(0, 5);

      let text = "🏆 **TOP 5 EVENTO HOSPITAL**\n\n";

      if (ranking.length === 0) {
        text += "Nenhum dado registrado ainda.";
      } else {
        ranking.forEach(([id, data], i) => {
          text += `**${i + 1}. <@${id}>** — ${totalPontos(data)} pontos\n`;
        });
      }

      return interaction.reply({
        content: text,
        ephemeral: true
      });
    }
  } catch (err) {
    console.error("❌ Erro interação:", err);
  }
});

// 🚀 LOGIN
client.login(TOKEN);
