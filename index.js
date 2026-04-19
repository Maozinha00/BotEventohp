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
const CARGO_ADMIN_ID = "1490431614055088128";
const CARGO_SERVICO_ID = "1492553421973356795";
const CARGO_PING = "1477683902079303932";

// 🏆 RECOMPENSAS
const CARGO_1 = "1477683902100410424";
const CARGO_2 = "1495374426815074304";
const CARGO_3 = "1495374557404594267";

// 📌 CANAIS
const CANAL_PAINEL_ID = "1477683908026961940";

// 📅 EVENTO
let EVENTO_INICIO = Date.parse("2026-04-19T18:00:00-03:00");
let EVENTO_FIM = Date.parse("2026-04-19T21:00:00-03:00");
let eventoManual = null;

// 📊 DB
const db = { users: {} };

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, pontos: 0 };
  }
  return db.users[id];
}

function eventoAberto() {
  const agora = Date.now();
  if (eventoManual === true) return true;
  if (eventoManual === false) return false;
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
    new ButtonBuilder().setCustomId("ranking").setLabel("🏆 Ranking").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("config_evento").setLabel("⚙️ Configurar Evento").setStyle(ButtonStyle.Secondary)
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

  const embed = new EmbedBuilder()
    .setColor(status === "aberto" ? "#00ff00" : "#ff0000")
    .setTitle("📢 EVENTO HOSPITAL BELLA")
    .setDescription(
`🚨 **EVENTO AUTOMATIZADO**

⏰ Início: ${new Date(EVENTO_INICIO).toLocaleString("pt-BR")}
📅 Data: ${new Date(EVENTO_INICIO).toLocaleDateString("pt-BR")}

⏰ Fim: ${new Date(EVENTO_FIM).toLocaleString("pt-BR")}
📅 Data: ${new Date(EVENTO_FIM).toLocaleDateString("pt-BR")}

━━━━━━━━━━━━━━━━━━━━━━

🟢 Status: ${eventoAberto() ? "ABERTO" : "FECHADO"}

👥 Participantes: ${Object.keys(db.users).length}

━━━━━━━━━━━━━━━━━━━━━━

🏆 TOP 3${topText}`
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
  new SlashCommandBuilder().setName("abrirevento").setDescription("Abrir evento"),
  new SlashCommandBuilder().setName("fecharevento").setDescription("Fechar evento"),
  new SlashCommandBuilder().setName("painelhora").setDescription("Configurar data e hora")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log(`✅ Online: ${client.user.tag}`);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  setTimeout(atualizarPainel, 3000);
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  if (!interaction.guild) return;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const user = getUser(interaction.user.id);

  // 🔘 BOTÕES
  if (interaction.isButton()) {

    if (interaction.customId === "config_evento") {
      const modal = new ModalBuilder()
        .setCustomId("modal_evento")
        .setTitle("Configurar Evento");

      const inicio = new TextInputBuilder()
        .setCustomId("inicio")
        .setLabel("Início (YYYY-MM-DD HH:mm)")
        .setStyle(TextInputStyle.Short);

      const fim = new TextInputBuilder()
        .setCustomId("fim")
        .setLabel("Fim (YYYY-MM-DD HH:mm)")
        .setStyle(TextInputStyle.Short);

      modal.addComponents(
        new ActionRowBuilder().addComponents(inicio),
        new ActionRowBuilder().addComponents(fim)
      );

      return interaction.showModal(modal);
    }

    if (!member.roles.cache.has(CARGO_SERVICO_ID))
      return interaction.reply({ content: "🚫 Sem cargo de serviço", ephemeral: true });

    if (!eventoAberto())
      return interaction.reply({ content: "⛔ Evento fechado", ephemeral: true });

    if (interaction.customId === "atendimento") {
      user.atendimentos++;
      user.pontos += 1;
      return interaction.reply({ content: "🏥 +1 ponto", ephemeral: true });
    }

    if (interaction.customId === "chamado") {
      user.chamados++;
      user.pontos += 2;
      return interaction.reply({ content: "📞 +2 pontos", ephemeral: true });
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

  // 🧠 MODAL
  if (interaction.isModalSubmit()) {

    if (interaction.customId === "modal_evento") {

      const ini = Date.parse(interaction.fields.getTextInputValue("inicio") + ":00-03:00");
      const fim = Date.parse(interaction.fields.getTextInputValue("fim") + ":00-03:00");

      if (!ini || !fim)
        return interaction.reply({ content: "❌ Data inválida", ephemeral: true });

      EVENTO_INICIO = ini;
      EVENTO_FIM = fim;

      await atualizarPainel();

      return interaction.reply({ content: "✅ Evento atualizado", ephemeral: true });
    }
  }
});

client.login(TOKEN);
