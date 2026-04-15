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

// 🚨 CHECK
if (!TOKEN || !CLIENT_ID) {
  console.error("❌ TOKEN ou CLIENT_ID não configurados");
  process.exit(1);
}

// 👑 CARGO QUE VAI SER MENCIONADO (NOTIFICAÇÃO)
const CARGO_EVENTO_ID = "1477683902079303932";

// 📅 EVENTO ATIVO ATÉ SEXTA
function eventoAtivo() {
  const hoje = new Date().getDay();
  return hoje <= 5;
}

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 📊 BANCO
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

// 🏥 PAINEL
function painelEvento(user) {
  return new EmbedBuilder()
    .setColor("#00AEEF")
    .setTitle("🏥 EVENTO HOSPITAL BELLA")
    .setDescription(
      `👑 **RESPONSÁVEL DO EVENTO**
${user}

⚕️ <@&${CARGO_EVENTO_ID}>

────────────────────

📊 SISTEMA DE PONTUAÇÃO

🏥 Atendimento = +1 ponto  
📞 Chamado = +1 ponto  

🏆 Ranking automático ativo`
    )
    .setFooter({ text: "Hospital Bella • Sistema de Evento" });
}

// 📖 REGRAS
function painelEventoInfo() {
  return new EmbedBuilder()
    .setColor("#2ecc71")
    .setTitle("🏥 REGRAS DO EVENTO HOSPITAL BELLA")
    .setDescription(
      `📊 EVENTO OFICIAL

🏥 Objetivo:
Acumular pontos com atendimentos e chamados.

📞 Pontuação:
• Atendimento = +1 ponto  
• Chamado = +1 ponto  

🏆 Premiação:
Top 1, Top 2 e Top 3 recebem bônus especial.

⚠️ REGRAS:
• Só vale pontos com Diretor online  
• Proibido farm  
• Apenas ações reais contam  

📅 Termina na sexta-feira`
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
      .setCustomId("ranking")
      .setLabel("🏆 Ranking")
      .setStyle(ButtonStyle.Danger)
  );
}

// 🚀 COMANDOS
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel do evento hospitalar"),

  new SlashCommandBuilder()
    .setName("painelevento")
    .setDescription("Ver regras do evento hospitalar")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

// READY
client.once("ready", async () => {
  console.log(`✅ Online como ${client.user.tag}`);

  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commands
  });

  console.log("🏥 Evento hospital ativo!");
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

      if (interaction.commandName === "painelevento") {
        return interaction.reply({
          embeds: [painelEventoInfo()]
        });
      }
    }

    if (!interaction.isButton()) return;

    // 🚫 BLOQUEIO APÓS SEXTA
    if (!eventoAtivo()) {
      return interaction.reply({
        content: "⛔ O evento já foi encerrado!",
        ephemeral: true
      });
    }

    const user = getUser(interaction.user.id);

    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos++;

      return interaction.reply({
        content: `🏥 Atendimento registrado! +1 ponto\n📊 Total: **${user.pontos}**`,
        ephemeral: true
      });
    }

    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos++;

      return interaction.reply({
        content: `📞 Chamado registrado! +1 ponto\n📊 Total: **${user.pontos}**`,
        ephemeral: true
      });
    }

    if (interaction.customId === "ranking") {
      const ranking = Object.entries(db.users)
        .sort((a, b) => b[1].pontos - a[1].pontos)
        .slice(0, 5);

      let text = "🏆 **TOP 5 HOSPITAL BELLA**\n\n";

      if (ranking.length === 0) {
        text += "Nenhum jogador ainda.";
      } else {
        ranking.forEach(([id, data], i) => {
          text += `**${i + 1}. <@${id}>** — ${data.pontos} pontos\n`;
        });
      }

      return interaction.reply({
        content: text,
        ephemeral: true
      });
    }
  } catch (err) {
    console.error("❌ Erro:", err);
  }
});

// LOGIN
client.login(TOKEN);
