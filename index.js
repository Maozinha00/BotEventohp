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
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} from "discord.js";

// 🔐 CONFIG
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ TOKEN ou CLIENT_ID não configurados");
  process.exit(1);
}

// 👮 CARGOS
const CARGO_SERVICO_ID = "1492553421973356795";
const CARGO_PING = "1477683902079303932";

// 🏆 RECOMPENSAS
const CARGO_1 = "1477683902100410424";
const CARGO_2 = "1495374426815074304";
const CARGO_3 = "1495374557404594267";

// 📌 CANAIS
const CANAL_PAINEL_ID = "1477683908026961940";

// 📅 EVENTO FIXO (NÃO ABRE ANTES E NÃO FECHA ANTES)
const EVENTO_INICIO = new Date("2026-04-19T18:00:00-03:00").getTime();
const EVENTO_FIM = new Date("2026-04-19T21:00:00-03:00").getTime();

// 📊 DB
const db = { users: {} };

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, pontos: 0 };
  }
  return db.users[id];
}

// ⏰ EVENTO SOMENTE POR HORÁRIO (SEM TRAVA MANUAL)
function eventoAberto() {
  const agora = Date.now();
  return agora >= EVENTO_INICIO && agora <= EVENTO_FIM;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

let painelMsgId = null;

// 🔘 BOTÕES
function botoes() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("atendimento").setLabel("🏥 Atendimento").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("chamado").setLabel("📞 Chamado").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("ranking").setLabel("🏆 Ranking").setStyle(ButtonStyle.Danger)
  );
}

// 📢 PAINEL
async function atualizarPainel() {
  const canal = await client.channels.fetch(CANAL_PAINEL_ID);

  const status = eventoAberto() ? "aberto" : "fechado";

  const ranking = Object.entries(db.users)
    .sort((a, b) => b[1].pontos - a[1].pontos)
    .slice(0, 3);

  let topText = "";
  ranking.forEach(([id, d], i) => {
    topText += `\n${i + 1}. <@${id}> — ${d.pontos} pts`;
  });

  const ini = new Date(EVENTO_INICIO);
  const fim = new Date(EVENTO_FIM);

  const embed = new EmbedBuilder()
    .setColor(status === "aberto" ? "#00ff00" : "#ff0000")
    .setTitle("🏥 HOSPITAL BELLA - EVENTO OFICIAL")
    .setDescription(
`━━━━━━━━━━━━━━━━━━━━━━

🏥 **PLANTÃO HOSPITAL BELLA**

📅 Início: ${ini.toLocaleString("pt-BR")}
📅 Fim: ${fim.toLocaleString("pt-BR")}

━━━━━━━━━━━━━━━━━━━━━━

${status === "aberto" 
  ? "🟢 EVENTO ATIVO - ATENDIMENTOS LIBERADOS" 
  : "🔴 EVENTO FECHADO - AGUARDE O HORÁRIO OFICIAL"}

👥 Participantes: ${Object.keys(db.users).length}

━━━━━━━━━━━━━━━━━━━━━━

🏆 TOP 3${topText}

💡 Sistema automático de pontuação em andamento.`
    );

  if (painelMsgId) {
    const msg = await canal.messages.fetch(painelMsgId);
    await msg.edit({ embeds: [embed], components: [botoes()] });
  } else {
    const msg = await canal.send({ embeds: [embed], components: [botoes()] });
    painelMsgId = msg.id;
  }
}

// 🚀 COMANDOS
const commands = [
  new SlashCommandBuilder().setName("ranking").setDescription("Ver ranking")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log(`✅ Online: ${client.user.tag}`);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  setInterval(atualizarPainel, 30000);
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  if (!interaction.guild) return;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const user = getUser(interaction.user.id);

  if (interaction.isButton()) {

    if (!member.roles.cache.has(CARGO_SERVICO_ID))
      return interaction.reply({ content: "🚫 Sem cargo de serviço", ephemeral: true });

    if (!eventoAberto())
      return interaction.reply({ content: "⛔ Evento ainda não está ativo ou já foi encerrado", ephemeral: true });

    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos += 1;
      return interaction.reply({ content: "🏥 +1 ponto registrado", ephemeral: true });
    }

    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos += 2;
      return interaction.reply({ content: "📞 +2 pontos registrado", ephemeral: true });
    }

    if (interaction.customId === "ranking") {
      const ranking = Object.entries(db.users)
        .sort((a, b) => b[1].pontos - a[1].pontos)
        .slice(0, 3);

      let text = "🏆 TOP 3\n\n";
      ranking.forEach(([id, d], i) => {
        text += `${i + 1}. <@${id}> — ${d.pontos} pts\n`;
      });

      return interaction.reply({ content: text || "Sem dados", ephemeral: true });
    }
  }
});

client.login(TOKEN);
