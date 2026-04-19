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
const CARGO_ADMIN_ID = "1490431614055088128";
const CARGO_SERVICO_ID = "1492553421973356795";
const CARGO_PING = "1477683902079303932";

// 📌 CANAL DO PAINEL (COLOQUE O ID DO CANAL AQUI)
const CANAL_PAINEL_ID = "COLOQUE_O_ID_DO_CANAL_AQUI";

// 📅 EVENTO
const EVENTO_INICIO = new Date("2026-04-19T18:00:00-03:00");
const EVENTO_FIM = new Date("2026-04-19T21:00:00-03:00");

// 🔥 STATUS
function getEventoStatus() {
  const agora = new Date();
  if (agora >= EVENTO_INICIO && agora <= EVENTO_FIM) return "aberto";
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
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
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

// 📢 EMBED EVENTO
function painelInfo() {
  const status = getEventoStatus();

  return new EmbedBuilder()
    .setColor(status === "aberto" ? "#00ff00" : "#ff0000")
    .setTitle("📢 EVENTO HOSPITAL BELLA")
    .setDescription(
`<@&${CARGO_PING}>

🚨 EVENTO ESPECIAL HOJE

📅 DIA: Domingo (19/04/2026)  
⏰ HORÁRIO: 18:00 ATÉ 21:00  

━━━━━━━━━━━━━━━━━━━

📅 HOJE: ${getDataHoje()}

${status === "aberto" ? "🟢 EVENTO ABERTO" : "🔴 EVENTO FECHADO"}

━━━━━━━━━━━━━━━━━━━

🏥 REGRAS
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

// 📢 PAINEL AUTOMÁTICO
let painelMsgId = null;

async function atualizarPainel() {
  try {
    const canal = await client.channels.fetch(CANAL_PAINEL_ID);
    if (!canal) return;

    const embed = painelInfo();

    if (painelMsgId) {
      try {
        const msg = await canal.messages.fetch(painelMsgId);
        await msg.edit({ embeds: [embed] });
        return;
      } catch {}
    }

    const msg = await canal.send({ embeds: [embed] });
    painelMsgId = msg.id;
  } catch (err) {
    console.error("Erro painel:", err);
  }
}

// ⏰ AUTO 18H / 21H
setInterval(async () => {
  const agora = new Date();
  const h = agora.getHours();
  const m = agora.getMinutes();

  if (h === 18 && m === 0) {
    await atualizarPainel();
  }

  if (h === 21 && m === 0) {
    await atualizarPainel();
  }
}, 60000);

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

  setTimeout(() => atualizarPainel(), 5000);
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {
  if (!interaction.guild) return;

  const member = await interaction.guild.members.fetch({
    user: interaction.user.id,
    force: true
  });

  // 👮 STAFF
  if (interaction.isChatInputCommand()) {

    if (!isAdmin(member)) {
      return interaction.reply({ content: "🚫 Apenas STAFF.", ephemeral: true });
    }

    if (interaction.commandName === "abrirevento") {
      EVENTO_INICIO.setTime(Date.now() - 1000);
      await atualizarPainel();

      return interaction.reply({ content: "🟢 Evento aberto!", ephemeral: true });
    }

    if (interaction.commandName === "fecharevento") {
      EVENTO_FIM.setTime(Date.now() - 1000);
      await atualizarPainel();

      return interaction.reply({ content: "🔴 Evento fechado!", ephemeral: true });
    }

    if (interaction.commandName === "painelevento") {
      return interaction.reply({
        embeds: [painelInfo()],
        components: [botoes()]
      });
    }

    if (interaction.commandName === "infoevento") {
      return interaction.reply({
        content: `<@&${CARGO_PING}>`,
        embeds: [painelInfo()]
      });
    }
  }

  // 🔘 BOTÕES
  if (interaction.isButton()) {

    if (!eventoAtivo()) {
      return interaction.reply({ content: "⛔ Evento fechado", ephemeral: true });
    }

    if (!podeParticipar(member)) {
      return interaction.reply({ content: "🚫 Sem cargo de serviço.", ephemeral: true });
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

      return interaction.reply({ content: text || "Sem dados", ephemeral: true });
    }
  }
});

client.login(TOKEN);
