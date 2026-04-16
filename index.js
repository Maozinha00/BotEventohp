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

// 👑 CARGO QUE VAI SER MENCIONADO
const CARGO_EVENTO_ID = "1477683902079303932";

// 📅 EVENTO ATIVO ATÉ SEXTA
function eventoAtivo() {
  const hoje = new Date().getDay();
  return hoje <= 5; // 0 domingo ... 5 sexta
}

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 📊 BANCO SIMPLES (memória)
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
• Ranking atualizado em tempo real  
• Sistema individual por participante  

🏆 **OBJETIVO**
Conquistar o maior número de pontos até o fim do evento

────────────────────

⚠️ Apenas ações reais dentro do hospital contam`
    )
    .setFooter({ text: "Hospital Bella • Sistema de Evento" });
}

// 📖 REGRAS
function painelEventoInfo() {
  return new EmbedBuilder()
    .setColor("#2ecc71")
    .setTitle("🏥 REGRAS DO EVENTO HOSPITAL BELLA")
    .setDescription(
`📊 **EVENTO OFICIAL DO HOSPITAL BELLA**

🏥 **OBJETIVO**
Acumular pontos realizando atendimentos e chamados durante o evento.

📞 **PONTUAÇÃO**
• Atendimento médico → +1 ponto  
• Chamado atendido → +1 ponto  

🏆 **PREMIAÇÃO**
• Top 1, Top 2 e Top 3 recebem bônus especial  
• Ranking atualizado automaticamente

⚠️ **REGRAS**
• Somente ações com Diretor online serão validadas  
• Proibido farm de pontos ou abuso do sistema  
• Apenas atendimentos reais contam  
• Fraudes podem gerar desclassificação  

📅 **DURAÇÃO**
Evento ativo até sexta-feira`
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

// 🚀 SLASH COMMANDS
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

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commands
    });

    console.log("🏥 Comandos registrados com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao registrar comandos:", err);
  }
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  try {

    // 📌 COMANDOS
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

    // 📌 BOTÕES
    if (!interaction.isButton()) return;

    // 🚫 EVENTO ENCERRADO
    if (!eventoAtivo()) {
      return interaction.reply({
        content: "⛔ O evento já foi encerrado!",
        ephemeral: true
      });
    }

    const user = getUser(interaction.user.id);

    // 🏥 ATENDIMENTO
    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos++;

      return interaction.reply({
        content: `🏥 Atendimento registrado com sucesso! +1 ponto\n📊 Total: **${user.pontos} pontos**`,
        ephemeral: true
      });
    }

    // 📞 CHAMADO
    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos++;

      return interaction.reply({
        content: `📞 Chamado atendido! +1 ponto\n📊 Total: **${user.pontos} pontos**`,
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
