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

// 👑 CARGO EVENTO
const CARGO_EVENTO_ID = "1477683902079303932";

// 📅 EVENTO: 16/04/2026 DAS 17:00 ATÉ 21:00
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

// 📊 BANCO EM MEMÓRIA
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

// 🏥 PAINEL PRINCIPAL
function painelEvento(user) {
  return new EmbedBuilder()
    .setColor("#00AEEF")
    .setTitle("🏥 EVENTO HOSPITAL BELLA")
    .setDescription(
`👑 **RESPONSÁVEL DO EVENTO**
${user}

⚕️ <@&${CARGO_EVENTO_ID}>

────────────────────

📊 **SISTEMA DE PONTUAÇÃO**

🏥 Atendimento médico → **+1 ponto**
📞 Chamado atendido → **+1 ponto**

💡 **COMO FUNCIONA**
• Cada ação válida gera pontos automaticamente  
• Ranking em tempo real  
• Sistema individual por participante  

🏆 **OBJETIVO**
Conquistar o maior número de pontos

────────────────────

📅 **HORÁRIO DO EVENTO**
16/04/2026 — 17:00 até 21:00

⚠️ Apenas ações reais dentro do hospital contam`
    )
    .setFooter({ text: "Hospital Bella • Evento Ativo" });
}

// 📖 REGRAS
function painelEventoInfo() {
  return new EmbedBuilder()
    .setColor("#2ecc71")
    .setTitle("🏥 REGRAS DO EVENTO HOSPITAL BELLA")
    .setDescription(
`📊 **EVENTO OFICIAL**

🏥 **OBJETIVO**
Acumular pontos com atendimentos e chamados dentro do horário do evento.

📞 **PONTUAÇÃO**
• Atendimento → +1 ponto  
• Chamado → +1 ponto  

🏆 **PREMIAÇÃO**
Top 3 recebem premiação especial

⚠️ **REGRAS**
• Só conta dentro do horário (17:00–21:00)  
• Proibido farm de pontos  
• Apenas ações reais contam  
• Fraude = desclassificação

📅 **HORÁRIO**
16/04/2026 — 17:00 até 21:00`
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

  console.log("🏥 Evento configurado com horário 17:00–21:00!");
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

    // 🚫 FORA DO HORÁRIO
    if (!eventoAtivo()) {
      return interaction.reply({
        content: "⛔ O evento só funciona das 17:00 até 21:00!",
        ephemeral: true
      });
    }

    const user = getUser(interaction.user.id);

    // 🏥 ATENDIMENTO
    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos++;

      return interaction.reply({
        content: `🏥 Atendimento registrado! +1 ponto\n📊 Total: **${user.pontos} pontos**`,
        ephemeral: true
      });
    }

    // 📞 CHAMADO
    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos++;

      return interaction.reply({
        content: `📞 Chamado registrado! +1 ponto\n📊 Total: **${user.pontos} pontos**`,
        ephemeral: true
      });
    }

    // 🏆 RANKING
    if (interaction.customId === "ranking") {
      const ranking = Object.entries(db.users)
        .sort((a, b) => b[1].pontos - a[1].pontos)
        .slice(0, 5);

      let text = "🏆 **TOP 5 HOSPITAL BELLA**\n\n";

      if (ranking.length === 0) {
        text += "Nenhum participante ainda.";
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

// 🔑 LOGIN
client.login(TOKEN);
