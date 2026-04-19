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

// 🔐 CONFIG
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ TOKEN ou CLIENT_ID não configurados");
  process.exit(1);
}

// 👮 CARGOS
const CARGO_ADMIN_ID = "1490431614055088128"; // STAFF
const CARGO_SERVICO_ID = "1492553421973356795"; // PARTICIPAÇÃO

// 📅 EVENTO
const EVENTO_DATA = "19/04/2026";
const EVENTO_INICIO = new Date("2026-04-19T18:00:00-03:00");
const EVENTO_FIM = new Date("2026-04-19T21:00:00-03:00");

// 🔥 CONTROLE MANUAL
let eventoManual = null; 
// null = automático | true = aberto | false = fechado

// ⏰ STATUS
function getEventoStatus() {
  const agora = new Date();

  if (eventoManual !== null) {
    return eventoManual ? "aberto" : "fechado";
  }

  if (agora >= EVENTO_INICIO && agora <= EVENTO_FIM) {
    return "aberto";
  }

  return "fechado";
}

function eventoAtivo() {
  return getEventoStatus() === "aberto";
}

// 👮 PERMISSÕES
function isAdmin(member) {
  return member.roles.cache.has(CARGO_ADMIN_ID);
}

function podeParticipar(member) {
  return member.roles.cache.has(CARGO_SERVICO_ID);
}

// 🤖 BOT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// 📊 DB SIMPLES
const db = { users: {} };

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, pontos: 0 };
  }
  return db.users[id];
}

// 📅 DATA HOJE
function getDataHoje() {
  return new Date().toLocaleDateString("pt-BR");
}

// 📢 EMBED DO EVENTO
function painelInfo() {
  const status = getEventoStatus();

  return new EmbedBuilder()
    .setColor(status === "aberto" ? "#00ff00" : "#ff0000")
    .setTitle("📢 EVENTO HOSPITAL BELLA")
    .setDescription(
`🚨 **EVENTO ESPECIAL HOJE**

📅 **DIA:** Domingo (${EVENTO_DATA})  
⏰ **HORÁRIO:** 18:00 ATÉ 21:00  

━━━━━━━━━━━━━━━━━━━

📅 HOJE: ${getDataHoje()}

${status === "aberto" ? "🟢 EVENTO ONLINE AGORA!" : "🔴 EVENTO FECHADO"}

━━━━━━━━━━━━━━━━━━━

🏥 REGRAS DO EVENTO
• Apenas cargo de serviço participa  
• Estar em serviço obrigatório  
• Usar botões do evento  

━━━━━━━━━━━━━━━━━━━

🏆 PREMIAÇÃO
🥇 100.000$  
🥈 60.000$  
🥉 30.000$

━━━━━━━━━━━━━━━━━━━

👮 CONTROLADO POR STAFF`
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
  new SlashCommandBuilder().setName("painelevento").setDescription("Abrir painel"),
  new SlashCommandBuilder().setName("infoevento").setDescription("Ver evento"),
  new SlashCommandBuilder().setName("abrirevento").setDescription("Abrir evento (STAFF)"),
  new SlashCommandBuilder().setName("fecharevento").setDescription("Fechar evento (STAFF)")
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
  if (!interaction.guild) return;

  const member = await interaction.guild.members.fetch({
    user: interaction.user.id,
    force: true
  });

  // 👮 COMANDOS STAFF
  if (interaction.isChatInputCommand()) {

    if (!isAdmin(member)) {
      return interaction.reply({
        content: "🚫 Apenas STAFF pode usar isso.",
        ephemeral: true
      });
    }

    if (interaction.commandName === "abrirevento") {
      eventoManual = true;

      return interaction.reply({
        content: "🟢 EVENTO ONLINE!",
        ephemeral: true
      });
    }

    if (interaction.commandName === "fecharevento") {
      eventoManual = false;

      return interaction.reply({
        content: "🔴 EVENTO FECHADO!",
        ephemeral: true
      });
    }

    if (interaction.commandName === "painelevento") {
      return interaction.reply({
        embeds: [painelInfo()],
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
  if (interaction.isButton()) {

    if (!eventoAtivo()) {
      return interaction.reply({
        content: "⛔ Evento fechado",
        ephemeral: true
      });
    }

    if (!podeParticipar(member)) {
      return interaction.reply({
        content: "🚫 Você não tem o cargo para participar.",
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
        text += `${i + 1}. <@${id}> — ${data.pontos} pts\n`;
      });

      return interaction.reply({
        content: text || "Sem dados ainda",
        ephemeral: true
      });
    }
  }
});

client.login(TOKEN);
