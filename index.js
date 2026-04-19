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

// 🏆 RECOMPENSAS
const CARGO_1 = "1477683902100410424";
const CARGO_2 = "1495374426815074304";
const CARGO_3 = "1495374557404594267";

// 📌 CANAIS
const CANAL_PAINEL_ID = "1477683908026961940";
const CANAL_LOGS_ID = "1495370353193521182";

// 📅 HORÁRIO DO EVENTO
const EVENTO_INICIO = new Date("2026-04-19T18:00:00-03:00");
const EVENTO_FIM = new Date("2026-04-19T21:00:00-03:00");

// ⚡ CONTROLE (manual + horário)
// null = automático | true = aberto | false = fechado
let eventoManual = null;
let ultimoStatus = null;

function getEventoStatus() {
  const agora = new Date();

  if (eventoManual === true) return "aberto";
  if (eventoManual === false) return "fechado";

  if (agora >= EVENTO_INICIO && agora <= EVENTO_FIM) return "aberto";
  return "fechado";
}

function eventoAtivo() {
  return getEventoStatus() === "aberto";
}

// 👥 PARTICIPANTES
const participantesAtuais = new Set();

// 📊 DB
const db = { users: {} };

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, pontos: 0 };
  }
  return db.users[id];
}

function getDataHoje() {
  return new Date().toLocaleDateString("pt-BR");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

let painelMsgId = null;

async function atualizarPainel() {
  try {
    const canal = await client.channels.fetch(CANAL_PAINEL_ID);

    const status = getEventoStatus();

    const ranking = Object.entries(db.users)
      .sort((a, b) => b[1].pontos - a[1].pontos)
      .slice(0, 3);

    let topText = "";
    ranking.forEach(([id, data], i) => {
      topText += `\n${i + 1}. <@${id}> — ${data.pontos} pts`;
    });

    const embed = new EmbedBuilder()
      .setColor(status === "aberto" ? "#00ff00" : "#ff0000")
      .setTitle("📢 EVENTO HOSPITAL BELLA")
      .setDescription(
`<@&${CARGO_PING}>

🚨 EVENTO DO DIA

📅 19/04/2026  
⏰ 18:00 ATÉ 21:00

━━━━━━━━━━━━━━━━━━━

📅 HOJE: ${getDataHoje()}

${status === "aberto" ? "🟢 EVENTO ABERTO" : "🔴 EVENTO FECHADO"}

👥 PARTICIPANTES: ${participantesAtuais.size}

━━━━━━━━━━━━━━━━━━━

🏥 ATENDIMENTOS
📞 CHAMADOS

━━━━━━━━━━━━━━━━━━━

🏆 PREMIAÇÃO
🥇 100.000$  
🥈 60.000$  
🥉 30.000$

━━━━━━━━━━━━━━━━━━━

🥇 TOP 3:${topText}`
      );

    if (painelMsgId) {
      const msg = await canal.messages.fetch(painelMsgId);
      await msg.edit({ embeds: [embed] });
    } else {
      const msg = await canal.send({ embeds: [embed] });
      painelMsgId = msg.id;
    }

  } catch {}
}

// ⏰ AUTO SISTEMA (horário + mudança de status)
setInterval(async () => {
  const statusAtual = getEventoStatus();

  // atualiza painel quando muda status
  if (statusAtual !== ultimoStatus) {
    ultimoStatus = statusAtual;
    await atualizarPainel();
  }

}, 60000);

// 🏆 FINALIZA EVENTO
async function finalizarEvento() {
  const guild = client.guilds.cache.first();
  if (!guild) return;

  const ranking = Object.entries(db.users)
    .sort((a, b) => b[1].pontos - a[1].pontos)
    .slice(0, 3);

  const cargos = [CARGO_1, CARGO_2, CARGO_3];

  for (let i = 0; i < ranking.length; i++) {
    try {
      const member = await guild.members.fetch(ranking[i][0]);
      await member.roles.add(cargos[i]);
    } catch {}
  }
}

// 🚀 COMANDOS
const commands = [
  new SlashCommandBuilder().setName("abrirevento").setDescription("Abrir evento manual"),
  new SlashCommandBuilder().setName("fecharevento").setDescription("Fechar evento manual")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log(`✅ Online: ${client.user.tag}`);

  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

  setTimeout(() => atualizarPainel(), 3000);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.guild) return;

  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (!interaction.isChatInputCommand()) return;

  if (!member.roles.cache.has(CARGO_ADMIN_ID)) {
    return interaction.reply({ content: "🚫 STAFF apenas", ephemeral: true });
  }

  if (interaction.commandName === "abrirevento") {
    eventoManual = true;
    await atualizarPainel();
    return interaction.reply({ content: "🟢 Evento aberto (manual + horário ativo)", ephemeral: true });
  }

  if (interaction.commandName === "fecharevento") {
    eventoManual = false;
    await atualizarPainel();
    return interaction.reply({ content: "🔴 Evento fechado (manual)", ephemeral: true });
  }
});

client.login(TOKEN);
