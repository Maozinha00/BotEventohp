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

// CONFIG
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ TOKEN ou CLIENT_ID não configurados");
  process.exit(1);
}

// CARGOS
const CARGO_ADMIN_ID = "1490431614055088128";
const CARGO_SERVICO_ID = "1492553421973356795";
const CARGO_PING = "1477683902079303932";

// CANAIS
const CANAL_PAINEL_ID = "1477683908026961940";
const CANAL_LOGS_ID = "1495370353193521182";

// EVENTO
let EVENTO_INICIO = new Date("2026-04-24T18:00:00-03:00").getTime();
let EVENTO_FIM = new Date("2026-04-24T21:00:00-03:00").getTime();

// DB
const db = { users: {} };
const participantes = new Set();
const cooldown = new Map();

// FUNÇÕES
function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, pontos: 0 };
  }
  return db.users[id];
}

function eventoAtivo() {
  const now = Date.now();
  return now >= EVENTO_INICIO && now <= EVENTO_FIM;
}

// BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// EMBED
function painel() {
  const ativo = eventoAtivo();

  return new EmbedBuilder()
    .setColor(ativo ? "#00ff00" : "#ff0000")
    .setTitle("🏥 HOSPITAL BELLA — EVENTO OFICIAL")
    .setDescription(
`<@&${CARGO_PING}>

📅 24/04/2026  
⏰ 18:00 às 21:00  

━━━━━━━━━━━━━━━━━━

${ativo ? "🟢 EVENTO ABERTO" : "🔴 EVENTO FECHADO"}

👥 Participantes: ${participantes.size}

━━━━━━━━━━━━━━━━━━

🏆 PREMIAÇÃO
🥇 100.000$
🥈 60.000$
🥉 30.000$`
    );
}

// BOTÕES
function buttons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("atendimento")
      .setLabel("🏥 Atendimento (+1)")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("chamado")
      .setLabel("📞 Chamado (+2)")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ranking")
      .setLabel("🏆 Ranking")
      .setStyle(ButtonStyle.Secondary)
  );
}

// LOG
async function log(user, tipo) {
  try {
    const canal = await client.channels.fetch(CANAL_LOGS_ID);
    canal.send(`👤 <@${user}> fez **${tipo}** às ${new Date().toLocaleTimeString("pt-BR")}`);
  } catch {}
}

// PAINEL
let painelMsg = null;

async function atualizarPainel() {
  const canal = await client.channels.fetch(CANAL_PAINEL_ID);
  if (!canal) return;

  const embed = painel();

  if (painelMsg) {
    const msg = await canal.messages.fetch(painelMsg);
    await msg.edit({ embeds: [embed], components: [buttons()] });
  } else {
    const msg = await canal.send({ embeds: [embed], components: [buttons()] });
    painelMsg = msg.id;
  }
}

// LOOP
setInterval(atualizarPainel, 5000);

// COMANDOS
const commands = [
  new SlashCommandBuilder().setName("abrirevento").setDescription("Abrir evento"),
  new SlashCommandBuilder().setName("fecharevento").setDescription("Fechar evento")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

// READY
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} online`);

  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commands
  });

  atualizarPainel();
});

// INTERAÇÃO
client.on("interactionCreate", async (i) => {
  if (!i.guild) return;

  const member = await i.guild.members.fetch(i.user.id);

  // BOTÕES
  if (i.isButton()) {

    // COOLDOWN 5s
    if (cooldown.has(i.user.id)) {
      const tempo = cooldown.get(i.user.id);
      if (Date.now() < tempo) {
        return i.reply({ content: "⏳ Aguarde 5 segundos...", ephemeral: true });
      }
    }

    cooldown.set(i.user.id, Date.now() + 5000);

    if (!eventoAtivo())
      return i.reply({ content: "⛔ Evento fechado", ephemeral: true });

    if (!member.roles.cache.has(CARGO_SERVICO_ID))
      return i.reply({ content: "🚫 Sem cargo de serviço", ephemeral: true });

    const user = getUser(i.user.id);
    participantes.add(i.user.id);

    if (i.customId === "atendimento") {
      user.atendimentos++;
      user.pontos += 1;
      await log(i.user.id, "Atendimento");
      return i.reply({ content: "🏥 +1 ponto", ephemeral: true });
    }

    if (i.customId === "chamado") {
      user.chamados++;
      user.pontos += 2;
      await log(i.user.id, "Chamado");
      return i.reply({ content: "📞 +2 pontos", ephemeral: true });
    }

    if (i.customId === "ranking") {
      const ranking = Object.entries(db.users)
        .sort((a, b) => b[1].pontos - a[1].pontos)
        .slice(0, 3);

      let msg = "🏆 TOP 3\n\n";
      ranking.forEach(([id, d], i) => {
        msg += `${i + 1}. <@${id}> — ${d.pontos} pts\n`;
      });

      return i.reply({ content: msg || "Sem dados", ephemeral: true });
    }
  }

  // COMANDOS
  if (i.isChatInputCommand()) {

    if (!member.roles.cache.has(CARGO_ADMIN_ID))
      return i.reply({ content: "🚫 Apenas STAFF", ephemeral: true });

    if (i.commandName === "abrirevento") {
      EVENTO_INICIO = Date.now() - 1000;
      return i.reply({ content: "🟢 Evento aberto", ephemeral: true });
    }

    if (i.commandName === "fecharevento") {
      EVENTO_FIM = Date.now() - 1000;
      return i.reply({ content: "🔴 Evento fechado", ephemeral: true });
    }
  }
});

client.login(TOKEN);
